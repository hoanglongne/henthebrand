-- Apply once after 202609180005_content.sql. Does not reset existing data.
begin;
create table public.admin_stock_items (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 name text not null check(length(trim(name)) between 1 and 200),code text not null check(length(trim(code)) between 1 and 50),
 category text not null check(category in ('Thành phẩm','Bao bì','Phụ kiện')),
 on_hand integer not null default 0 check(on_hand>=0),reserved integer not null default 0 check(reserved>=0),
 buffer integer not null default 0 check(buffer>=0),reorder integer not null default 0 check(reorder>=0),
 cost bigint not null default 0 check(cost>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(workspace_id,code),check(reserved<=on_hand)
);
create table public.admin_vendors (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 name text not null check(length(trim(name)) between 1 and 200),category text not null check(length(trim(category)) between 1 and 100),
 contact text not null check(length(trim(contact)) between 1 and 300),
 lead_time_days integer not null default 7 check(lead_time_days>=0),moq integer not null default 50 check(moq>=1),
 sample_status text not null default 'Chưa đặt mẫu' check(sample_status in ('Chưa đặt mẫu','Đang chờ mẫu','Cần chỉnh mẫu','Đã duyệt mẫu')),
 note text not null default '' check(length(note)<=2000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.admin_order_issues (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 title text not null check(length(trim(title)) between 1 and 200),external_ref text not null check(length(trim(external_ref)) between 1 and 100),
 severity text not null default 'Trung bình' check(severity in ('Thấp','Trung bình','Cao')),
 status text not null default 'Mới ghi nhận' check(status in ('Mới ghi nhận','Đang xử lý','Đã xử lý')),
 owner_id uuid,resolution text not null default '' check(length(resolution)<=3000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,owner_id) references public.admin_memberships(workspace_id,user_id),
 check(status<>'Đã xử lý' or length(trim(resolution))>0)
);
do $$ declare tab text;begin
 foreach tab in array array['admin_stock_items','admin_vendors','admin_order_issues'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using(public.admin_is_member(workspace_id))',tab);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.admin_touch_updated_at()',tab);
  execute format('create index on public.%I(workspace_id)',tab);
 end loop;
end $$;

create function public.admin_operations_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_operations_version() from public;
grant execute on function public.admin_operations_version() to authenticated;

create function public.admin_ops_role_ok(p_workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_memberships where workspace_id=p_workspace and user_id=(select auth.uid()) and active and roles && array['founder','ops']);
$$;
revoke all on function public.admin_ops_role_ok(uuid) from public;
grant execute on function public.admin_ops_role_ok(uuid) to authenticated;

create function public.admin_stock_mutate(
 p_workspace uuid,p_stock uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();item public.admin_stock_items;target uuid;before_data jsonb;begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 if not public.admin_ops_role_ok(p_workspace) then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 if p_operation='create' then
  if p_stock is not null then raise exception 'HEN_INVALID_INPUT';end if;
  insert into public.admin_stock_items(workspace_id,name,code,category,on_hand,reserved,buffer,reorder,cost)
   values(p_workspace,trim(p_payload->>'name'),trim(p_payload->>'code'),p_payload->>'category',
   coalesce((p_payload->>'on_hand')::integer,0),coalesce((p_payload->>'reserved')::integer,0),
   coalesce((p_payload->>'buffer')::integer,0),coalesce((p_payload->>'reorder')::integer,0),coalesce((p_payload->>'cost')::bigint,0)) returning * into item;
  target:=item.id;
 elsif p_operation='update' then
  select * into item from public.admin_stock_items where workspace_id=p_workspace and id=p_stock for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=item.id;before_data:=to_jsonb(item);
  if p_expected is null or p_expected<>item.updated_at then raise exception 'HEN_CONFLICT';end if;
  update public.admin_stock_items set name=trim(p_payload->>'name'),code=trim(p_payload->>'code'),category=p_payload->>'category',
   on_hand=coalesce((p_payload->>'on_hand')::integer,0),reserved=coalesce((p_payload->>'reserved')::integer,0),
   buffer=coalesce((p_payload->>'buffer')::integer,0),reorder=coalesce((p_payload->>'reorder')::integer,0),
   cost=coalesce((p_payload->>'cost')::bigint,0) where id=target returning * into item;
 else raise exception 'HEN_INVALID_OPERATION';
 end if;
 update public.admin_stock_items set updated_at=clock_timestamp() where id=target returning * into item;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'stock.'||p_operation,'stock_item',target,before_data,jsonb_build_object('stock',to_jsonb(item),'input',p_payload));
 return to_jsonb(item);
end $$;
revoke all on function public.admin_stock_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_stock_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;

create function public.admin_vendor_mutate(
 p_workspace uuid,p_vendor uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();item public.admin_vendors;target uuid;before_data jsonb;begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 if not public.admin_ops_role_ok(p_workspace) then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 if p_operation='create' then
  if p_vendor is not null then raise exception 'HEN_INVALID_INPUT';end if;
  insert into public.admin_vendors(workspace_id,name,category,contact,lead_time_days,moq,sample_status,note)
   values(p_workspace,trim(p_payload->>'name'),trim(p_payload->>'category'),trim(p_payload->>'contact'),
   coalesce((p_payload->>'lead_time_days')::integer,7),coalesce((p_payload->>'moq')::integer,50),
   coalesce(p_payload->>'sample_status','Chưa đặt mẫu'),trim(coalesce(p_payload->>'note',''))) returning * into item;
  target:=item.id;
 elsif p_operation='update' then
  select * into item from public.admin_vendors where workspace_id=p_workspace and id=p_vendor for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=item.id;before_data:=to_jsonb(item);
  if p_expected is null or p_expected<>item.updated_at then raise exception 'HEN_CONFLICT';end if;
  update public.admin_vendors set name=trim(p_payload->>'name'),category=trim(p_payload->>'category'),contact=trim(p_payload->>'contact'),
   lead_time_days=coalesce((p_payload->>'lead_time_days')::integer,7),moq=coalesce((p_payload->>'moq')::integer,50),
   sample_status=coalesce(p_payload->>'sample_status','Chưa đặt mẫu'),note=trim(coalesce(p_payload->>'note','')) where id=target returning * into item;
 else raise exception 'HEN_INVALID_OPERATION';
 end if;
 update public.admin_vendors set updated_at=clock_timestamp() where id=target returning * into item;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'vendor.'||p_operation,'vendor',target,before_data,jsonb_build_object('vendor',to_jsonb(item),'input',p_payload));
 return to_jsonb(item);
end $$;
revoke all on function public.admin_vendor_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_vendor_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;

create function public.admin_issue_mutate(
 p_workspace uuid,p_issue uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();item public.admin_order_issues;target uuid;before_data jsonb;begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 if not public.admin_ops_role_ok(p_workspace) then raise exception 'HEN_FORBIDDEN';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 if p_operation='create' then
  if p_issue is not null then raise exception 'HEN_INVALID_INPUT';end if;
  insert into public.admin_order_issues(workspace_id,title,external_ref,severity,status,owner_id,resolution)
   values(p_workspace,trim(p_payload->>'title'),trim(p_payload->>'external_ref'),coalesce(p_payload->>'severity','Trung bình'),
   coalesce(p_payload->>'status','Mới ghi nhận'),nullif(p_payload->>'owner_id','')::uuid,trim(coalesce(p_payload->>'resolution',''))) returning * into item;
  target:=item.id;
 elsif p_operation='update' then
  select * into item from public.admin_order_issues where workspace_id=p_workspace and id=p_issue for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=item.id;before_data:=to_jsonb(item);
  if p_expected is null or p_expected<>item.updated_at then raise exception 'HEN_CONFLICT';end if;
  update public.admin_order_issues set title=trim(p_payload->>'title'),external_ref=trim(p_payload->>'external_ref'),
   severity=coalesce(p_payload->>'severity','Trung bình'),status=coalesce(p_payload->>'status','Mới ghi nhận'),
   owner_id=nullif(p_payload->>'owner_id','')::uuid,resolution=trim(coalesce(p_payload->>'resolution','')) where id=target returning * into item;
 else raise exception 'HEN_INVALID_OPERATION';
 end if;
 update public.admin_order_issues set updated_at=clock_timestamp() where id=target returning * into item;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'issue.'||p_operation,'order_issue',target,before_data,jsonb_build_object('issue',to_jsonb(item),'input',p_payload));
 return to_jsonb(item);
end $$;
revoke all on function public.admin_issue_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_issue_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
