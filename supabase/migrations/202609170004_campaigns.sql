-- Apply once after 202609160003_products_timeline.sql. Does not reset existing data.
begin;
create table public.admin_campaigns (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),
 name text not null check(length(trim(name)) between 1 and 200),product_id uuid,owner_id uuid,
 occasion text not null check(length(trim(occasion)) between 1 and 200),
 status text not null default 'draft' check(status in ('draft','preparing','ready','live','complete','cancelled')),
 channel text not null check(length(trim(channel)) between 1 and 200),
 launch_date date not null,end_date date not null,
 budget bigint not null default 0 check(budget>=0),target_orders integer not null default 0 check(target_orders>=0),
 brief text not null default '' check(length(brief)<=10000),stop_condition text not null default '' check(length(stop_condition)<=5000),
 brief_due date,asset_due date,postmortem_due date,cutoff_date date,
 support_note text not null default '' check(length(support_note)<=5000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(workspace_id,id),
 foreign key(workspace_id,product_id) references public.admin_products(workspace_id,id),
 foreign key(workspace_id,owner_id) references public.admin_memberships(workspace_id,user_id),
 check(end_date>=launch_date),check(brief_due is null or brief_due<=launch_date),
 check(asset_due is null or asset_due<=launch_date),check(postmortem_due is null or postmortem_due>=end_date)
);
create unique index admin_one_live_campaign_per_workspace on public.admin_campaigns(workspace_id) where status='live';
create table public.admin_campaign_readiness_items (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.admin_workspaces(id),campaign_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 200),owner_role text not null check(length(trim(owner_role)) between 1 and 100),
 required boolean not null default true,completed boolean not null default false,completed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,campaign_id) references public.admin_campaigns(workspace_id,id)
);
do $$ declare tab text;begin
 foreach tab in array array['admin_campaigns','admin_campaign_readiness_items'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy workspace_read on public.%I for select to authenticated using(public.admin_is_member(workspace_id))',tab);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.admin_touch_updated_at()',tab);
 end loop;
end $$;
create index on public.admin_campaign_readiness_items(workspace_id,campaign_id);
create index on public.admin_campaigns(workspace_id,status);

create function public.admin_campaign_version() returns integer language sql immutable set search_path='' as $$select 1;$$;
revoke all on function public.admin_campaign_version() from public;
grant execute on function public.admin_campaign_version() to authenticated;

