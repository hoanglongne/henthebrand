-- Dữ liệu mẫu để xem thử giao diện Products và Content Studio.
-- Mọi dòng đều có tiền tố "Mẫu · " để không lẫn với dữ liệu thật.
-- Chạy lại được nhiều lần (tự xoá bản mẫu cũ trước khi tạo mới).
-- Xoá sạch bằng: supabase/samples/sample_cleanup.sql
begin;
do $$
declare
 ws uuid;founder uuid;p_tet uuid;p_thiep uuid;p_anh uuid;p_vong uuid;camp uuid;
begin
 select id into ws from public.admin_workspaces order by created_at limit 1;
 if ws is null then raise exception 'Chưa có workspace nào trong database.';end if;
 select user_id into founder from public.admin_memberships
  where workspace_id=ws and 'founder'=any(roles) and active order by created_at limit 1;
 if founder is null then raise exception 'Workspace chưa có Founder đang hoạt động.';end if;

 -- Dọn bản mẫu cũ (con trước, cha sau).
 delete from public.admin_content_items where workspace_id=ws and title like 'Mẫu · %';
 delete from public.admin_campaign_readiness_items where workspace_id=ws and campaign_id in
  (select id from public.admin_campaigns where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_campaigns where workspace_id=ws and name like 'Mẫu · %';
 delete from public.admin_product_evidence where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_product_stage_changes where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 update public.admin_tasks set product_id=null where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_products where workspace_id=ws and name like 'Mẫu · %';

 -- Sản phẩm: mỗi dòng minh hoạ một trạng thái khác nhau của các tính năng mới.
 -- Không dùng stage discovery/design/build để khỏi đụng giới hạn "mỗi workspace một sản phẩm".
 insert into public.admin_products(workspace_id,name,slug,moment,audience,promise,stage,stage_since,impact_score,effort_score,sort_order)
 values
  (ws,'Mẫu · Hộp quà Tết gặp lại','mau-hop-qua-tet',
   'Ngày đầu tiên cả nhà ngồi lại sau một năm xa.','Người đi làm xa về quê ăn Tết',
   'Mở hộp ra là thấy cả năm vừa rồi của hai người.','idea',now()-interval '3 days',5,2,101),
  (ws,'Mẫu · Thiệp ghi âm 30 giây','mau-thiep-ghi-am',
   'Điều muốn nói nhưng không nói thành lời được.','Cặp đôi tặng quà kỷ niệm',
   'Ba mươi giây giọng thật, nghe lại được mãi.','ready_for_build',now()-interval '26 days',4,3,102),
  (ws,'Mẫu · Bộ ảnh in tức thì','mau-bo-anh-in',
   'Khoảnh khắc vừa chụp đã cầm được trên tay.','Nhóm bạn thân đi chơi xa',
   'Ảnh ra khỏi điện thoại, nằm trong túi áo.','idea',now()-interval '41 days',null,null,103),
  (ws,'Mẫu · Vòng tay đôi khắc tên','mau-vong-tay-doi',
   'Món đồ nhỏ đeo mỗi ngày để nhớ một người.','Cặp đôi yêu xa',
   'Hai chiếc vòng, một dòng chữ chỉ hai người hiểu.','pilot',now()-interval '9 days',3,3,104);
 select id into p_tet from public.admin_products where workspace_id=ws and slug='mau-hop-qua-tet';
 select id into p_thiep from public.admin_products where workspace_id=ws and slug='mau-thiep-ghi-am';
 select id into p_anh from public.admin_products where workspace_id=ws and slug='mau-bo-anh-in';
 select id into p_vong from public.admin_products where workspace_id=ws and slug='mau-vong-tay-doi';

 -- Bằng chứng: đủ để thẻ "Sẵn sàng đi tiếp?" và cột so sánh có số liệu khác nhau.
 insert into public.admin_product_evidence(workspace_id,product_id,kind,title,summary,source_url,observed_at,created_by)
 values
  (ws,p_tet,'Phỏng vấn','Mẫu · 8 cuộc phỏng vấn người về quê ăn Tết',
   'Bảy trên tám người nói món quà ý nghĩa nhất là thứ nhắc lại chuyện cũ, không phải thứ đắt tiền.',
   'https://example.com/mau-phong-van-tet',current_date-interval '9 days',founder),
  (ws,p_tet,'Usability test','Mẫu · Thử mở hộp với 5 người',
   'Bốn người mở sai thứ tự lớp giấy. Cần đánh số hoặc đổi cách gấp.',
   null,current_date-interval '4 days',founder),
  (ws,p_thiep,'Prototype','Mẫu · Bản thu thử 30 giây',
   'Chất lượng thu bằng điện thoại đủ dùng. Vấn đề là người tặng ngại thu lần đầu, cần gợi ý câu mở.',
   'https://example.com/mau-prototype-thiep',current_date-interval '30 days',founder),
  (ws,p_vong,'Ghi chú vận hành','Mẫu · Thời gian khắc tên thực tế',
   'Khắc một cặp mất 12 phút, không phải 5 phút như ước tính ban đầu.',
   null,current_date-interval '7 days',founder),
  (ws,p_vong,'Tài liệu thiết kế','Mẫu · Bản vẽ hai kích cỡ vòng',
   'Hai size cổ tay phủ được 85% người thử. Size thứ ba chưa cần làm.',
   'https://example.com/mau-ban-ve-vong',current_date-interval '15 days',founder),
  (ws,p_vong,'Phỏng vấn','Mẫu · Hỏi 6 cặp yêu xa về món đồ đeo hằng ngày',
   'Người ta đeo lâu khi món đồ đủ kín đáo để mặc đi làm được.',
   null,current_date-interval '20 days',founder);

 -- Lịch sử chuyển giai đoạn cho tab "Lịch sử giai đoạn".
 insert into public.admin_product_stage_changes(workspace_id,product_id,from_stage,to_stage,note,changed_by,created_at)
 values
  (ws,p_thiep,'idea','ready_for_build',
   'Mẫu · Prototype cho thấy chất lượng thu đủ dùng, chốt làm bản thật.',founder,now()-interval '26 days'),
  (ws,p_vong,'idea','ready_for_build',
   'Mẫu · Đã có bản vẽ hai size và báo giá khắc.',founder,now()-interval '24 days'),
  (ws,p_vong,'ready_for_build','pilot',
   'Mẫu · Làm 20 cặp đầu tiên bán thử cho nhóm nhỏ trước khi mở rộng.',founder,now()-interval '9 days');

 -- Một campaign sắp mở, cố tình thiếu nội dung để bật cảnh báo ở Content Studio.
 insert into public.admin_campaigns(workspace_id,name,product_id,owner_id,occasion,status,channel,
  launch_date,end_date,budget,target_orders,brief,stop_condition,brief_due,asset_due,postmortem_due,support_note)
 values(ws,'Mẫu · Tết gặp lại',p_tet,founder,'Tết','preparing','TikTok',
  current_date+6,current_date+21,6000000,60,
  'Kể chuyện những người về quê ăn Tết và thứ họ mang theo. Ba tuyến nội dung: chuyện thật, cận cảnh hộp quà, phản ứng lúc mở.',
  'Dừng nếu sau 7 ngày chi quá 3 triệu mà chưa có 10 đơn.',
  current_date+1,current_date+4,current_date+28,
  'Mẫu · Trực inbox 20h–22h mỗi tối, kịch bản trả lời để trong file chung.')
 returning id into camp;
 insert into public.admin_campaign_readiness_items(workspace_id,campaign_id,label,owner_role,completed,completed_at)
 values
  (ws,camp,'Product journey đã QA','Founder / Dev',true,now()-interval '2 days'),
  (ws,camp,'Tracking đã kiểm tra','Founder / Dev',true,now()-interval '2 days'),
  (ws,camp,'Asset cuối đã duyệt','Brand / Content',false,null),
  (ws,camp,'Tồn kho đủ target + buffer','Ops',true,now()-interval '1 day'),
  (ws,camp,'Cutoff giao hàng đã chốt','Ops',false,null),
  (ws,camp,'Support script & người trực','Ops',false,null),
  (ws,camp,'Ngân sách trần & điều kiện dừng','Founder / Dev',true,now()-interval '3 days');

 -- Nội dung: trải đều 7 cột pipeline, có cả bài đã đăng và bài chưa đặt lịch.
 insert into public.admin_content_items(workspace_id,title,hook,format,channel,status,owner_id,campaign_id,publish_date,asset_url,learning)
 values
  (ws,'Mẫu · Thứ mình mang về quê năm nay',
   'Năm ngoái mình mang về một vali. Năm nay chỉ một hộp nhỏ.',
   'Video ngắn','TikTok','Idea',founder,camp,null,null,''),
  (ws,'Mẫu · Ba câu hỏi trước khi chọn quà Tết',
   'Người nhận sẽ mở món quà này trước mặt ai?',
   'Carousel','Instagram','Script',founder,camp,current_date+4,null,''),
  (ws,'Mẫu · Cận cảnh lớp giấy gói',
   'Bốn trên năm người mở sai thứ tự. Đây là cách gấp mới.',
   'Behind the scenes','TikTok','Design/Edit',founder,null,current_date+5,null,''),
  (ws,'Mẫu · Phản ứng khi mở hộp lần đầu',
   'Không ai đoán được thứ nằm ở lớp cuối cùng.',
   'Reaction','TikTok','Review',founder,camp,current_date+2,null,''),
  (ws,'Mẫu · Đếm ngược 7 ngày tới Tết',
   'Còn bảy ngày để kịp gửi về nhà.',
   'Story','Instagram','Scheduled',founder,camp,current_date+7,
   'https://example.com/mau-asset-dem-nguoc',''),
  (ws,'Mẫu · Một năm của hai người, trong một hộp',
   'Mình giữ lại đúng mười hai thứ, mỗi tháng một thứ.',
   'Video ngắn','TikTok','Published',founder,null,current_date-3,
   'https://example.com/mau-asset-mot-nam',
   'Giữ được người xem tới giây 18. Đoạn mở bằng câu hỏi chạy tốt hơn đoạn mở bằng cảnh quay.'),
  (ws,'Mẫu · Vì sao mình bỏ ý tưởng hộp phát sáng',
   'Thử ba mẫu, cả ba đều hỏng sau hai tuần.',
   'Video ngắn','Facebook','Learned',founder,null,current_date-12,
   'https://example.com/mau-asset-hop-phat-sang',
   'Nội dung kể chuyện thất bại có lượt lưu cao gấp đôi bài giới thiệu sản phẩm. Nên làm thêm.'),
  (ws,'Mẫu · Bộ ảnh hậu trường xưởng khắc',
   'Mười hai phút cho một cặp vòng, làm bằng tay.',
   'Carousel','Landing','Idea',founder,null,null,null,'');
end $$;
commit;
