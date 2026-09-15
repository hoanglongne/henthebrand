-- Apply once after 202609170004_campaigns.sql. Does not reset existing data.
begin;
create table public.admin_content_items (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 title text not null check(length(trim(title)) between 1 and 200),
 hook text not null default '' check(length(hook)<=2000),
 format text not null check(format in ('Video ngắn','Carousel','Reaction','Behind the scenes','Story')),
 channel text not null check(channel in ('TikTok','Instagram','Facebook','Landing')),
 status text not null default 'Idea' check(status in ('Idea','Script','Design/Edit','Review','Scheduled','Published','Learned')),
 owner_id uuid,campaign_id uuid,
 publish_date date,
 asset_url text check(asset_url is null or (length(asset_url)<=2048 and asset_url ~ '^https?://[^[:space:]]+$')),
 learning text not null default '' check(length(learning)<=5000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,owner_id) references public.admin_memberships(workspace_id,user_id),
 foreign key(workspace_id,campaign_id) references public.admin_campaigns(workspace_id,id),
 check(status not in ('Scheduled','Published','Learned') or (publish_date is not null and asset_url is not null))
);
alter table public.admin_content_items enable row level security;
revoke all on public.admin_content_items from anon,authenticated;
grant select on public.admin_content_items to authenticated;
grant all on public.admin_content_items to service_role;
create policy workspace_read on public.admin_content_items for select to authenticated using(public.admin_is_member(workspace_id));
create trigger touch_updated_at before update on public.admin_content_items for each row execute function public.admin_touch_updated_at();
create index on public.admin_content_items(workspace_id,status);
create index on public.admin_content_items(workspace_id,campaign_id);

create function public.admin_content_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_content_version() from public;
grant execute on function public.admin_content_version() to authenticated;

create function public.admin_content_mutate(
 p_workspace uuid,p_content uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();member_roles text[];item public.admin_content_items;target uuid;before_data jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select roles into member_roles from public.admin_memberships where workspace_id=p_workspace and user_id=actor and active;
 if member_roles is null or not member_roles && array['founder','ops','brand_designer'] then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 if p_operation='create' then
  if p_content is not null then raise exception 'HEN_INVALID_INPUT';end if;
  insert into public.admin_content_items(workspace_id,title,hook,format,channel,status,owner_id,campaign_id,publish_date,asset_url,learning)
   values(p_workspace,trim(p_payload->>'title'),trim(coalesce(p_payload->>'hook','')),p_payload->>'format',p_payload->>'channel',
   coalesce(p_payload->>'status','Idea'),nullif(p_payload->>'owner_id','')::uuid,nullif(p_payload->>'campaign_id','')::uuid,
   nullif(p_payload->>'publish_date','')::date,nullif(p_payload->>'asset_url',''),trim(coalesce(p_payload->>'learning',''))) returning * into item;
  target:=item.id;
 elsif p_operation='update' then
  select * into item from public.admin_content_items where workspace_id=p_workspace and id=p_content for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=item.id;before_data:=to_jsonb(item);
  if p_expected is null or p_expected<>item.updated_at then raise exception 'HEN_CONFLICT';end if;
  update public.admin_content_items set title=trim(p_payload->>'title'),hook=trim(coalesce(p_payload->>'hook','')),
   format=p_payload->>'format',channel=p_payload->>'channel',status=coalesce(p_payload->>'status','Idea'),
   owner_id=nullif(p_payload->>'owner_id','')::uuid,campaign_id=nullif(p_payload->>'campaign_id','')::uuid,
   publish_date=nullif(p_payload->>'publish_date','')::date,asset_url=nullif(p_payload->>'asset_url',''),
   learning=trim(coalesce(p_payload->>'learning','')) where id=target returning * into item;
 else raise exception 'HEN_INVALID_OPERATION';
 end if;
 update public.admin_content_items set updated_at=clock_timestamp() where id=target returning * into item;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'content.'||p_operation,'content_item',target,before_data,jsonb_build_object('content',to_jsonb(item),'input',p_payload));
 return to_jsonb(item);
end $$;
revoke all on function public.admin_content_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_content_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
