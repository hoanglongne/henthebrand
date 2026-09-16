-- Apply once after 202609210008_product_insights.sql. Does not reset existing data.
-- Mỗi sản phẩm và mỗi nội dung có chỗ làm việc riêng: người phụ trách, thảo luận,
-- câu hỏi mở, link làm việc, checklist sản xuất.
begin;
alter table public.admin_content_items add constraint admin_content_items_workspace_id_id_key unique(workspace_id,id);
alter table public.admin_products add column owner_id uuid;
alter table public.admin_products add constraint admin_products_owner_fkey
 foreign key(workspace_id,owner_id) references public.admin_memberships(workspace_id,user_id);

create table public.admin_product_comments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),product_id uuid not null,
 author_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id)
);
create table public.admin_product_questions (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),product_id uuid not null,
 question text not null check(length(trim(question)) between 1 and 500),
 answer text not null default '' check(length(answer)<=2000),
 answered_at timestamptz,answered_by uuid references auth.users(id),asked_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id),
 check(answered_at is null or length(trim(answer))>0)
);
create table public.admin_product_links (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),product_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 200),
 url text not null check(length(url)<=2048 and url ~ '^https?://[^[:space:]]+$'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id)
);
create table public.admin_content_checklist (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),content_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 300),
 completed boolean not null default false,completed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,content_id) references public.admin_content_items(workspace_id,id)
);
create table public.admin_content_comments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),content_id uuid not null,
 author_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,content_id) references public.admin_content_items(workspace_id,id)
);
do $$ declare tab text;begin
 foreach tab in array array['admin_product_comments','admin_product_questions','admin_product_links','admin_content_checklist','admin_content_comments'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using(public.admin_is_member(workspace_id))',tab);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.admin_touch_updated_at()',tab);
 end loop;
end $$;
create index on public.admin_product_comments(workspace_id,product_id);
create index on public.admin_product_questions(workspace_id,product_id);
create index on public.admin_product_links(workspace_id,product_id);
create index on public.admin_content_checklist(workspace_id,content_id);
create index on public.admin_content_comments(workspace_id,content_id);

-- Nội dung đã có từ trước cũng cần checklist để không bị trống.
insert into public.admin_content_checklist(workspace_id,content_id,label,completed)
select c.workspace_id,c.id,label,c.status in ('Scheduled','Published','Learned')
from public.admin_content_items c
cross join (values
 ('Chốt hook và thông điệp chính'),
 ('Chuẩn bị tư liệu (quay hoặc thiết kế)'),
 ('Hoàn thiện bản dựng và caption'),
 ('Người phụ trách duyệt lần cuối')) as t(label);

create function public.admin_item_workspace_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_item_workspace_version() from public;
grant execute on function public.admin_item_workspace_version() to authenticated;

