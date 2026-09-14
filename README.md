# HẸN Admin

Workspace nội bộ cho đội HẸN. Nền tảng Next.js App Router, TypeScript, Tailwind v4, component theo shadcn/ui với theme HẸN, Supabase Auth/Postgres và RLS.

## Chạy ngay

```bash
npm ci
npm run dev
```

Mở http://127.0.0.1:3000. Khi chưa cấu hình Supabase, app chạy **preview tương tác trong phiên**, có banner dữ liệu mẫu. Không giả lập đăng nhập. Thao tác thử dùng React state trong phiên, không ghi localStorage/database; tải lại trang sẽ reset. Mỗi form và thông báo đều ghi rõ đây là bản thử.

Node 22 trở lên được khuyến nghị (`.nvmrc`). Dự án có runtime Node 22 trong devDependencies để các npm scripts dùng đúng phiên bản mà không đổi Node toàn máy. Máy đang dùng Node 20 có thể thấy cảnh báo engines ở bước cài lần đầu; dùng `nvm use` nếu đã cài nvm. Commit package-lock.json cùng thay đổi dependency.

## UI hiện tại

Đã hoàn thiện giao diện của toàn bộ module trong phạm vi bản đầu, có thao tác trong phiên preview:

- **Today:** mission, lọc task theo người, WIP, roadmap, check-in và activity của phiên thử.
- **Work:** tạo/sửa task, tìm/lọc, list/kanban, chi tiết, checklist, output link, trao đổi, dependency, chuyển trạng thái và cảnh báo Ready/WIP/review/Done.
- **Timeline:** biểu đồ 24 tuần, chi tiết/chỉnh mốc, task theo deadline, lọc owner/workstream. Chỉnh mốc không tự dời task/campaign.
- **Products:** tìm/lọc, thêm/sửa ý tưởng, chi tiết, tài liệu/bằng chứng, task liên quan và lịch sử đổi stage kèm ghi chú.
- **Campaigns:** danh sách/calendar, tạo/sửa brief, ngân sách/target, deadline brief/asset/postmortem, cutoff/support, readiness, thử mở/kết thúc campaign và override có lý do.
- **Content Studio:** thẻ nội dung/pipeline, lọc stage/kênh, tạo/sửa hook, format, asset, lịch đăng, bài học; kiểm tra link trước Scheduled/Published.
- **Operations:** tồn kho, tìm/lọc, chỉnh vật tư, CSV download, vendor/mẫu, ghi/sửa sự cố và checklist đóng gói dry run.
- **Settings:** chỉnh thông tin workspace, thêm/sửa thành viên mẫu, nhiều vai trò/capacity và ma trận quyền dự kiến.
- **Toàn app:** tìm kiếm trang/task/product/campaign bằng nút hoặc Cmd/Ctrl+K; drawer có label, focus trap, Escape; điều hướng mobile; empty/error/validation; responsive.

Giao diện dùng dữ liệu minh họa khi thiếu cấu hình Supabase. Những thao tác thử giữ trạng thái khi chuyển trang bằng điều hướng trong app, mất khi reload hoặc mở tab mới. Không có lời mời email, social publishing hay đơn hàng thật được gửi đi. Provider ở workspace layout giữ dữ liệu chung giữa các module.

## Backend còn lại

**Hoàn thiện UI không đồng nghĩa admin đã sẵn sàng vận hành production.** Work đã nối luồng ghi thật sau khi áp dụng `supabase/migrations/202609150002_work_system.sql`: tạo/sửa, phân công owner/approver, trạng thái, checklist, output link, dependency và bình luận. Mỗi lần ghi được kiểm tra trong server action và RPC, có kiểm tra phiên bản chống ghi đè và audit trong cùng transaction. Client không được ghi trực tiếp vào bảng. Trước khi có migration, Work chỉ đọc và hiện thông báo thiết lập.

Các module còn lại vẫn chỉ đọc hoặc hiển thị trạng thái chưa kết nối; không trộn dữ liệu mẫu vào workspace thật.

