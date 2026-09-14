# Master Prompt — xây HẸN Admin

Sao chép toàn bộ nội dung bên dưới vào coding agent. Đính kèm thêm bốn tài liệu còn lại trong Build Pack.

---

Bạn là product engineer kiêm product designer. Hãy xây **HẸN Admin**, một website nội bộ giúp đội 3–4 người quản lý brand quà tặng cảm xúc kết hợp công nghệ.

Đọc toàn bộ các tài liệu được cung cấp trước khi code:

- `01_PRODUCT_BRIEF.md`
- `02_OPERATING_PLAYBOOK.md`
- `03_ROADMAP_24_WEEKS.md`
- `04_TECH_SPEC.md`

## Mục tiêu

Tạo một “mission control” mà Founder/Dev, Ops và 1–2 designer dùng hàng ngày để quản lý sản phẩm, task, timeline, campaign, experiment, KPI, risk và decision. Người dùng phải biết ngay hôm nay cần làm gì, launch nào đang có nguy cơ trễ và product nào đủ bằng chứng để đi tiếp.

## Cách làm

1. Khảo sát repository và ghi lại những gì đã có.
2. Viết một kế hoạch ngắn theo milestone và bắt đầu thực hiện ngay; không dừng ở mockup.
3. Dùng Next.js App Router + TypeScript, Tailwind, shadcn/ui đã custom theme, Supabase Postgres/Auth/Storage, Zod, Vitest và Playwright. Dùng stable versions tương thích và commit lockfile.
4. Tạo migrations, RLS policies, seed data và ứng dụng chạy được end-to-end.
5. Sau mỗi milestone, chạy typecheck/lint/test liên quan và sửa lỗi trước khi tiếp tục.
6. Cuối cùng chạy toàn bộ validation, chụp/kiểm tra các màn hình chính ở desktop và mobile, rồi cập nhật README.

## Thiết kế

HẸN là một creative studio trẻ, thân mật và có gu. Admin phải vui khi mở mỗi ngày nhưng vẫn rõ ràng khi làm việc.

- Palette: warm cream `#FFF9EE`, navy `#17213A`, coral `#F05A5A`, cobalt `#4C6FFF`, lime `#CBEF43`.
- Typography mạnh, sạch, nhiều khoảng thở.
- Dùng những moment có cảm xúc: “First Reveal”, “Paid Pilot”, “Tết gặp lại”.
- Card có hierarchy rõ; border mảnh; shadow rất nhẹ hoặc không có.
- Tránh giao diện SaaS template với hàng chục KPI card, sidebar icon vô nghĩa, gradient tím và glassmorphism.
- Các bảng dài cần filter, sticky header và row density hợp lý.
- Trạng thái phải đọc được bằng chữ; màu chỉ hỗ trợ.

## Navigation

```text
Today
Timeline
Work
Products
Campaigns
Content Studio
Operations
Experiments & KPI
Risks & Decisions
Settings
```

## Sprint triển khai bắt buộc

### Sprint 0 — Foundation

- Scaffold app, theme và layout.
- Supabase local/cloud configuration.
- Auth, workspace, membership và role.
- Migration + seed.
- App shell, command/search cơ bản, error handling.

### Sprint 1 — Work system

- Today dashboard.
- Work Board với list/kanban switch.
- Task detail drawer/page.
- Status transition, WIP warning, dependency, checklist, link và comment.
- Timeline 24 tuần đọc từ milestone/initiative/task.

### Sprint 2 — Portfolio and launch

- Product list/detail, evidence và stage gate.
- Campaign list/calendar/detail.
- Readiness checklist và launch override decision.
- Content Studio pipeline tối giản.

### Sprint 3 — Learning and operations

- Experiment, metric entry và KPI gate.
- Risk và decision log.
- Vendor/inventory/order issue views tối giản.
- Activity log và dashboard alerts.

### Sprint 4 — Hardening

- RLS/permission tests.
- P0 Playwright tests.
- Responsive states, accessibility, empty/loading/error.
- Performance pass, README và deployment preview.

## Quy tắc nghiệp vụ không được bỏ

- Một task vào Ready phải có owner, approver, due date, effort và Definition of Done.
- Mỗi người tối đa 2 task In Progress; override phải có lý do.
- Chỉ một product ở Build.
- Product stage change cần decision note; các stage quan trọng chỉ Founder được đổi.
- Campaign chỉ Live khi required readiness xanh; Founder có thể override kèm decision.
- KPI denominator bằng 0 trả null/“Chưa có dữ liệu”, không trả 0.
- Admin không được đọc raw customer memories của sản phẩm consumer.
- Mọi bảng nghiệp vụ có workspace_id và RLS.

## Seed experience

Khi chạy seed, app phải trông như một dự án thật đang ở Tuần 1:

- Mission: paid pilot 60 đơn cho Only When We Meet.
- Roadmap 24 tuần theo tài liệu.
- 10 sản phẩm đã brainstorm.
- 20 task đầu tiên có owner, deadline và dependency.
- Campaign pilot reaction, paid pilot, Tết gặp lại và Valentine waitlist.
- KPI target: activation 70%, reveal 60%, CAC 65.000đ, contribution 100.000đ.
- Risk ban đầu và ba decision: Only When We Meet là MVP; QR trước NFC; giới hạn một product build.

## Acceptance checklist

- Có thể đăng nhập và phân quyền bốn vai trò.
- Today hiển thị việc của người dùng, blocker, countdown, capacity và KPI gate.
- Có thể tạo task, đưa vào Ready, làm, review và Done theo rule.
- Timeline thể hiện milestone và dependency, filter được theo owner/workstream.
- Product stage gate ghi decision history.
- Campaign readiness ngăn launch thiếu điều kiện.
- KPI nhập tay và tính đúng rate/CAC/contribution.
- RLS ngăn member ngoài workspace truy cập dữ liệu.
- Seed và migrations chạy lại từ database rỗng.
- Typecheck, lint, unit/integration và P0 E2E pass.
- README đủ để một dev mới chạy local trong 15 phút.

Nếu có chi tiết chưa rõ, chọn giải pháp đơn giản nhất phù hợp Product Brief, ghi assumption vào decision log và tiếp tục. Không mở rộng sang customer-facing app, ecommerce, AI prioritization hoặc tích hợp social publishing trong MVP.

---

## Prompt tiếp theo sau khi agent hoàn thành Sprint 0

> Tiếp tục Sprint 1 theo Master Prompt. Trước khi code, demo ngắn database seed và quyền của bốn role. Sau đó hoàn thiện Today, Work Board, task detail và Timeline. Dùng dữ liệu thật từ database; không hardcode UI. Chạy test cho Definition of Ready, WIP limit và role permissions trước khi kết thúc.