create or replace function public.admin_product_mutate(
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
  insert into public.admin_products(workspace_id,name,slug,moment,audience,promise,owner_id,impact_score,effort_score,stage_since)
   values(p_workspace,trim(p_payload->>'name'),new_slug,trim(coalesce(p_payload->>'moment','')),trim(coalesce(p_payload->>'audience','')),
   trim(coalesce(p_payload->>'promise','')),nullif(p_payload->>'owner_id','')::uuid,
   nullif(p_payload->>'impact_score','')::smallint,nullif(p_payload->>'effort_score','')::smallint,clock_timestamp()) returning * into pr;
  target:=pr.id;
 else
  select * into pr from public.admin_products where workspace_id=p_workspace and id=p_product for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=pr.id;before_data:=to_jsonb(pr);
  if p_expected is null or p_expected<>pr.updated_at then raise exception 'HEN_CONFLICT';end if;
  case p_operation
   when 'update' then
    update public.admin_products set name=trim(p_payload->>'name'),moment=trim(coalesce(p_payload->>'moment','')),
     audience=trim(coalesce(p_payload->>'audience','')),promise=trim(coalesce(p_payload->>'promise','')),
     owner_id=nullif(p_payload->>'owner_id','')::uuid,
     impact_score=nullif(p_payload->>'impact_score','')::smallint,effort_score=nullif(p_payload->>'effort_score','')::smallint
     where id=target returning * into pr;
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
    update public.admin_products set stage=next_stage,stage_since=clock_timestamp() where id=target returning * into pr;
   when 'evidence_add' then
    insert into public.admin_product_evidence(workspace_id,product_id,kind,title,summary,source_url,observed_at,created_by)
     values(p_workspace,target,p_payload->>'kind',trim(p_payload->>'title'),trim(p_payload->>'summary'),nullif(p_payload->>'source_url',''),(p_payload->>'observed_at')::date,actor);
   when 'evidence_remove' then
    delete from public.admin_product_evidence where workspace_id=p_workspace and product_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'comment_add' then
    insert into public.admin_product_comments(workspace_id,product_id,author_id,body)
     values(p_workspace,target,actor,trim(p_payload->>'body'));
   when 'question_add' then
    insert into public.admin_product_questions(workspace_id,product_id,question,asked_by)
     values(p_workspace,target,trim(p_payload->>'question'),actor);
   when 'question_answer' then
    update public.admin_product_questions set answer=trim(coalesce(p_payload->>'answer','')),
     answered_at=case when length(trim(coalesce(p_payload->>'answer','')))>0 then clock_timestamp() else null end,
     answered_by=case when length(trim(coalesce(p_payload->>'answer','')))>0 then actor else null end
     where workspace_id=p_workspace and product_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'question_remove' then
    delete from public.admin_product_questions where workspace_id=p_workspace and product_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'link_add' then
    insert into public.admin_product_links(workspace_id,product_id,label,url)
     values(p_workspace,target,trim(p_payload->>'label'),p_payload->>'url');
   when 'link_remove' then
    delete from public.admin_product_links where workspace_id=p_workspace and product_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 -- Người phụ trách phải là thành viên đang hoạt động, có quyền làm việc.
 if pr.owner_id is not null and not exists(select 1 from public.admin_memberships
  where workspace_id=p_workspace and user_id=pr.owner_id and active
  and roles && array['founder','ops','product_designer','brand_designer']) then raise exception 'HEN_INVALID_OWNER';end if;
 update public.admin_products set updated_at=clock_timestamp() where id=target returning * into pr;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'product.'||p_operation,'product',target,before_data,jsonb_build_object('product',to_jsonb(pr),'input',p_payload));
 return to_jsonb(pr);
end $$;

create or replace function public.admin_content_mutate(
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
  insert into public.admin_content_checklist(workspace_id,content_id,label) values
   (p_workspace,target,'Chốt hook và thông điệp chính'),
   (p_workspace,target,'Chuẩn bị tư liệu (quay hoặc thiết kế)'),
   (p_workspace,target,'Hoàn thiện bản dựng và caption'),
   (p_workspace,target,'Người phụ trách duyệt lần cuối');
 else
  select * into item from public.admin_content_items where workspace_id=p_workspace and id=p_content for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=item.id;before_data:=to_jsonb(item);
  if p_expected is null or p_expected<>item.updated_at then raise exception 'HEN_CONFLICT';end if;
  case p_operation
   when 'update' then
    update public.admin_content_items set title=trim(p_payload->>'title'),hook=trim(coalesce(p_payload->>'hook','')),
     format=p_payload->>'format',channel=p_payload->>'channel',status=coalesce(p_payload->>'status','Idea'),
     owner_id=nullif(p_payload->>'owner_id','')::uuid,campaign_id=nullif(p_payload->>'campaign_id','')::uuid,
     publish_date=nullif(p_payload->>'publish_date','')::date,asset_url=nullif(p_payload->>'asset_url',''),
     learning=trim(coalesce(p_payload->>'learning','')) where id=target returning * into item;
   when 'checklist_add' then
    insert into public.admin_content_checklist(workspace_id,content_id,label)
     values(p_workspace,target,trim(p_payload->>'label'));
   when 'checklist_toggle' then
    update public.admin_content_checklist set completed=(p_payload->>'completed')::boolean,
     completed_at=case when (p_payload->>'completed')::boolean then clock_timestamp() else null end
     where workspace_id=p_workspace and content_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'checklist_remove' then
    delete from public.admin_content_checklist where workspace_id=p_workspace and content_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'comment_add' then
    insert into public.admin_content_comments(workspace_id,content_id,author_id,body)
     values(p_workspace,target,actor,trim(p_payload->>'body'));
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 update public.admin_content_items set updated_at=clock_timestamp() where id=target returning * into item;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'content.'||p_operation,'content_item',target,before_data,jsonb_build_object('content',to_jsonb(item),'input',p_payload));
 return to_jsonb(item);
end $$;
notify pgrst,'reload schema';
commit;
