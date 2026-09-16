-- Apply once after 202609190006_operations.sql. Does not reset existing data.
begin;
-- Người được mời trước khi có tài khoản: giữ sẵn vai trò, tự gắn vào workspace ở lần đăng nhập đầu.
create table public.admin_pending_members (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 email text not null check(length(trim(email)) between 3 and 200 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 display_name text not null check(length(trim(display_name)) between 1 and 100),
 roles text[] not null default '{viewer}' check(cardinality(roles)>0 and roles <@ array['founder','ops','product_designer','brand_designer','viewer']::text[]),
 capacity_percent integer not null default 100 check(capacity_percent between 0 and 100),
 invited_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(workspace_id,email)
);
create function public.admin_is_founder(target_workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_memberships where workspace_id=target_workspace and user_id=(select auth.uid()) and active and 'founder'=any(roles));
$$;
revoke all on function public.admin_is_founder(uuid) from public;
grant execute on function public.admin_is_founder(uuid) to authenticated;

alter table public.admin_pending_members enable row level security;
revoke all on public.admin_pending_members from anon,authenticated;
grant select on public.admin_pending_members to authenticated;
grant all on public.admin_pending_members to service_role;
-- Email của người chưa vào workspace chỉ Founder thấy.
create policy founder_read on public.admin_pending_members for select to authenticated using(public.admin_is_founder(workspace_id));
create trigger touch_updated_at before update on public.admin_pending_members for each row execute function public.admin_touch_updated_at();
create index on public.admin_pending_members(workspace_id);

create function public.admin_settings_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_settings_version() from public;
grant execute on function public.admin_settings_version() to authenticated;

create function public.admin_workspace_update(
 p_workspace uuid,p_expected timestamptz,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();ws public.admin_workspaces;before_data jsonb;begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 if not public.admin_is_founder(p_workspace) then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 select * into ws from public.admin_workspaces where id=p_workspace for update;
 if not found then raise exception 'HEN_NOT_FOUND';end if;
 before_data:=to_jsonb(ws);
 if p_expected is null or p_expected<>ws.updated_at then raise exception 'HEN_CONFLICT';end if;
 if length(trim(coalesce(p_payload->>'name','')))=0 then raise exception 'HEN_INVALID_INPUT';end if;
 update public.admin_workspaces set name=trim(p_payload->>'name'),start_date=(p_payload->>'start_date')::date,updated_at=clock_timestamp()
  where id=p_workspace returning * into ws;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'workspace.update','workspace',p_workspace,before_data,jsonb_build_object('workspace',to_jsonb(ws),'input',p_payload));
 return to_jsonb(ws);
end $$;
revoke all on function public.admin_workspace_update(uuid,timestamptz,jsonb) from public;
grant execute on function public.admin_workspace_update(uuid,timestamptz,jsonb) to authenticated;

create function public.admin_member_mutate(
 p_workspace uuid,p_target uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();target_email text;existing_user uuid;m public.admin_memberships;p public.admin_pending_members;
 new_roles text[];before_data jsonb;result jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 -- Phân quyền là thao tác nhạy cảm: chỉ Founder.
 if not public.admin_is_founder(p_workspace) then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,5));
 if p_payload ? 'roles' then
  select array_agg(distinct value) into new_roles from jsonb_array_elements_text(p_payload->'roles');
  if new_roles is null or cardinality(new_roles)=0 or not new_roles <@ array['founder','ops','product_designer','brand_designer','viewer']::text[] then raise exception 'HEN_INVALID_ROLES';end if;
 end if;
 case p_operation
  when 'invite' then
   target_email:=lower(trim(coalesce(p_payload->>'email','')));
   if target_email='' then raise exception 'HEN_INVALID_INPUT';end if;
   select id into existing_user from auth.users where lower(email)=target_email;
   if existing_user is not null then
    if exists(select 1 from public.admin_memberships where workspace_id=p_workspace and user_id=existing_user) then raise exception 'HEN_MEMBER_EXISTS';end if;
    insert into public.admin_memberships(workspace_id,user_id,display_name,roles,capacity_percent,active)
     values(p_workspace,existing_user,trim(p_payload->>'display_name'),new_roles,coalesce((p_payload->>'capacity_percent')::integer,100),true) returning * into m;
    result:=jsonb_build_object('mode','member','member',to_jsonb(m));
   else
    if exists(select 1 from public.admin_pending_members where workspace_id=p_workspace and email=target_email) then raise exception 'HEN_INVITE_EXISTS';end if;
    insert into public.admin_pending_members(workspace_id,email,display_name,roles,capacity_percent,invited_by)
     values(p_workspace,target_email,trim(p_payload->>'display_name'),new_roles,coalesce((p_payload->>'capacity_percent')::integer,100),actor) returning * into p;
    result:=jsonb_build_object('mode','pending','pending',to_jsonb(p));
   end if;
  when 'update' then
   select * into m from public.admin_memberships where workspace_id=p_workspace and user_id=p_target for update;
   if not found then raise exception 'HEN_NOT_FOUND';end if;
   before_data:=to_jsonb(m);
   if p_expected is null or p_expected<>m.updated_at then raise exception 'HEN_CONFLICT';end if;
   update public.admin_memberships set display_name=trim(p_payload->>'display_name'),roles=coalesce(new_roles,m.roles),
    capacity_percent=coalesce((p_payload->>'capacity_percent')::integer,m.capacity_percent),
    active=coalesce((p_payload->>'active')::boolean,m.active) where workspace_id=p_workspace and user_id=p_target returning * into m;
   result:=jsonb_build_object('mode','member','member',to_jsonb(m));
  when 'pending_update' then
   select * into p from public.admin_pending_members where workspace_id=p_workspace and id=p_target for update;
   if not found then raise exception 'HEN_NOT_FOUND';end if;
   before_data:=to_jsonb(p);
   if p_expected is null or p_expected<>p.updated_at then raise exception 'HEN_CONFLICT';end if;
   update public.admin_pending_members set display_name=trim(p_payload->>'display_name'),roles=coalesce(new_roles,p.roles),
    capacity_percent=coalesce((p_payload->>'capacity_percent')::integer,p.capacity_percent) where id=p_target returning * into p;
   result:=jsonb_build_object('mode','pending','pending',to_jsonb(p));
  when 'pending_remove' then
   delete from public.admin_pending_members where workspace_id=p_workspace and id=p_target returning * into p;
   if not found then raise exception 'HEN_NOT_FOUND';end if;
   before_data:=to_jsonb(p);
   result:=jsonb_build_object('mode','pending_removed','id',p_target);
  else raise exception 'HEN_INVALID_OPERATION';
 end case;
 -- Không cho phép workspace mất hết Founder đang hoạt động.
 if not exists(select 1 from public.admin_memberships where workspace_id=p_workspace and active and 'founder'=any(roles)) then raise exception 'HEN_LAST_FOUNDER';end if;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'member.'||p_operation,'member',p_target,before_data,jsonb_build_object('result',result,'input',p_payload-'email'));
 return result;
