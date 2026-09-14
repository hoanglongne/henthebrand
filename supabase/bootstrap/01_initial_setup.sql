-- HẸN: FIRST-TIME SETUP ONLY. Run in Supabase SQL Editor as project administrator.
-- Create the confirmed Founder user in Authentication > Users before running.
-- Does not reset or delete existing tables. Aborts if tables already exist.
-- All changes are transactional; a failure rolls back the setup.
begin;
do $$ begin
 if to_regclass('public.admin_workspaces') is not null then
  raise exception 'HEN_ALREADY_INITIALIZED: use versioned migrations instead of this bootstrap';
 end if;
 if not exists(select 1 from auth.users where lower(email)='cortexedtech@gmail.com' and email_confirmed_at is not null) then
  raise exception 'HEN_FOUNDER_MISSING: create and confirm cortexedtech@gmail.com in Authentication > Users first';
 end if;
end $$;

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

-- Generated by npm run db:seed:generate. Re-runnable, does not overwrite existing data.
-- Real members are bootstrapped separately. Tasks stay Backlog until assigned.
insert into public.admin_workspaces(id,name,slug,start_date) values ('10000000-0000-4000-8000-000000000001','HẸN','hen','2026-09-15') on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Only When We Meet','only-when-we-meet','Một cuộc hẹn, một điều chỉ hai người biết.','Cặp đôi yêu xa, chuẩn bị gặp lại','Kỷ niệm chỉ mở khi chúng mình gặp nhau.','discovery',0) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Reunion Box','reunion-box','Một món quà cho ngày gặp lại.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',1) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','One Photo Only','one-photo-only','Giữ lại đúng một khoảnh khắc.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',2) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Relationship Achievements','relationship-achievements','Những cột mốc của hai người.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',3) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Our Lore','our-lore','Câu chuyện chỉ chúng mình hiểu.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',4) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','The Last Night','the-last-night','Lời muốn nói trước lúc chia xa.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',5) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','Friendship Side Quest','friendship-side-quest','Một nhiệm vụ nhỏ, một tình bạn lớn.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',6) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','Our Map','our-map','Những nơi mình đã đi cùng nhau.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',7) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','Unsent Letter','unsent-letter','Gửi điều còn chưa nói.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',8) on conflict do nothing;
insert into public.admin_products(id,workspace_id,name,slug,moment,audience,promise,stage,sort_order) values ('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','Future Us','future-us','Một lời nhắn cho chúng mình mai sau.','Chưa chọn phân khúc','Chưa chốt promise; cần tìm hiểu người mua.','idea',9) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Hiểu người mua','10 cuộc phỏng vấn, một lời hứa rõ ràng.',1,2) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Prototype Day','Test trải nghiệm và mẫu quà đầu tiên.',3,4) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Sẵn sàng gặp nhau','Build MVP và hoàn tất 10 dry run.',5,8) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','First Reveal','10 cặp, những khoảnh khắc đầu tiên.',9,10) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Paid Pilot','60 đơn đầu tiên, học từ vận hành thực tế.',11,14) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','Ổn định nền','Cải thiện vận hành và tìm hiểu sản phẩm tiếp theo.',15,18) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','Cuộc hẹn tiếp theo','Thiết kế và pilot sản phẩm thứ hai.',19,23) on conflict do nothing;
insert into public.admin_milestones(id,workspace_id,name,description,start_week,end_week) values ('30000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','Nhìn lại sáu tháng','Chọn một mục tiêu cho quý tiếp theo.',24,24) on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','HEN-001','Chốt chân dung cặp đôi đầu tiên','20000000-0000-4000-8000-000000000001','backlog','P0',3,'Product','2026-09-16','Có tài liệu/output cho “chốt chân dung cặp đôi đầu tiên”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','HEN-002','Viết giả thuyết người mua & khoảnh khắc','20000000-0000-4000-8000-000000000001','backlog','P0',2,'Dev','2026-09-17','Có tài liệu/output cho “viết giả thuyết người mua & khoảnh khắc”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','HEN-003','Tuyển 10 người phỏng vấn','20000000-0000-4000-8000-000000000001','backlog','P0',3,'Brand','2026-09-18','Có tài liệu/output cho “tuyển 10 người phỏng vấn”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Brand / Content. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','HEN-004','Phân vai và capacity của đội','20000000-0000-4000-8000-000000000001','backlog','P0',1,'Dev','2026-09-19','Có tài liệu/output cho “phân vai và capacity của đội”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','HEN-005','Dựng nền HẸN Admin','20000000-0000-4000-8000-000000000001','backlog','P0',5,'Dev','2026-09-20','Có tài liệu/output cho “dựng nền hẹn admin”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','HEN-006','Lập ngân sách trần cho pilot','20000000-0000-4000-8000-000000000001','backlog','P0',2,'Operations','2026-09-16','Có tài liệu/output cho “lập ngân sách trần cho pilot”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Ops. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','HEN-007','Soạn kịch bản phỏng vấn','20000000-0000-4000-8000-000000000001','backlog','P1',2,'Product','2026-09-17','Có tài liệu/output cho “soạn kịch bản phỏng vấn”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','HEN-008','Phỏng vấn 10 người yêu xa','20000000-0000-4000-8000-000000000001','backlog','P1',5,'Product','2026-09-26','Có tài liệu/output cho “phỏng vấn 10 người yêu xa”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','HEN-009','Test ba mức giá 99k / 199k / 299k','20000000-0000-4000-8000-000000000001','backlog','P1',3,'Dev','2026-09-26','Có tài liệu/output cho “test ba mức giá 99k / 199k / 299k”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','HEN-010','Tổng hợp insight và lý do không mua','20000000-0000-4000-8000-000000000001','backlog','P1',3,'Product','2026-09-26','Có tài liệu/output cho “tổng hợp insight và lý do không mua”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','HEN-011','Chốt lời hứa Only When We Meet','20000000-0000-4000-8000-000000000001','backlog','P1',2,'Dev','2026-09-26','Có tài liệu/output cho “chốt lời hứa only when we meet”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','HEN-012','Vẽ flow từ tạo cặp đến reveal','20000000-0000-4000-8000-000000000001','backlog','P1',3,'Product','2026-10-03','Có tài liệu/output cho “vẽ flow từ tạo cặp đến reveal”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','HEN-013','Làm prototype mobile','20000000-0000-4000-8000-000000000001','backlog','P1',5,'Product','2026-10-03','Có tài liệu/output cho “làm prototype mobile”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','HEN-014','Test prototype với 7 người','20000000-0000-4000-8000-000000000001','backlog','P1',3,'Product','2026-10-03','Có tài liệu/output cho “test prototype với 7 người”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Product Design. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','HEN-015','Làm mẫu card QR bằng giấy','20000000-0000-4000-8000-000000000001','backlog','P2',2,'Operations','2026-10-03','Có tài liệu/output cho “làm mẫu card qr bằng giấy”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Ops. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000001','HEN-016','Chốt bộ nhận diện tối thiểu','20000000-0000-4000-8000-000000000001','backlog','P2',3,'Brand','2026-10-10','Có tài liệu/output cho “chốt bộ nhận diện tối thiểu”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Brand / Content. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000001','HEN-017','Thiết kế hai hướng packaging','20000000-0000-4000-8000-000000000001','backlog','P2',5,'Brand','2026-10-10','Có tài liệu/output cho “thiết kế hai hướng packaging”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Brand / Content. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000001','HEN-018','Lấy báo giá từ 3 vendor','20000000-0000-4000-8000-000000000001','backlog','P2',3,'Operations','2026-10-10','Có tài liệu/output cho “lấy báo giá từ 3 vendor”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Ops. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000019','10000000-0000-4000-8000-000000000001','HEN-019','Tính chi phí digital và gift','20000000-0000-4000-8000-000000000001','backlog','P2',2,'Operations','2026-10-10','Có tài liệu/output cho “tính chi phí digital và gift”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Ops. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_tasks(id,workspace_id,code,title,product_id,status,priority,effort,workstream,due_date,definition_of_done,description) values ('40000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','HEN-020','Review scope trước khi build','20000000-0000-4000-8000-000000000001','backlog','P2',2,'Dev','2026-10-10','Có tài liệu/output cho “review scope trước khi build”, được người phụ trách duyệt và gắn link vào task.','Vai trò dự kiến: Founder / Dev. Phân công thành viên thật trước khi chuyển Ready.') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000008','40000000-0000-4000-8000-000000000007') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000008') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000010') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000013','40000000-0000-4000-8000-000000000012') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000014','40000000-0000-4000-8000-000000000013') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000017','40000000-0000-4000-8000-000000000016') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000020','40000000-0000-4000-8000-000000000014') on conflict do nothing;
insert into public.admin_task_dependencies(workspace_id,task_id,depends_on_task_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000020','40000000-0000-4000-8000-000000000019') on conflict do nothing;

insert into public.admin_memberships(workspace_id,user_id,display_name,roles,capacity_percent)
select '10000000-0000-4000-8000-000000000001', id, 'Founder / Dev', array['founder'],100
from auth.users where lower(email)='cortexedtech@gmail.com';
insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id)
select workspace_id,user_id,'workspace_bootstrapped','workspace',workspace_id
from public.admin_memberships where 'founder'=any(roles)
and workspace_id='10000000-0000-4000-8000-000000000001';
commit;
