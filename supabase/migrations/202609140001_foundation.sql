-- Sprint 0: private, read-only application foundation.
-- Business writes will be exposed through validated RPCs in Sprint 1+.
create table public.admin_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 timezone text not null default 'Asia/Ho_Chi_Minh', start_date date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.admin_memberships (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 user_id uuid not null references auth.users(id) on delete cascade, display_name text not null,
 roles text[] not null default '{viewer}', capacity_percent integer not null default 100 check(capacity_percent between 0 and 100),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,user_id), check(cardinality(roles)>0 and roles <@ array['founder','ops','product_designer','brand_designer','viewer']::text[])
);
create table public.admin_products (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 name text not null, slug text not null, moment text not null default '', audience text not null default '', promise text not null default '',
 stage text not null default 'idea' check(stage in ('idea','discovery','design','ready_for_build','build','pilot','live','learned','archived')),
 sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,slug), unique(workspace_id,id)
);
create unique index admin_one_build_per_workspace on public.admin_products(workspace_id) where stage='build';
create table public.admin_milestones (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 name text not null, description text not null default '', start_week integer not null check(start_week>=1), end_week integer not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_week>=start_week), unique(workspace_id,name)
);
create table public.admin_tasks (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 code text not null, title text not null check(length(trim(title))>0), description text not null default '',
 product_id uuid, owner_id uuid, approver_id uuid,
 status text not null default 'backlog' check(status in ('backlog','ready','in_progress','review','blocked','done')),
 priority text not null default 'P2' check(priority in ('P0','P1','P2','P3')), effort integer check(effort in (1,2,3,5,8,13)),
 workstream text not null default 'Product', start_date date, due_date date, definition_of_done text not null default '',
 blocked_reason text, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,code),unique(workspace_id,id),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id),
 foreign key(workspace_id,owner_id) references public.admin_memberships(workspace_id,user_id),
 foreign key(workspace_id,approver_id) references public.admin_memberships(workspace_id,user_id),
 check(status='backlog' or (owner_id is not null and approver_id is not null and due_date is not null and effort is not null and length(trim(definition_of_done))>0))
);
create table public.admin_task_dependencies (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 task_id uuid not null, depends_on_task_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(workspace_id,task_id) references public.admin_tasks(workspace_id,id),
 foreign key(workspace_id,depends_on_task_id) references public.admin_tasks(workspace_id,id),
 check(task_id<>depends_on_task_id),unique(task_id,depends_on_task_id)
);
create table public.admin_activity_log (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.admin_workspaces(id),
 actor_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id uuid,
 before_json jsonb, after_json jsonb, created_at timestamptz not null default now()
);
create index admin_tasks_status on public.admin_tasks(workspace_id,status);
create index admin_tasks_due on public.admin_tasks(workspace_id,due_date);
create index admin_tasks_product on public.admin_tasks(workspace_id,product_id);
create index admin_tasks_owner on public.admin_tasks(workspace_id,owner_id);
create index admin_activity_recent on public.admin_activity_log(workspace_id,created_at desc);
-- Definer avoids recursive membership policies; fixed search_path prevents shadowing.
create function public.admin_is_member(target_workspace uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_memberships where workspace_id=target_workspace and user_id=(select auth.uid()) and active);
$$;
revoke all on function public.admin_is_member(uuid) from public;
grant execute on function public.admin_is_member(uuid) to authenticated;
create function public.admin_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$begin new.updated_at=clock_timestamp();return new;end;$$;
revoke all on function public.admin_touch_updated_at() from public;
do $$ declare tab text; begin
 foreach tab in array array['admin_workspaces','admin_memberships','admin_products','admin_milestones','admin_tasks','admin_task_dependencies','admin_activity_log'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on table public.%I from anon, authenticated',tab);
  execute format('grant select on table public.%I to authenticated',tab);
  execute format('grant all on table public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using (public.admin_is_member(%I))',tab,case when tab='admin_workspaces' then 'id' else 'workspace_id' end);
  if tab<>'admin_activity_log' then
   execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.admin_touch_updated_at()',tab);
  end if;
 end loop;
end $$;