- Thêm schema/RPC cho campaign, content, ops, evidence, check-in và stage notes.
- Kết nối form của các module còn lại với server validation, permission, transaction, optimistic concurrency và audit.
- Kết nối mời thành viên thật, asset storage private và lịch sử hoạt động lâu dài.
- Bổ sung drag reorder và phân trang UI khi dữ liệu lớn. Work đã đọc danh sách theo từng trang từ database, không cắt ngầm ở 100 task.
- Kiểm thử Supabase Auth/RLS/Storage thực tế và P0 nghiệp vụ trước deployment.

Ma trận trong Settings mô tả quyền dự kiến cho toàn bộ module; Work đã có quyền thực thi riêng. Preview mô phỏng thao tác Founder; đây không phải cơ chế cấp quyền thật. Database tiếp tục khóa các lệnh ghi từ client. Mission/ticket Today vẫn mô tả chặng đầu của bộ seed; hoạt động sống cần nối ngày/tiến độ từ backend.

**Experiments & KPI và Risks & Decisions được hoãn theo yêu cầu mới nhất.** Không có route, menu, bảng KPI/risk/decision trong foundation. Ghi chú đổi stage/override launch và activity audit tối thiểu vẫn thuộc phạm vi sắp xây, nằm ngay trong luồng thao tác.

## Supabase local

Cần Docker Desktop đang chạy:

```bash
npm run db:start
npm run db:reset
```

`db:reset` xóa và tạo lại **database local**; chỉ dùng khi chấp nhận mất dữ liệu local. Migration ở `supabase/migrations`, seed ở `supabase/seed.sql`. Không tự chạy reset trên project cloud.

Chép `.env.example` thành `.env.local`, điền URL và publishable key (hoặc anon key local) lấy từ `supabase status`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-anon-or-publishable-key
```

Khởi động lại dev server sau khi thay env. Thiếu cả cấu hình thì dùng preview; có cấu hình nhưng database lỗi thì hiện lỗi, không âm thầm quay về dữ liệu giả.

### Bootstrap Founder

1. Mở Supabase Studio local tại http://127.0.0.1:54323 (hoặc dashboard project cloud).
2. Authentication → Users → Add user: tạo tài khoản email/password có email confirmed. Public signup đã tắt trong cấu hình local; tắt tương tự trên cloud.
3. Chạy SQL sau trong SQL Editor với email thực tế của tài khoản vừa tạo:

```sql
insert into public.admin_memberships
  (workspace_id, user_id, display_name, roles, capacity_percent)
select '10000000-0000-4000-8000-000000000001', id,
       'Tên Founder', array['founder'], 100
