-- Apply once after 202609150002_work_system.sql. Does not reset existing data.
begin;
alter table public.admin_milestones add constraint admin_milestones_end_week_max check(end_week<=24);

create table public.admin_product_evidence (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),product_id uuid not null,
 kind text not null check(kind in ('Phỏng vấn','Prototype','Usability test','Tài liệu thiết kế','Ghi chú vận hành')),
 title text not null check(length(trim(title)) between 1 and 200),summary text not null check(length(trim(summary)) between 1 and 5000),
 source_url text check(source_url is null or (length(source_url)<=2048 and source_url ~ '^https?://[^[:space:]]+$')),
 observed_at date not null,created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id)
);
create table public.admin_product_stage_changes (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),product_id uuid not null,
 from_stage text not null,to_stage text not null,note text not null check(length(trim(note)) between 1 and 2000),
 changed_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id)
);
do $$ declare tab text;begin
 foreach tab in array array['admin_product_evidence','admin_product_stage_changes'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using(public.admin_is_member(workspace_id))',tab);
  execute format('create index on public.%I(workspace_id,product_id)',tab);
 end loop;
end $$;
create trigger touch_updated_at before update on public.admin_product_evidence for each row execute function public.admin_touch_updated_at();

create function public.admin_catalog_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_catalog_version() from public;
grant execute on function public.admin_catalog_version() to authenticated;

create function public.admin_product_mutate(
 p_workspace uuid,p_product uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();member_roles text[];founder boolean;pr public.admin_products;target uuid;
 next_stage text;note text;base_slug text;new_slug text;before_data jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select roles into member_roles from public.admin_memberships where workspace_id=p_workspace and user_id=actor and active;
 if member_roles is null or not member_roles && array['founder','ops','product_designer','brand_designer'] then raise exception 'HEN_FORBIDDEN';end if;
 founder := 'founder'=any(member_roles);
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 -- Serialize writes within this small workspace: stage/slug uniqueness checks stay atomic.
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,1));
 if p_operation='create' then
  if p_product is not null then raise exception 'HEN_INVALID_INPUT';end if;
  base_slug:=trim(both '-' from regexp_replace(lower(trim(p_payload->>'name')),'[^a-z0-9]+','-','g'));
  if base_slug='' then base_slug:='san-pham';end if;
  new_slug:=base_slug;
  if exists(select 1 from public.admin_products where workspace_id=p_workspace and slug=new_slug) then
   new_slug:=base_slug||'-'||substr(md5(random()::text),1,4);
  end if;
  insert into public.admin_products(workspace_id,name,slug,moment,audience,promise)
   values(p_workspace,trim(p_payload->>'name'),new_slug,trim(coalesce(p_payload->>'moment','')),trim(coalesce(p_payload->>'audience','')),trim(coalesce(p_payload->>'promise',''))) returning * into pr;
  target:=pr.id;
 else
  select * into pr from public.admin_products where workspace_id=p_workspace and id=p_product for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=pr.id;before_data:=to_jsonb(pr);
  if p_expected is null or p_expected<>pr.updated_at then raise exception 'HEN_CONFLICT';end if;
  case p_operation
   when 'update' then
    update public.admin_products set name=trim(p_payload->>'name'),moment=trim(coalesce(p_payload->>'moment','')),
     audience=trim(coalesce(p_payload->>'audience','')),promise=trim(coalesce(p_payload->>'promise','')) where id=target returning * into pr;
   when 'stage_change' then
    next_stage:=p_payload->>'stage';
    if next_stage is null or next_stage not in ('idea','discovery','design','ready_for_build','build','pilot','live','learned','archived') or next_stage=pr.stage then raise exception 'HEN_INVALID_STAGE';end if;
    note:=trim(coalesce(p_payload->>'note',''));
    if note='' then raise exception 'HEN_STAGE_REASON_REQUIRED';end if;
    if next_stage in ('pilot','live') and not coalesce((p_payload->>'readiness_confirmed')::boolean,false) then raise exception 'HEN_STAGE_READINESS_REQUIRED';end if;
    if next_stage in ('build','pilot','live','learned','archived') and not founder then raise exception 'HEN_STAGE_FORBIDDEN';end if;
    if next_stage='build' and exists(select 1 from public.admin_products where workspace_id=p_workspace and id<>target and stage='build') then raise exception 'HEN_STAGE_BUILD_LIMIT';end if;
    if next_stage in ('discovery','design') and exists(select 1 from public.admin_products where workspace_id=p_workspace and id<>target and stage in ('discovery','design')) then raise exception 'HEN_STAGE_DISCOVERY_LIMIT';end if;
    insert into public.admin_product_stage_changes(workspace_id,product_id,from_stage,to_stage,note,changed_by) values(p_workspace,target,pr.stage,next_stage,note,actor);
    update public.admin_products set stage=next_stage where id=target returning * into pr;
   when 'evidence_add' then
    insert into public.admin_product_evidence(workspace_id,product_id,kind,title,summary,source_url,observed_at,created_by)
     values(p_workspace,target,p_payload->>'kind',trim(p_payload->>'title'),trim(p_payload->>'summary'),nullif(p_payload->>'source_url',''),(p_payload->>'observed_at')::date,actor);
   when 'evidence_remove' then
    delete from public.admin_product_evidence where workspace_id=p_workspace and product_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 update public.admin_products set updated_at=clock_timestamp() where id=target returning * into pr;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'product.'||p_operation,'product',target,before_data,jsonb_build_object('product',to_jsonb(pr),'input',p_payload));
 return to_jsonb(pr);