end $$;
revoke all on function public.admin_member_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_member_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;

-- Người đã được mời trước: lần đăng nhập đầu tự nhận vai trò đã gán, không cần Founder thao tác lại.
create function public.admin_claim_membership() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();actor_email text;p public.admin_pending_members;m public.admin_memberships;begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select * into m from public.admin_memberships where user_id=actor and active limit 1;
 if found then return jsonb_build_object('mode','existing','member',to_jsonb(m));end if;
 select lower(email) into actor_email from auth.users where id=actor;
 if actor_email is null then return jsonb_build_object('mode','none');end if;
 select * into p from public.admin_pending_members where email=actor_email order by created_at limit 1;
 if not found then return jsonb_build_object('mode','none');end if;
 insert into public.admin_memberships(workspace_id,user_id,display_name,roles,capacity_percent,active)
  values(p.workspace_id,actor,p.display_name,p.roles,p.capacity_percent,true)
  on conflict(workspace_id,user_id) do update set active=true,roles=excluded.roles,display_name=excluded.display_name returning * into m;
 delete from public.admin_pending_members where id=p.id;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p.workspace_id,actor,'member.claim','member',actor,to_jsonb(p),jsonb_build_object('member',to_jsonb(m)));
 return jsonb_build_object('mode','claimed','member',to_jsonb(m));
end $$;
revoke all on function public.admin_claim_membership() from public;
grant execute on function public.admin_claim_membership() to authenticated;
notify pgrst,'reload schema';
commit;