from auth.users where email = 'founder@example.com'
on conflict (workspace_id, user_id) do nothing;
```

4. Đăng nhập tại `/login`. Tài khoản không có membership active bị chặn truy cập workspace.
5. Thêm các thành viên khác theo cách tương tự, role `ops`, `product_designer`, `brand_designer`, `viewer`. Một người kiêm thiết kế: `array['product_designer','brand_designer']`.

Không có mật khẩu seed mặc định. Không cần và không đưa service-role key vào frontend. Bootstrap role chỉ thực hiện qua SQL quản trị. Foundation chỉ cấp SELECT cho authenticated; chưa mở INSERT/UPDATE/DELETE từ client. RPC Work đã có validation, phân quyền và audit; các chức năng còn lại sẽ được bổ sung riêng.

### Dữ liệu seed

10 sản phẩm, 20 task, 8 milestone, 8 dependency; ngày bắt đầu mặc định 15/09/2026. Preview dùng owner theo vai trò để diễn tả giao diện. **Seed database thật giữ task ở Backlog và chưa gán người**, vì chưa có tài khoản thật. Hướng dẫn owner dự kiến nằm trong description; không tạo tài khoản giả hoặc task Ready thiếu owner.

Đổi ngày bắt đầu và các deadline tương ứng khi chọn ngày kickoff thật. Có thể sửa `previewStart` trong `src/lib/seed.ts`, chạy `npm run db:seed:generate`, rồi reset database local trống. Seed dùng `ON CONFLICT DO NOTHING`, chạy lại không ghi đè dữ liệu đã có.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

- Vitest chạy PostgreSQL bằng PGlite để kiểm tra migration từ database trống, seed lặp lại, RLS chéo workspace, chặn anon/client write, Definition of Ready và giới hạn một product Build. `auth.uid()` được stub trong test để cung cấp identity; đây chưa thay thế kiểm thử Supabase Auth/Storage thật.
- Playwright kiểm tra **UI preview tương tác**: navigation, search/filter, board, product detail, roadmap, tạo task tới Done, campaign readiness, stage notes, content validation, inventory validation, evidence/deadline và mobile overflow. Test tự chạy preview riêng tại cổng 3100, thư mục build `.next-e2e`, không đổi `.env.local` hay dùng Supabase thật; không phải P0 workflow vận hành hoàn chỉnh.
- Auth email/password thực tế, invitation delivery và deployment cần kiểm tra khi có backend được cấu hình.

## Kiến trúc

- `src/app`: routes/layout/error/auth.
- `src/components`: shell, task list, shared UI và `modules/` cho từng module.
- `src/components/workspace-provider.tsx`: state chỉ trong phiên preview; không tạo lệnh ghi database.
- `src/lib/preview-data.ts`: dữ liệu minh họa cho campaign/content/ops, tách khỏi database read boundary.
- `src/lib/data.ts`: read boundary; kiểm tra user/membership và lấy dữ liệu qua RLS. Không dùng service role.
- `src/lib/domain`: types, quy tắc thuần và schema validation Work.
- `src/lib/supabase`: server client; `src/proxy.ts` refresh session.
- `supabase`: cấu hình, migration và seed tách prefix `admin_*`.
- `document`: tài liệu gốc; `document/06_CURRENT_SCOPE.md` ghi scope mới nhất.

Admin không chứa hoặc truy cập raw customer memories/media. Storage chưa tạo bucket; thêm private bucket và signed URL khi xây upload asset.

## Deployment khi sẵn sàng

Import repo vào Vercel, Node 22, lệnh build `npm run build`; cấu hình hai biến Supabase trên môi trường preview/production. Apply migration và seed trên project Supabase được chọn, bootstrap membership, tắt public signup, cấu hình Auth Site URL đúng domain. Remote origin đã cấu hình; chưa push hoặc deploy.

Tài liệu chính thức đã đối chiếu khi setup: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [shadcn/ui](https://ui.shadcn.com/docs/installation/next).

## Kết nối cloud thực tế

Kickoff đã chốt 15/09/2026. Xem `document/07_CLOUD_SETUP.md` và SQL khởi tạo đã chuẩn bị trong `supabase/bootstrap/01_initial_setup.sql`. Người dùng đã chạy bootstrap trên cloud; kiểm tra REST đã xác nhận bảng tồn tại và chặn anon. Migration Work bổ sung chưa được chạy trên cloud. Chạy `npm run db:check` để kiểm tra kết nối mà không in secret.

## Quyền Work và kiểm chứng

- Thành viên có vai trò làm việc được tạo task và bình luận. Viewer chỉ đọc.
- Owner/Founder sửa nội dung, checklist, output và dependency; chỉ Founder đổi owner/approver của task đã tạo.
- Approver/Founder duyệt Done từ Review; cần output và checklist đã hoàn tất. Task Done cần mở lại trước khi sửa nội dung.
- Database chặn dependency vòng lặp, dependency P0 chưa Done khi vào Ready/In Progress và giới hạn 2 task đang làm/owner. Founder vượt WIP phải ghi lý do khi thêm việc hoặc đổi owner vượt giới hạn.
- Bình luận hiển thị 50 mục mới nhất. Checklist/link/dependency hiện tải tối đa 200 mục/task; chưa có upload file, xóa task hoặc chỉnh/xóa bình luận.
- `tests/live-work.test.ts` kiểm tra SQL mutation, RLS, quyền, điều kiện duyệt, WIP, dependency, chống ghi đè và audit bằng PGlite. Chưa thay thế kiểm thử đăng nhập và lưu qua Supabase cloud.
