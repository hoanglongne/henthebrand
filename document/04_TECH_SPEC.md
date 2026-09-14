# HẸN Admin — Technical Specification

## Stack đề xuất

- Next.js App Router + TypeScript.
- Tailwind CSS và shadcn/ui làm nền component, nhưng custom theme toàn bộ theo brand HẸN.
- Supabase: Postgres, Auth và Storage.
- TanStack Query cho client-side server state khi cần; ưu tiên Server Components và server actions cho màn hình đọc/ghi đơn giản.
- Zod cho validation dùng chung.
- React Hook Form cho form dài.
- Vercel cho deployment và preview.
- Vitest cho logic; Playwright cho các luồng P0.

Không khóa version trong tài liệu. Khi scaffold, dùng bản stable tương thích tại thời điểm build và commit lockfile.

## Kiến trúc

```text
Browser
  └── Next.js App Router
       ├── Server Components: dashboard, lists, detail reads
       ├── Server Actions / Route Handlers: mutations and integrations
       ├── Auth middleware
       └── Domain services
            ├── Work management
            ├── Portfolio and stage gates
            ├── Campaign readiness
            ├── KPI calculations
            └── Audit log
                   └── Supabase Postgres + Storage
```

Admin và customer product dùng chung tổ chức/repository hay tách riêng đều được, nhưng database schema phải tách rõ `admin_*` và customer data. Admin user không mặc nhiên được đọc nội dung riêng tư khách upload. KPI admin lấy từ event tổng hợp hoặc metadata tối thiểu.

## Multi-tenancy tối giản

MVP có một workspace HẸN nhưng mọi bảng nghiệp vụ vẫn có `workspace_id`. Không cần public signup hoặc billing. Founder mời thành viên qua email.

## Vai trò

- `founder`: toàn quyền, thay stage product, override launch gate, quản lý member.
- `ops`: task, campaign readiness, vendor, inventory, issues, KPI ops.
- `product_designer`: product evidence, experiments, design tasks.
- `brand_designer`: campaign, content, asset tasks.
- `viewer`: đọc.

Permission nằm trong bảng membership/app metadata đáng tin cậy; không dùng user-editable profile metadata để cấp quyền.

## Data model

Mọi bảng có `id uuid`, `workspace_id uuid`, `created_at`, `updated_at`; bảng có thay đổi nghiệp vụ thêm `created_by`, `updated_by`.

### Identity

```text
workspaces(id, name, slug, timezone)
profiles(id = auth.user.id, display_name, avatar_url)
memberships(id, workspace_id, user_id, role, capacity_percent, active)
```

### Portfolio

```text
products(
  id, name, slug, moment, audience, promise,
  stage, assumed_price, owner_id,
  impact_score, evidence_score, effort_score, risk_score,
  next_experiment, archived_at
)

product_evidence(
  id, product_id, evidence_type, title, summary,
  sample_size, source_url, observed_at, confidence_note
)

product_stage_changes(
  id, product_id, from_stage, to_stage,
  decision_id, changed_by, changed_at
)
```

### Planning and work

```text
milestones(id, name, description, start_date, due_date, status, owner_id)
initiatives(id, milestone_id, product_id, campaign_id, name, status, owner_id)
sprints(id, name, start_date, end_date, goal, status)

tasks(
  id, code, title, description, workstream,
  product_id, campaign_id, initiative_id, sprint_id,
  owner_id, approver_id, status, priority, effort,
  start_date, due_date, definition_of_done,
  blocked_reason, completed_at, sort_order
)

task_dependencies(task_id, depends_on_task_id)
task_checklist_items(id, task_id, label, completed, completed_by, completed_at)
task_links(id, task_id, label, url, link_type)
comments(id, entity_type, entity_id, body, author_id, created_at)
```

### Campaign and content

```text
campaigns(
  id, name, product_id, occasion, owner_id, status,
  brief_due, asset_due, launch_date, end_date, postmortem_due,
  channel, budget, target_orders, primary_kpi, stop_condition
)

campaign_readiness_items(
  id, campaign_id, key, label, required,
  completed, owner_id, completed_at, note
)

content_items(
  id, campaign_id, product_id, title, hook, format,
  status, owner_id, publish_at, asset_url,
  views, saves, qualified_comments, learning
)
```

### Operations

```text
vendors(id, name, category, contact_name, contact_channel, lead_time_days, moq, note)
skus(id, product_id, code, name, unit_cost, active)
inventory_items(id, sku_id, on_hand, reserved, reorder_point, updated_at)
order_issues(id, external_order_ref, product_id, issue_type, severity, owner_id, status, resolution, occurred_at)
```

Không lưu toàn bộ đơn hàng/customer PII trong admin MVP. `external_order_ref` dùng để đối chiếu với nguồn bán hàng.

### Experiments and metrics

```text
experiments(
  id, product_id, name, hypothesis, method,
  success_criteria, start_date, end_date,
  owner_id, status, result, decision_id
)

metric_definitions(id, key, name, unit, description, target, direction)
metric_entries(id, metric_definition_id, cohort, period_start, period_end, numerator, denominator, value, source, entered_by)
```

Các metric dẫn xuất tính ở service/query layer:

