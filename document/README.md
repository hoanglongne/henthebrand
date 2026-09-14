# HẸN Admin — Build Pack

Đây là bộ tài liệu để xây một website quản lý toàn bộ dự án HẸN. Mục tiêu của admin là giúp một đội nhỏ 3–4 người biết rõ **hôm nay cần làm gì, việc nào đang chặn launch và sản phẩm nào xứng đáng được đầu tư tiếp**.

## Đọc theo thứ tự này

1. `01_PRODUCT_BRIEF.md` — website giải quyết việc gì, dành cho ai và có những màn hình nào.
2. `02_OPERATING_PLAYBOOK.md` — cách đội sử dụng website mỗi ngày và mỗi tuần.
3. `03_ROADMAP_24_WEEKS.md` — từng tuần cần làm gì để đi từ số 0 đến hai đợt pilot.
4. `04_TECH_SPEC.md` — kiến trúc, dữ liệu, API, quyền truy cập và tiêu chuẩn kỹ thuật.
5. `05_MASTER_BUILD_PROMPT.md` — prompt hoàn chỉnh để đưa cho coding agent xây admin.

## Quyết định sản phẩm đã khóa

- Sản phẩm đầu tiên: **Only When We Meet**.
- QR handshake là cơ chế MVP. NFC là upsell sau khi hành vi cốt lõi được kiểm chứng.
- Một thời điểm chỉ có 1 sản phẩm đang build, 1 sản phẩm đang design và 1 campaign chính đang chạy.
- Pilot đầu tiên: 10 cặp dùng thử kín.
- Paid pilot: 60 đơn, giá tham chiếu 99.000đ digital và 299.000đ gift.
- Cổng MVP: activation ≥70%, reveal completion ≥60%, CAC ≤65.000đ, contribution mỗi gift ≥100.000đ.

## Cách bắt đầu trong 60 phút

1. Đọc Product Brief và xóa những module bạn chưa cần trong 8 tuần đầu.
2. Đổi `Tuần 1` trong Roadmap thành thứ Hai gần nhất mà bạn thực sự có thể bắt đầu.
3. Ghi tên thật của từng người vào bốn vai trò: Founder/Dev, Ops, Product Design, Brand/Content Design.
4. Đưa Master Build Prompt cho coding agent và yêu cầu làm Sprint 0 trước.
5. Không code phần customer app trong admin repo. Admin chỉ quản lý công việc, vận hành và dữ liệu pilot.

