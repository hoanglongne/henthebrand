-- Apply once after 202609200007_members_settings.sql. Does not reset existing data.
begin;
-- Mốc thời gian sản phẩm bước vào giai đoạn hiện tại: dùng để phát hiện ý tưởng nằm ì.
alter table public.admin_products add column stage_since timestamptz not null default now();
alter table public.admin_products add column impact_score smallint check(impact_score between 1 and 5);
alter table public.admin_products add column effort_score smallint check(effort_score between 1 and 5);
update public.admin_products p set stage_since=coalesce(
 (select max(c.created_at) from public.admin_product_stage_changes c where c.product_id=p.id),p.created_at);

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
  insert into public.admin_products(workspace_id,name,slug,moment,audience,promise,impact_score,effort_score,stage_since)
   values(p_workspace,trim(p_payload->>'name'),new_slug,trim(coalesce(p_payload->>'moment','')),trim(coalesce(p_payload->>'audience','')),
   trim(coalesce(p_payload->>'promise','')),nullif(p_payload->>'impact_score','')::smallint,nullif(p_payload->>'effort_score','')::smallint,clock_timestamp()) returning * into pr;
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
   else raise exception 'HEN_INVALID_OPERATION';
  end case;
 end if;
 update public.admin_products set updated_at=clock_timestamp() where id=target returning * into pr;
 insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id,before_json,after_json)
 values(p_workspace,actor,'product.'||p_operation,'product',target,before_data,jsonb_build_object('product',to_jsonb(pr),'input',p_payload));
 return to_jsonb(pr);
end $$;
notify pgrst,'reload schema';
commit;