end $$;
revoke all on function public.admin_product_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_product_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;

create function public.admin_milestone_mutate(
 p_workspace uuid,p_milestone uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();member_roles text[];m public.admin_milestones;target uuid;before_data jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select roles into member_roles from public.admin_memberships where workspace_id=p_workspace and user_id=actor and active;
 if member_roles is null or not member_roles && array['founder','ops'] then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,2));
 if p_operation='create' then
  if p_milestone is not null then raise exception 'HEN_INVALID_INPUT';end if;
  if exists(select 1 from public.admin_milestones where workspace_id=p_workspace and name=trim(p_payload->>'name')) then raise exception 'HEN_NAME_TAKEN';end if;
  insert into public.admin_milestones(workspace_id,name,description,start_week,end_week)
   values(p_workspace,trim(p_payload->>'name'),trim(coalesce(p_payload->>'description','')),(p_payload->>'start_week')::integer,(p_payload->>'end_week')::integer) returning * into m;
  target:=m.id;
 else
  select * into m from public.admin_milestones where workspace_id=p_workspace and id=p_milestone for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=m.id;before_data:=to_jsonb(m);
  if p_expected is null or p_expected<>m.updated_at then raise exception 'HEN_CONFLICT';end if;
  if p_operation='update' then
   if exists(select 1 from public.admin_milestones where workspace_id=p_workspace and id<>target and name=trim(p_payload->>'name')) then raise exception 'HEN_NAME_TAKEN';end if;
   update public.admin_milestones set name=trim(p_payload->>'name'),description=trim(coalesce(p_payload->>'description','')),
    start_week=(p_payload->>'start_week')::integer,end_week=(p_payload->>'end_week')::integer where id=target returning * into m;
  elsif p_operation='delete' then
   delete from public.admin_milestones where id=target;
   insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
   values(p_workspace,actor,'milestone.delete','milestone',target,before_data,null);
   return jsonb_build_object('deleted',true,'id',target);
  else raise exception 'HEN_INVALID_OPERATION';
  end if;
 end if;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'milestone.'||p_operation,'milestone',target,before_data,jsonb_build_object('milestone',to_jsonb(m),'input',p_payload));
 return to_jsonb(m);
end $$;
revoke all on function public.admin_milestone_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_milestone_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
