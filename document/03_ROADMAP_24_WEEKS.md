# Roadmap 24 tuần — dành cho người bắt đầu kinh doanh lần đầu

`Tuần 1` là thứ Hai gần nhất mà đội có thể bắt đầu thật. Đừng xem 24 tuần này như deadline bất biến. Mỗi phase có một cổng quyết định; nếu chưa qua cổng thì không mở thêm scope.

## Phase 1 — Hiểu người mua, tuần 1–2

### Tuần 1: dựng nền

- Chọn một customer segment đầu tiên: couple yêu xa và chuẩn bị gặp lại.
- Viết giả thuyết: ai trả tiền, mua vì dịp nào, khoảnh khắc nào tạo giá trị.
- Tuyển 10 người phỏng vấn, ưu tiên người đã từng yêu xa hoặc tặng quà reunion.
- Phân bốn vai trò, dù một người có thể giữ hai vai.
- Khởi tạo admin Sprint 0: auth, seed workspace, Products, Work Board.
- Lập ngân sách pilot và một tài khoản chi tiêu riêng cho dự án.

**Output:** interview list, problem statement, team owner map, ngân sách trần.

### Tuần 2: kiểm tra vấn đề

- Phỏng vấn 10 người; không pitch sản phẩm trong nửa đầu cuộc nói chuyện.
- Thu thập cách họ đang lưu kỷ niệm, mua quà và cảm giác khi gặp lại.
- Test ba mức giá 99k / 199k / 299k bằng câu hỏi hành vi.
- Tổng hợp insight lặp lại và lý do không mua.
- Chốt một promise cho Only When We Meet.

**Cổng 1:** ít nhất 5/10 người nhận ra vấn đề và 3/10 chủ động hỏi cách mua/thử. Nếu không đạt, đổi segment hoặc moment trước khi code customer product.

## Phase 2 — Prototype và supply, tuần 3–4

### Tuần 3: prototype khoảnh khắc

- Vẽ flow: tạo cặp → bỏ nội dung → chờ → QR handshake → reveal.
- Làm prototype mobile có loading, empty, locked và error state.
- Test với 7 người; quan sát, không hướng dẫn.
- Tạo một mẫu card giấy thủ công để test cảm giác physical.
- Admin: hoàn thiện Timeline, task detail, role/permission.

### Tuần 4: brand và vendor

- Chốt brand kit tối thiểu: logo lockup, màu, type, tone of voice.
- Thiết kế card QR và hai hướng packaging.
- Xin mẫu/báo giá từ 3 vendor; ghi MOQ, lead time, lỗi in, phương án reprint.
- Viết unit economics bản đầu cho digital và gift.
- Admin: Products, Campaigns, Risks/Decisions.

**Cổng 2:** 5/7 người hoàn thành prototype không cần trợ giúp; mẫu physical scan ổn; unit economics gift có contribution giả định ≥100k.

## Phase 3 — Build MVP, tuần 5–8

### Tuần 5

- Build authentication và account linking.
- Build capsule, note và ảnh trước; voice chỉ làm nếu capacity còn.
- Viết privacy copy và cơ chế xóa dữ liệu.
- Ops tạo checklist order-to-delivery.

### Tuần 6

- Build permission để hai phía không xem nội dung trước reveal.
- Build QR token dùng một lần, expiry và sai cặp.
- Chốt vendor/mẫu packaging.
- Chuẩn bị 3 format content: reaction, “open when we meet”, behind the gift.

### Tuần 7

- Hoàn thiện reveal experience.
- Gắn analytics cho pair created, contribution added, activation, handshake và reveal.
- Test trên iOS/Android phổ biến và mạng chậm.
- In 15 bộ pilot: 10 dùng thử + 5 buffer.

### Tuần 8

- Chạy 10 dry run nội bộ/end-to-end.
- Fix lỗi blocker; đóng băng scope.
- Chuẩn bị consent cho việc dùng reaction video.
- Admin: KPI entry, launch gate và activity log.

**Cổng 3:** 10/10 dry run hoàn thành; sai cặp không unlock; không có lỗi permission; ops đóng gói đúng bằng SOP.

## Phase 4 — Pilot kín, tuần 9–10

### Tuần 9

- Onboard 10 cặp từng người một.
- Theo dõi chỗ họ chậm, hỏi support và bỏ dở.
- Ops ghi mọi lỗi đơn/mẫu.
- Designer phỏng vấn sau reveal trong 24 giờ.

