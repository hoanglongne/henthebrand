# Kết nối cloud HẸN

Thông tin chủ dự án đã chốt:
- Founder: cortexedtech@gmail.com.
- Kickoff: 15/09/2026 (ngày do chủ dự án chọn, dù không phải thứ Hai).
- Vercel: tài khoản cá nhân ngytrhoanglong61@gmail.com.
- GitHub: https://github.com/hoanglongne/henthebrand. Đã gán remote origin.

## Đã kiểm tra

`.env.local` có URL và publishable key, Auth API trả HTTP 200. Sau khi người dùng chạy bootstrap, REST trả HTTP 401/code 42501 cho `admin_workspaces`: bảng đã tồn tại và anon không được đọc. Public signup đang bật. Chưa có quyền quản trị Supabase qua CLI. Không có secret nào được ghi vào tài liệu hoặc in ra kết quả kiểm tra.

## Thao tác trong Supabase Dashboard

1. Authentication → cấu hình đăng ký: tắt **Allow new users to sign up** cho workspace riêng tư này.
2. Authentication → Users: kiểm tra có `cortexedtech@gmail.com` chưa. Nếu chưa, Add user bằng email/password, xác nhận email. Chủ tài khoản tự đặt mật khẩu; không cần gửi cho agent.
3. SQL Editor: mở file `supabase/bootstrap/01_initial_setup.sql`, dán toàn bộ nội dung và Run.
4. File chạy trong một transaction, tạo foundation + dữ liệu khởi đầu + membership Founder. Nếu email chưa được xác nhận hoặc bảng đã có, script dừng trước khi khởi tạo. Không reset hoặc xóa dữ liệu.
5. Chạy `npm run db:check` rồi đăng nhập `/login` để đọc workspace. Chạy migration Work bổ sung bên dưới để bật ghi Công việc. Bootstrap không đồng nghĩa hoàn thiện backend.

Nếu đã có bảng, không sửa script để bỏ kiểm tra. Kiểm tra schema trước khi áp dụng migration tiếp theo. Bootstrap bằng SQL Editor chưa ghi lịch sử Supabase CLI migrations; cần đối chiếu baseline trước khi dùng CLI db push để tránh chạy lặp migration đầu.

## Lệnh local

- `npm run db:check`: chỉ kiểm tra kết nối/trạng thái, không in token/key và không đổi dữ liệu.
- `npm run db:bootstrap:generate`: tái tạo seed và SQL bootstrap. Không thực thi trên cloud.
- `npm test`: kiểm tra schema/RLS/bootstrap bằng PostgreSQL PGlite, không truy cập cloud.

Không đưa `.env.local` lên Git. Đã cấu hình remote origin; chưa push repo và chưa deploy Vercel trong bước này.

## Bước tiếp theo sau bootstrap: bật Work

1. SQL Editor → New query → dán toàn bộ `supabase/migrations/202609150002_work_system.sql` → Run **một lần**. Không chạy lại `01_initial_setup.sql`. Migration bổ sung bảng checklist/link/comment và RPC, không reset dữ liệu. Nếu lỗi, transaction rollback; giữ nguyên thông báo để kiểm tra trước khi chạy lại.
2. Mở http://127.0.0.1:3000/login, đăng nhập tài khoản Founder bằng mật khẩu đã tự đặt.
3. Vào Work, tạo một công việc, chọn Founder làm người phụ trách và người duyệt, nhập hạn/Definition of Done. Reload để xác nhận dữ liệu được giữ.
4. Chuyển Ready → In Progress, gắn link kết quả thật, chuyển Review, hoàn tất checklist và duyệt Done. Chỉ bấm Done sau khi thực sự kiểm tra kết quả.
5. Kiểm tra đăng nhập bằng một tài khoản không có membership phải bị chặn. Kiểm tra nhiều tab: khi một tab sửa trước, tab còn lại phải báo dữ liệu đã thay đổi thay vì ghi đè.

Mật khẩu Founder do chủ tài khoản giữ, không cần gửi cho agent. Chưa có phiên Founder để agent kiểm thử cloud. Public signup vẫn enabled tại lần kiểm tra mới nhất; tắt trong Authentication cho workspace nội bộ.

### Kiểm tra local của đợt Work

- Vitest/PGlite: migration, quyền Founder/owner/approver/viewer/outsider, chống ghi trực tiếp, assignment, WIP/override, Review/Done, dependency cycle/P0, comment identity, audit và stale version.
- Playwright: 14 kịch bản preview desktop/mobile đã qua, chạy riêng cổng 3100 không sửa env thật.
- Luồng ghi qua Supabase cloud, phiên đăng nhập thật, mời email, Storage và deploy Vercel chưa được xác nhận.