create function public.admin_campaign_mutate(
 p_workspace uuid,p_campaign uuid,p_expected timestamptz,p_operation text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();member_roles text[];founder boolean;planner boolean;camp public.admin_campaigns;target uuid;
 reason text;ready boolean;before_data jsonb;
begin
 if actor is null then raise exception 'HEN_UNAUTHORIZED';end if;
 select roles into member_roles from public.admin_memberships where workspace_id=p_workspace and user_id=actor and active;
 if member_roles is null or not member_roles && array['founder','ops','brand_designer'] then raise exception 'HEN_FORBIDDEN';end if;
 founder := 'founder'=any(member_roles);
 planner := founder or 'ops'=any(member_roles);
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then raise exception 'HEN_INVALID_INPUT';end if;
 -- Serialize writes within this small workspace: the single-live-campaign check stays atomic.
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,3));
 if p_operation='create' then
  if p_campaign is not null then raise exception 'HEN_INVALID_INPUT';end if;
  insert into public.admin_campaigns(workspace_id,name,product_id,owner_id,occasion,channel,launch_date,end_date,budget,target_orders,brief,stop_condition,brief_due,asset_due,postmortem_due,cutoff_date,support_note)
   values(p_workspace,trim(p_payload->>'name'),nullif(p_payload->>'product_id','')::uuid,nullif(p_payload->>'owner_id','')::uuid,
   trim(p_payload->>'occasion'),trim(p_payload->>'channel'),(p_payload->>'launch_date')::date,(p_payload->>'end_date')::date,
   coalesce((p_payload->>'budget')::bigint,0),coalesce((p_payload->>'target_orders')::integer,0),
   trim(coalesce(p_payload->>'brief','')),trim(coalesce(p_payload->>'stop_condition','')),
   nullif(p_payload->>'brief_due','')::date,nullif(p_payload->>'asset_due','')::date,nullif(p_payload->>'postmortem_due','')::date,nullif(p_payload->>'cutoff_date','')::date,
   trim(coalesce(p_payload->>'support_note',''))) returning * into camp;
  target:=camp.id;
  insert into public.admin_campaign_readiness_items(workspace_id,campaign_id,label,owner_role) values
   (p_workspace,target,'Product journey đã QA','Founder / Dev'),
   (p_workspace,target,'Tracking đã kiểm tra','Founder / Dev'),
   (p_workspace,target,'Asset cuối đã duyệt','Brand / Content'),
   (p_workspace,target,'Tồn kho đủ target + buffer','Ops'),
   (p_workspace,target,'Cutoff giao hàng đã chốt','Ops'),
   (p_workspace,target,'Support script & người trực','Ops'),
   (p_workspace,target,'Ngân sách trần & điều kiện dừng','Founder / Dev');
 else
  select * into camp from public.admin_campaigns where workspace_id=p_workspace and id=p_campaign for update;
  if not found then raise exception 'HEN_NOT_FOUND';end if;
  target:=camp.id;before_data:=to_jsonb(camp);
  if p_expected is null or p_expected<>camp.updated_at then raise exception 'HEN_CONFLICT';end if;
  case p_operation
   when 'update' then
    update public.admin_campaigns set name=trim(p_payload->>'name'),product_id=nullif(p_payload->>'product_id','')::uuid,
     owner_id=nullif(p_payload->>'owner_id','')::uuid,occasion=trim(p_payload->>'occasion'),channel=trim(p_payload->>'channel'),
     launch_date=(p_payload->>'launch_date')::date,end_date=(p_payload->>'end_date')::date,
     budget=coalesce((p_payload->>'budget')::bigint,0),target_orders=coalesce((p_payload->>'target_orders')::integer,0),
     brief=trim(coalesce(p_payload->>'brief','')),stop_condition=trim(coalesce(p_payload->>'stop_condition','')),
     brief_due=nullif(p_payload->>'brief_due','')::date,asset_due=nullif(p_payload->>'asset_due','')::date,
     postmortem_due=nullif(p_payload->>'postmortem_due','')::date,cutoff_date=nullif(p_payload->>'cutoff_date','')::date,
     support_note=trim(coalesce(p_payload->>'support_note','')) where id=target returning * into camp;
   when 'readiness_toggle' then
    if camp.status in ('live','complete') then raise exception 'HEN_CAMPAIGN_LOCKED';end if;
    update public.admin_campaign_readiness_items set completed=(p_payload->>'completed')::boolean,
     completed_at=case when (p_payload->>'completed')::boolean then clock_timestamp() else null end
     where workspace_id=p_workspace and campaign_id=target and id=(p_payload->>'id')::uuid;
    if not found then raise exception 'HEN_NOT_FOUND';end if;
   when 'launch' then
    if camp.status in ('live','complete') then raise exception 'HEN_CAMPAIGN_LOCKED';end if;
    if exists(select 1 from public.admin_campaigns where workspace_id=p_workspace and id<>target and status='live') then raise exception 'HEN_CAMPAIGN_ALREADY_LIVE';end if;
    ready := not exists(select 1 from public.admin_campaign_readiness_items where campaign_id=target and required and not completed);
    reason := trim(coalesce(p_payload->>'reason',''));
    if not ready then
     if not founder then raise exception 'HEN_STAGE_FORBIDDEN';end if;
     if reason='' then raise exception 'HEN_STAGE_REASON_REQUIRED';end if;
    elsif not planner then raise exception 'HEN_FORBIDDEN';
    end if;
    update public.admin_campaigns set status='live' where id=target returning * into camp;
   when 'complete' then
    if camp.status<>'live' then raise exception 'HEN_CAMPAIGN_NOT_LIVE';end if;
    if not planner then raise exception 'HEN_FORBIDDEN';end if;
    update public.admin_campaigns set status='complete' where id=target returning * into camp;
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 update public.admin_campaigns set updated_at=clock_timestamp() where id=target returning * into camp;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'campaign.'||p_operation,'campaign',target,before_data,jsonb_build_object('campaign',to_jsonb(camp),'input',p_payload));
 return to_jsonb(camp);
end $$;
revoke all on function public.admin_campaign_mutate(uuid,uuid,timestamptz,text,jsonb) from public;
grant execute on function public.admin_campaign_mutate(uuid,uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
