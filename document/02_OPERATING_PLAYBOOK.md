# HẸN — Operating Playbook

## Một nguyên tắc để giữ cả dự án tỉnh táo

Đội không thiếu việc. Đội thiếu sự tập trung. Vì vậy:

- 1 product đang build.
- 1 product đang design/discovery.
- 1 campaign chính đang chạy.
- 2 task đang làm tối đa cho mỗi người.
- Task không có owner hoặc Definition of Done không được vào `Ready`.

## Workflow của một task

### Backlog

Ý tưởng hoặc yêu cầu vừa xuất hiện. Chỉ cần ghi vấn đề, product/campaign và người đề xuất. Backlog không phải cam kết sẽ làm.

### Ready

Task đã có owner, approver, deadline, effort, dependency và Definition of Done. Founder chọn task vào sprint dựa trên milestone, không dựa vào ai nhắn lớn tiếng nhất.

### In progress

Owner đang thực sự làm. Nếu phải dừng hơn một ngày, chuyển sang `Blocked` hoặc về `Ready`; không để task giả vờ đang chạy.

### Review

Output đã có link và approver biết chính xác cần kiểm gì. Review quá 2 ngày trở thành blocker.

### Blocked

Ghi blocker, người có thể gỡ và ngày kiểm tra lại. Thứ Hai và thứ Sáu luôn review cột này trước.

### Done

Acceptance criteria đạt, link output có trong task và những người phụ thuộc đã được thông báo.

## Workflow của một sản phẩm

1. **Idea:** moment và người mua được mô tả trong một câu.
2. **Discovery:** tối thiểu 5 cuộc test hoặc một experiment có dữ liệu.
3. **Design:** flow/prototype có success metric.
4. **Ready for Build:** scope được khóa; acceptance criteria và dependency rõ.
5. **Build:** chỉ một product ở stage này.
6. **Pilot:** cohort, tracking, support và tiêu chí dừng đã sẵn sàng.
7. **Live:** fulfillment và economics nằm trong ngưỡng.
8. **Learned / Archived:** decision note ghi rõ vì sao dừng hoặc khi nào xem lại.

## Nhịp làm việc nhẹ nhưng đủ chặt

### Hàng ngày — async 5 phút

Mỗi người cập nhật ba dòng trong admin:

- Hôm qua đã đưa output nào tiến lên?
- Hôm nay sẽ hoàn tất việc gì?
- Có gì đang chặn và cần ai?

Không cần daily meeting nếu không có blocker cần nói trực tiếp.

### Thứ Hai — Weekly Focus, 30 phút

1. Đọc milestone sắp tới và countdown.
2. Xử lý blocker trước.
3. Kiểm tra WIP limit và capacity.
4. Chọn tối đa ba kết quả của tuần cho cả đội.
5. Đưa task đủ chuẩn vào Ready/In progress.

### Thứ Tư — Product/Creative Review, 20 phút

Chỉ họp khi có prototype, visual hoặc output cần quyết định. Người trình bày phải đưa link và câu hỏi trước cuộc họp.

### Thứ Sáu — Demo & Decision, 45 phút

1. Demo output, không đọc danh sách task.
2. Cập nhật KPI.
3. Xem task trễ và risk mới.
4. Chốt decision note nếu thay scope, giá, timeline hoặc product stage.
5. Ghi ba bài học để tuần sau hành động khác đi.

### Mỗi bốn tuần — Portfolio Review, 60 phút

Mỗi sản phẩm chỉ nhận một trong bốn quyết định:

- Tiếp tục theo kế hoạch.
- Lặp lại experiment vì chưa đủ bằng chứng.
- Park tới một trigger/ngày cụ thể.
- Dừng và lưu bài học.

## Definition of Ready

Một task chỉ được vào sprint khi có đủ:

- Vấn đề hoặc outcome.
- Owner và approver.
- Due date.
- Effort.
- Acceptance criteria.
- Dependency/link đầu vào.

## Definition of Done theo loại việc

### Dev

Acceptance criteria đạt, trạng thái loading/error/empty có xử lý, quyền truy cập đúng, event analytics cần thiết hoạt động và output đã deploy lên preview hoặc production theo yêu cầu.

### Design

Có link source, responsive states, component/state cần thiết, copy cuối và review với người implement. Packaging phải có file in, kích thước, bleed và scan test mẫu.

### Ops

SOP được một người khác chạy thử, vendor/lead time/cost được ghi, exception path rõ và owner support biết cách xử lý.

### Campaign

Brief, asset, tracking, landing/CTA, ngân sách, cutoff fulfillment, support script và postmortem date đều có.

## Launch gate

Một campaign không được chuyển sang `Live` nếu một trong các mục sau chưa xanh:

- Product journey đã QA.
- Analytics/attribution đã test.
- Asset cuối đã duyệt.
- Tồn kho hoặc capacity đủ cho target + buffer.
- Cutoff giao hàng rõ.
- Support script và owner trực đã có.
- KPI, ngân sách trần và stop condition đã ghi.

Founder có thể override nhưng phải tạo decision note nêu rõ rủi ro được chấp nhận.

