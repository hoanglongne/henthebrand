# HẸN Admin — Product Brief

## Câu chuyện sản phẩm

HẸN sẽ có nhiều ý tưởng dễ thương, nhiều dịp bán hàng và rất nhiều việc nhỏ chạy song song. Vấn đề không phải thiếu ý tưởng. Vấn đề là đội nhỏ có thể bị kéo về mười hướng, launch trễ và không biết sản phẩm thất bại vì concept yếu hay vì vận hành kém.

HẸN Admin là “phòng điều khiển” của đội. Khi mở lên, mỗi người phải thấy ba thứ trong vài giây:

1. Việc quan trọng nhất của mình hôm nay.
2. Mốc launch nào đang có nguy cơ trễ.
3. Số liệu nào quyết định tiếp tục hay dừng sản phẩm.

## Người dùng

### Founder / Dev

Sở hữu roadmap, scope, hệ thống, analytics và quyết định cuối. Cần nhìn toàn cảnh mà không phải nhắn từng người hỏi tiến độ.

### Ops

Quản lý vendor, mẫu, tồn kho, đóng gói, đơn lỗi, hỗ trợ khách hàng và cutoff giao hàng. Cần biết campaign sắp tạo bao nhiêu áp lực vận hành.

### Product Designer

Quản lý research, flow, prototype và kết quả usability test. Cần nối mỗi thiết kế với insight và tiêu chí chấp nhận cụ thể.

### Brand / Content Designer

Quản lý identity, packaging, key visual, asset campaign và lịch nội dung. Cần một content pipeline có deadline rõ trước ngày launch.

Nếu chỉ có một designer, tài khoản đó có cả hai nhóm quyền Design; capacity được chia 60% product và 40% brand/content trong giai đoạn MVP.

## Trải nghiệm giao diện

Admin mang cảm giác như một studio sáng tạo đang chuẩn bị một món quà, không giống phần mềm kế toán.

- Nền kem ấm, navy đậm, đỏ coral, xanh cobalt và lime làm accent.
- Card lớn vừa phải, typography rõ, khoảng thở rộng.
- Timeline có các “moment” như Prototype Day, First Reveal, Paid Pilot thay vì chỉ toàn mã task.
- Trạng thái dùng lời tự nhiên: `Ý tưởng`, `Đang tìm hiểu`, `Đang thiết kế`, `Sẵn sàng build`, `Đang build`, `Pilot`, `Đang bán`, `Đã lưu bài học`.
- Không dùng gradient tím, glassmorphism, dashboard dày đặc card KPI hoặc icon trang trí vô nghĩa.

## Cấu trúc điều hướng

### 1. Home — Today at HẸN

Màn hình mở đầu có:

- Mission hiện tại: “Đưa Only When We Meet tới paid pilot 60 đơn.”
- Ba việc cần chú ý hôm nay: task quá hạn, blocker, approval đang chờ.
- Countdown tới mốc tiếp theo.
- Capacity của bốn vai trò trong sprint.
- Bốn KPI gate của MVP.
- Activity feed ngắn: quyết định, task hoàn thành, risk mới.

### 2. Timeline

Roadmap 24 tuần với ba tầng:

- Milestone: mục tiêu có ý nghĩa kinh doanh.
- Initiative: nhóm việc lớn như MVP build, pilot, Tết campaign.
- Task: đơn vị có owner, deadline và Definition of Done.

Cho phép xem theo tuần, lọc theo owner/workstream, kéo ngày nếu có quyền và hiển thị dependency. Khi dời một task có dependency, hệ thống cảnh báo các mốc bị ảnh hưởng; không tự động đổi tất cả ngày.

### 3. Work Board

Board theo trạng thái:

`Backlog → Ready → In progress → Review → Blocked → Done`

Mỗi task có:

- Tên hành động rõ ràng.
- Product hoặc campaign liên quan.
- Một owner dẫn dắt và một approver.
- Priority P0–P3.
- Effort theo point 1, 2, 3, 5, 8, 13.
- Start date, due date, dependency.
- Acceptance criteria / Definition of Done.
- Link thiết kế, tài liệu hoặc pull request.
- Checklist và comment.

WIP limit mặc định: tối đa 2 task `In progress` cho mỗi người.

### 4. Products

Portfolio gồm:

- Only When We Meet
- Reunion Box
- One Photo Only
- Relationship Achievements
- Our Lore
- The Last Night
- Friendship Side Quest
- Our Map
- Unsent Letter
- Future Us

Mỗi product page có: moment, audience, promise, giá giả định, stage, evidence, experiments, risks, unit economics, linked tasks/campaigns và decision history.

Chỉ Founder được chuyển product sang `Build`, `Pilot`, `Live` hoặc `Archived`. Việc chuyển stage phải kèm một decision note.

### 5. Campaigns

Calendar theo tháng và danh sách campaign. Mỗi campaign có:

- Product và occasion.
- Brief due, asset due, launch, end, postmortem due.
- Channel, budget, target orders và KPI.
- Asset checklist.
- Fulfillment readiness.
- Content items liên quan.

Launch gate chỉ xanh khi product, tracking, asset, tồn kho và support script đều sẵn sàng.

### 6. Content Studio

Pipeline:

`Idea → Script → Design/Edit → Review → Scheduled → Published → Learned`

Mỗi content item có hook, format, product, campaign, owner, publish date, file/link, views, saves, comments có ý định mua và bài học. Không cần tích hợp đăng TikTok trong MVP.

### 7. Operations

- Vendor và thông tin liên hệ.
- SKU / packaging component.
- Sample status.
- Tồn kho hiện tại, buffer và reorder point.
- Order issue log.
- SLA giao đúng hẹn.
- Checklist đóng gói theo sản phẩm.

MVP không cần thay thế hệ thống quản lý đơn hàng. Ops chỉ cần nhập số tổng hợp và ghi sự cố.

### 8. Experiments & KPI

Experiment nối với một giả thuyết và một quyết định. Ví dụ:

> Nếu 10 cặp dùng thử, ít nhất 7 cặp sẽ hoàn thành activation và ít nhất 6/10 reveal đến hạn sẽ được mở thành công.

Theo dõi landing visits, paid orders, CVR, pairs started, activation, reveals due/completed, revenue, variable cost, marketing spend, CAC, contribution/gift, on-time delivery và data incidents.

### 9. Risks & Decisions

Risk log có xác suất, ảnh hưởng, owner, tín hiệu sớm và cách giảm rủi ro. Decision log ghi ngày, quyết định, dữ liệu, lựa chọn khác, lý do và ngày review lại.

Đây là hai module nhỏ nhưng bắt buộc. Sáu tháng sau đội phải hiểu vì sao mình đã chọn QR trước NFC hoặc vì sao một sản phẩm bị dừng.

## Phạm vi MVP admin

Phải có trong bản đầu:

- Đăng nhập và workspace duy nhất.
- Home.
- Timeline.
- Work Board và task detail.
- Products.
- Campaigns.
- Experiments/KPI nhập tay.
- Risks/Decisions.
- Role-based access và activity log.

Để sau:

- TikTok publishing.
- Đồng bộ đơn hàng tự động.
- Chat thời gian thực.
- Gantt auto-scheduling phức tạp.
- AI tự động ưu tiên công việc.
- Multi-company / billing / public signup.

## Tiêu chí thành công của admin

- Mỗi thành viên cập nhật task trong dưới 2 phút/ngày.
- Founder chuẩn bị weekly review trong dưới 10 phút.
- Không có P0 task thiếu owner hoặc Definition of Done.
- Mọi launch đều có checklist readiness.
- Mọi product chuyển stage đều có evidence hoặc decision note.
- Sau bốn tuần, đội vẫn dùng admin mà không cần nhắc liên tục.