### Tuần 10

- Sửa ba vấn đề lớn nhất, không mở feature mới.
- Biên tập reaction content có consent.
- Chốt offer paid pilot và landing page.
- Test thanh toán, attribution, email/message xác nhận.

**Cổng 4:** activation ≥70%; reveal completion trên các reveal đến hạn ≥60%; ít nhất 5/10 nói khoảnh khắc reveal đáng nhớ; không có data incident nghiêm trọng.

## Phase 5 — Paid pilot 60 đơn, tuần 11–14

### Tuần 11

- Mở bán mềm cho waitlist và người quen mở rộng.
- Giới hạn đơn theo năng lực fulfillment.
- Đăng 4–5 nội dung organic; chạy ngân sách nhỏ để học hook.

### Tuần 12

- Giữ creative thắng, dừng ad set vượt stop condition.
- Theo dõi CAC, conversion, COGS thật và support volume.
- Phỏng vấn cả người mua và người nhận.

### Tuần 13

- Tối ưu onboarding và copy ở bước rơi nhiều nhất.
- Test referral nhẹ sau reveal.
- Chuẩn bị content và cutoff cho dịp gần nhất.

### Tuần 14

- Đóng cohort ở 60 đơn hoặc khi chạm ngân sách trần.
- Đối soát doanh thu, variable cost, marketing và refund.
- Tổng hợp cohort KPI, không trộn với 10 cặp miễn phí.

**Cổng 5:** CAC ≤65k, contribution/gift ≥100k, activation ≥70%, reveal ≥60%, giao đúng hẹn ≥95%. Nếu hai chỉ số cốt lõi không đạt, iterate hoặc dừng thay vì scale.

## Phase 6 — Ổn định nền, tuần 15–18

### Tuần 15

- Viết postmortem paid pilot.
- Quyết định go / iterate / stop.
- Cập nhật giá, scope và positioning bằng decision log.

### Tuần 16

- Tự động hóa bước ops lặp lại nhiều nhất.
- Sửa tech debt ảnh hưởng privacy, reliability hoặc tốc độ support.
- Đánh giá liệu cần tuyển part-time/full-time.

### Tuần 17

- Tối ưu activation và referral.
- Chuẩn hóa content template và reporting.
- Bắt đầu discovery Reunion Box, chưa build.

### Tuần 18

- Test 10 người cho Reunion Box.
- Làm prototype vật lý rẻ.
- So sánh ý định mua với Unsent Letter trước khi chọn product #2.

**Cổng 6:** Only When We Meet vận hành ổn hai tuần liên tiếp và product #2 có evidence tốt hơn lựa chọn còn lại.

## Phase 7 — Sản phẩm thứ hai, tuần 19–23

### Tuần 19

- Chốt product #2 bằng decision note.
- Khóa promise, audience, price và scope pilot.

### Tuần 20–21

- Design/test flow và physical prototype.
- Chuẩn bị vendor, unit economics, support và analytics.

### Tuần 22

- Build phần dùng lại từ platform hiện có.
- Dry run 10 hành trình.

### Tuần 23

- Pilot 30 đơn hoặc cohort nhỏ phù hợp.
- Đo riêng KPI của product #2.

## Phase 8 — Review sáu tháng, tuần 24

- Xem sản phẩm, channel và occasion nào có tín hiệu tốt nhất.
- Tính thời gian thực tế của từng vai trò và bottleneck.
- Chốt tuyển dụng/quỹ freelance cho quý sau.
- Chọn một mục tiêu quý, một product build và một campaign chính.
- Archive ý tưởng không có next experiment rõ.

## Những việc kinh doanh hay bị quên

- Kiểm tra tên thương hiệu, domain và tài khoản mạng xã hội trước khi in số lượng lớn.
- Có chính sách đổi trả, quyền riêng tư, điều khoản nội dung người dùng và quy trình xóa dữ liệu.
- Lưu hóa đơn/chứng từ, tách tiền cá nhân và tiền dự án; trao đổi với người làm kế toán về hình thức kinh doanh phù hợp trước khi doanh thu tăng.
- Không hứa ngày giao nếu vendor và đơn vị vận chuyển chưa xác nhận cutoff.
- Xin consent riêng cho việc dùng ảnh/reaction của khách trong marketing.

