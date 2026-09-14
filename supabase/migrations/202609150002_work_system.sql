-- Apply once after 01_initial_setup.sql. Does not reset existing data.
begin;
create table public.admin_task_checklist (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id), task_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 500), completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(workspace_id,task_id) references public.admin_tasks(workspace_id,id)
);
create table public.admin_task_links (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),task_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 200),url text not null check(length(url)<=2048 and url ~ '^https?://[^[:space:]]+$'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,task_id) references public.admin_tasks(workspace_id,id)
);
create table public.admin_task_comments (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),task_id uuid not null,
 author_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,task_id) references public.admin_tasks(workspace_id,id)
);
do $$ declare tab text;begin
 foreach tab in array array['admin_task_checklist','admin_task_links','admin_task_comments'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using(public.admin_is_member(workspace_id))',tab);
  execute format('create index on public.%I(workspace_id,task_id)',tab);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.admin_touch_updated_at()',tab);
 end loop;
end $$;

insert into public.admin_task_checklist(workspace_id,task_id,label)
 select workspace_id,id,'Kết quả đáp ứng Definition of Done' from public.admin_tasks where deleted_at is null;

create function public.admin_work_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_work_version() from public;
grant execute on function public.admin_work_version() to authenticated;

create function public.admin_work_mutate(
 p_workspace uuid,p_task uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid(); member_roles text[]; founder boolean; t public.admin_tasks; old_t public.admin_tasks;
 target uuid; dep uuid; next_status text; reason text; role_ok boolean; seq integer; before_data jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select roles into member_roles from public.admin_memberships where workspace_id=p_workspace and user_id=actor and active;
 if member_roles is null or not member_roles && array['founder','ops','product_designer','brand_designer'] then raise exception 'HEN_FORBIDDEN';end if;
 founder := 'founder'=any(member_roles);
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 -- Serialize writes within this small workspace: WIP, codes and dependency checks stay atomic.
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 reason:=trim(coalesce(p_payload->>'reason',''));
 if p_operation='create' then
  if p_task is not null then raise exception 'HEN_INVALID_INPUT';end if;
  select coalesce(max(substring(code from '^HEN-([0-9]+)$')::integer),0)+1 into seq from public.admin_tasks where workspace_id=p_workspace;
  insert into public.admin_tasks(workspace_id,code,title,status,priority,effort,owner_id,approver_id,product_id,due_date,definition_of_done,workstream)
   values(p_workspace,'HEN-'||lpad(seq::text,greatest(3,length(seq::text)),'0'),trim(p_payload->>'title'),'backlog',p_payload->>'priority',(p_payload->>'effort')::integer,
   nullif(p_payload->>'owner_id','')::uuid,nullif(p_payload->>'approver_id','')::uuid,nullif(p_payload->>'product_id','')::uuid,nullif(p_payload->>'due_date','')::date,trim(coalesce(p_payload->>'definition_of_done','')),p_payload->>'workstream') returning * into t;
  target:=t.id;
  insert into public.admin_task_checklist(workspace_id,task_id,label) values(p_workspace,target,'Kết quả đáp ứng Definition of Done'),(p_workspace,target,'Output đã được approver kiểm tra');
 else
  select * into t from public.admin_tasks where workspace_id=p_workspace and id=p_task and deleted_at is null for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=t.id;old_t:=t;before_data:=to_jsonb(t);
  if p_expected is null or p_expected<>t.updated_at then raise exception 'HEN_CONFLICT';end if;
  role_ok:=founder or coalesce(t.owner_id=actor,false);
  if p_operation='comment_add' then role_ok:=true;end if;
  if p_operation='transition' and p_payload->>'status'='done' then role_ok:=founder or coalesce(t.approver_id=actor,false);end if;
  if not role_ok then raise exception 'HEN_FORBIDDEN';end if;
  if t.status='done' and p_operation not in ('transition','comment_add') then raise exception 'HEN_DONE_LOCKED';end if;
  case p_operation
   when 'update' then
    if not founder and (nullif(p_payload->>'owner_id','')::uuid is distinct from t.owner_id or nullif(p_payload->>'approver_id','')::uuid is distinct from t.approver_id) then raise exception 'HEN_ASSIGNMENT_FORBIDDEN';end if;
    update public.admin_tasks set title=trim(p_payload->>'title'),priority=p_payload->>'priority',effort=(p_payload->>'effort')::integer,
     owner_id=nullif(p_payload->>'owner_id','')::uuid,approver_id=nullif(p_payload->>'approver_id','')::uuid,product_id=nullif(p_payload->>'product_id','')::uuid,
     due_date=nullif(p_payload->>'due_date','')::date,definition_of_done=trim(coalesce(p_payload->>'definition_of_done','')),workstream=p_payload->>'workstream'
     where id=target returning * into t;
   when 'transition' then
    next_status:=p_payload->>'status';
    if next_status<>'backlog' and (t.owner_id is null or t.approver_id is null or t.due_date is null or t.effort is null or length(trim(t.definition_of_done))=0) then raise exception 'HEN_READY_REQUIRED';end if;
    if next_status='done' and t.status<>'review' then raise exception 'HEN_REVIEW_REQUIRED';end if;
    if next_status='blocked' and reason='' then raise exception 'HEN_BLOCK_REASON';end if;
    update public.admin_tasks set status=next_status,blocked_reason=case when next_status='blocked' then reason else null end where id=target returning * into t;
   when 'checklist_add' then
    insert into public.admin_task_checklist(workspace_id,task_id,label) values(p_workspace,target,trim(p_payload->>'label'));
   when 'checklist_toggle' then
    update public.admin_task_checklist set completed=(p_payload->>'completed')::boolean where workspace_id=p_workspace and task_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'link_add' then
    insert into public.admin_task_links(workspace_id,task_id,label,url) values(p_workspace,target,trim(p_payload->>'label'),p_payload->>'url');
   when 'link_remove' then
    delete from public.admin_task_links where workspace_id=p_workspace and task_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'dependency_add' then
    dep:=(p_payload->>'id')::uuid;
    if not exists(select 1 from public.admin_tasks where id=dep and workspace_id=p_workspace and deleted_at is null) then raise exception 'HEN_NOT_FOUND';end if;
    if dep=target or exists(with recursive chain(id) as (
      select depends_on_task_id from public.admin_task_dependencies where workspace_id=p_workspace and task_id=dep
      union select d.depends_on_task_id from public.admin_task_dependencies d join chain c on d.task_id=c.id where d.workspace_id=p_workspace
    ) select 1 from chain where id=target) then raise exception 'HEN_DEPENDENCY_CYCLE';end if;
    insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values(p_workspace,target,dep) on conflict do nothing;
   when 'dependency_remove' then
    delete from public.admin_task_dependencies where workspace_id=p_workspace and task_id=target and depends_on_task_id=(p_payload->>'id')::uuid;
   when 'comment_add' then
    insert into public.admin_task_comments(workspace_id,task_id,author_id,body) values(p_workspace,target,actor,trim(p_payload->>'body'));
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 if length(t.title)>200 or length(t.definition_of_done)>10000 or t.workstream not in ('Product','Dev','Brand','Operations') then raise exception 'HEN_INVALID_INPUT';end if;
 -- Foreign keys prevent cross-workspace assignments; also reject inactive/viewer-only assignees.
 if t.owner_id is not null and not exists(select 1 from public.admin_memberships where workspace_id=p_workspace and user_id=t.owner_id and active and roles && array['founder','ops','product_designer','brand_designer']) then raise exception 'HEN_INVALID_OWNER';end if;
 if t.approver_id is not null and not exists(select 1 from public.admin_memberships where workspace_id=p_workspace and user_id=t.approver_id and active and roles && array['founder','ops','product_designer','brand_designer']) then raise exception 'HEN_INVALID_APPROVER';end if;
 -- Comments never alter task readiness. Other edits must preserve invariants.
 if p_operation<>'comment_add' then
  if t.status='in_progress' and (p_operation='transition' and old_t.status is distinct from 'in_progress' or p_operation='update' and old_t.owner_id is distinct from t.owner_id) and (select count(*) from public.admin_tasks where workspace_id=p_workspace and owner_id=t.owner_id and status='in_progress' and deleted_at is null)>2 then
   if not founder or reason='' then raise exception 'HEN_WIP_LIMIT';end if;
  end if;
  if t.status in ('ready','in_progress') and exists(select 1 from public.admin_task_dependencies d join public.admin_tasks other on other.id=d.depends_on_task_id where d.workspace_id=p_workspace and d.task_id=target and other.priority='P0' and other.status<>'done') then raise exception 'HEN_DEPENDENCY_BLOCKED';end if;
  if t.status in ('review','done') and not exists(select 1 from public.admin_task_links where task_id=target) then raise exception 'HEN_OUTPUT_REQUIRED';end if;
  if t.status='done' and (not exists(select 1 from public.admin_task_checklist where task_id=target) or exists(select 1 from public.admin_task_checklist where task_id=target and not completed)) then raise exception 'HEN_CHECKLIST_REQUIRED';end if;
 end if;
 update public.admin_tasks set updated_at=clock_timestamp() where id=target returning * into t;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'work.'||p_operation,'task',target,before_data,jsonb_build_object('task',to_jsonb(t),'input',p_payload));
 return to_jsonb(t);
end $$;
revoke all on function public.admin_work_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_work_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