```text
CVR = paid_orders / landing_visits
activation_rate = activated_pairs / pairs_started
reveal_rate = completed_reveals / reveals_due
CAC = marketing_spend / paid_orders
contribution_per_gift = (revenue - variable_cost - marketing_spend) / gift_orders
on_time_rate = on_time_deliveries / deliveries_due
```

Nếu denominator bằng 0, trả `null`, không trả 0.

### Governance

```text
risks(id, title, probability, impact, owner_id, early_signal, mitigation, due_date, status)
decisions(id, title, context, alternatives, decision, rationale, decided_by, decided_at, review_at)
activity_log(id, actor_id, action, entity_type, entity_id, before_json, after_json, created_at)
```

## Enum chính

```ts
type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'blocked' | 'done';
type ProductStage = 'idea' | 'discovery' | 'design' | 'ready_for_build' | 'build' | 'pilot' | 'live' | 'learned' | 'archived';
type CampaignStatus = 'draft' | 'preparing' | 'ready' | 'live' | 'complete' | 'cancelled';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type Effort = 1 | 2 | 3 | 5 | 8 | 13;
```

## Service rules

### Task

- `ready`: bắt buộc owner, approver, due date, effort và Definition of Done.
- `in_progress`: owner không được có quá 2 task đang làm; Founder có thể override kèm reason.
- `done`: bắt buộc checklist required hoàn tất và output link nếu task type yêu cầu.
- Dependency chưa Done tạo warning; P0 dependency có thể block transition.

### Product stage

- Chỉ Founder đổi sang `build`, `pilot`, `live`, `learned`, `archived`.
- Mọi stage change cần `decision_id`.
- Tối đa một product `build` trong workspace.
- Sang `pilot` cần experiment, success criteria và owner support.

### Campaign launch

- `ready` khi toàn bộ readiness item required hoàn tất.
- `live` cần Founder hoặc Ops thực hiện; nếu thiếu gate chỉ Founder override với decision note.

## Route map

```text
/login
/
/timeline
/work
/work/[taskId]
/products
/products/[productId]
/campaigns
/campaigns/[campaignId]
/content
/operations
/experiments
/risks
/decisions
/settings/team
/settings/workspace
```

## API / server actions

Ưu tiên server actions cho form nội bộ. Route handlers dùng cho webhook/export và boundary cần HTTP rõ.

```text
createTask(input)
updateTask(id, patch, expectedUpdatedAt)
transitionTask(id, status, reason?)
reorderTask(id, status, sortOrder)
createProduct(input)
changeProductStage(id, stage, decisionInput)
createCampaign(input)
setReadinessItem(id, completed, note?)
launchCampaign(id, overrideDecision?)
upsertMetricEntry(input)
createRisk(input)
createDecision(input)
getDashboardSnapshot(workspaceId, asOf)
getTimeline(workspaceId, from, to, filters)
```

`expectedUpdatedAt` cung cấp optimistic concurrency đơn giản để tránh ghi đè khi hai người sửa cùng task.

## Security và privacy

- Bật RLS trên mọi bảng exposed; grant và policy đều phải được kiểm soát.
- Policy kiểm tra membership theo `workspace_id` và role.
- Service role chỉ chạy server-side.
- Storage bucket asset nội bộ là private; dùng signed URL ngắn hạn.
- Không đưa secret vào client bundle.
- Activity log cho stage change, launch override, role change và delete.
- Soft-delete task/product quan trọng; hard delete chỉ Founder và có confirmation.
- Admin không truy cập raw media/customer memory của Only When We Meet trừ khi có quy trình support và consent cụ thể.

## Performance

- Dashboard server-rendered, query theo workspace và khoảng ngày.
- Pagination cho activity/comments; không load toàn bộ lịch sử.
- Index: `(workspace_id, status)`, `(workspace_id, due_date)`, foreign keys product/campaign/sprint, metric `(workspace_id, period_start)`.
- Debounce search; optimistic update cho reorder task.

## Testing

### Unit

- Metric formula và denominator 0.
- Definition of Ready.
- WIP limit.
- Campaign readiness.
- Product stage transition.

### Integration

- RLS giữa hai workspace giả lập.
- Role permission.
- Stage change tạo decision và activity atomically.
- Concurrent task update báo conflict.

### End-to-end P0

1. Founder mời member và gán role.
2. Designer tạo task → Ready → Review; Founder approve → Done.
3. Ops hoàn thành readiness; launch campaign.
4. Founder nhập metric và dashboard cập nhật gate.
5. Founder đổi product sang Pilot kèm decision note.

## Seed data

- Workspace `HẸN`.
- Bốn role mẫu.
- 10 products trong Product Brief.
- Roadmap 24 tuần từ tài liệu roadmap.
- Campaign pilot reaction, paid pilot và occasion gần nhất.
- Bốn KPI gate của Only When We Meet.
- Sáu risk ban đầu: adoption, QR security, privacy, vendor delay, team overload, CAC.

## Definition of Done cho admin MVP

- Responsive từ 1280px; mobile hỗ trợ xem và cập nhật task cơ bản.
- Empty/loading/error/permission states đầy đủ.
- Keyboard focus rõ; contrast đạt mức dùng được.
- Không có lỗi TypeScript/lint/test.
- Migration và seed chạy từ database rỗng.
- P0 E2E pass.
- README có setup, env, migration, seed, test và deploy.

## Tài liệu kỹ thuật tham chiếu

- Next.js App Router: https://nextjs.org/docs/app
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/quickstart
