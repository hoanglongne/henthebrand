# Scope hiện tại: cập nhật từ trao đổi với chủ dự án

Ngày cập nhật: 14/09/2026.

Tài liệu này ghi điều chỉnh so với Build Pack gốc, không thay đổi các file nguồn.

- Hoãn Experiments & KPI và Risks & Decisions. Không tạo module/menu này trong bản đầu.
- Giữ Today, Work, Timeline, Products, Campaigns, Content Studio, Operations, Settings/phân quyền.
- Today không có KPI gate. Tập trung task, blocker, deadline, capacity và readiness khi đã xây campaign.
- Giữ ghi chú lý do đổi stage/override launch và audit tối thiểu tại luồng thao tác; không cần module Decisions.
- Dùng design-taste-frontend (Taste), tuân thủ palette HẸN trong brief; áp dụng thẩm mỹ phù hợp cho admin, không ép pattern landing page vào bảng/form.
- Setup trực tiếp ở folder hen, không tạo app customer QR/reveal.

## Hướng thiết kế

Workspace studio sáng tạo, kem #FFF9EE, navy #17213A, coral #F05A5A; cobalt và lime làm accent có mục đích theo brand. Sans hỗ trợ tiếng Việt, icon Phosphor, layout thoáng, chuyển động nhẹ. Taste dials: DESIGN_VARIANCE 6, MOTION_INTENSITY 3, VISUAL_DENSITY 5. Nút chính navy/white đảm bảo đọc rõ; tránh chữ trắng nhỏ trên coral sáng.

## Lịch sử: setup ban đầu

Foundation có preview chỉ đọc, auth và data read boundary Supabase, migrations/seed/RLS, Today/Work/Products/Timeline và các module kế tiếp được đánh dấu chưa triển khai. Xem README ở root để biết chính xác những phần đã có, chưa có và các bước kết nối backend.

## Hoàn thiện UI

Theo yêu cầu tiếp theo: hoàn thiện UI trước khi nối backend đầy đủ. Các module đều đã có màn hình làm việc và form tương tác trong phiên preview. Campaigns/Content/Operations không còn là trang placeholder. Work, Products, Timeline, Settings và Today dùng chung state của phiên. Thêm tài liệu/bằng chứng ở Product, deadline/asset/postmortem ở Campaign, check-in ở Today.

Thao tác preview chỉ ở memory, có nhãn rõ ràng, reset khi tải lại; không giả lưu thành công vào hệ thống thật. Khi kết nối Supabase vẫn chỉ đọc, các module chưa có nguồn dữ liệu không hiển thị mock. Quyền ghi/database, tích hợp bên ngoài và kiểm thử production là bước tiếp theo. Hai module hoãn vẫn không được thêm.

## Thông tin triển khai đã chốt

Kickoff 15/09/2026. Founder cortexedtech@gmail.com. Vercel cá nhân ngytrhoanglong61@gmail.com. `.env.local` đã được người dùng điền. Repo GitHub: https://github.com/hoanglongne/henthebrand; đã gán origin. Chi tiết kiểm tra và bootstrap: `07_CLOUD_SETUP.md`.

## Kết nối Work thật

Sau khi người dùng xác nhận đã chạy bootstrap, đã thêm migration `202609150002_work_system.sql` và server actions/UI Work để lưu dữ liệu thật. Phạm vi: tạo/sửa, owner/approver, trạng thái, checklist, link kết quả, dependency, bình luận; quyền được thực thi trong database, kiểm tra phiên bản, audit và transaction. Work chỉ mở ghi khi phát hiện migration đã cài. Các module khác tiếp tục chỉ đọc/chưa kết nối. Không mở rộng hai module đã hoãn.

Bootstrap cloud đã có bảng, anon bị chặn; migration Work và luồng đăng nhập/lưu trên cloud còn cần người dùng áp dụng và kiểm chứng. Các kiểm thử local ghi ở README và 07_CLOUD_SETUP.
