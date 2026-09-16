-- Xoá toàn bộ dữ liệu mẫu do sample_products_content.sql tạo ra.
-- Chỉ đụng tới các dòng có tiền tố "Mẫu · "; dữ liệu thật giữ nguyên.
begin;
do $$
declare ws uuid;begin
 select id into ws from public.admin_workspaces order by created_at limit 1;
 if ws is null then return;end if;
 delete from public.admin_content_items where workspace_id=ws and title like 'Mẫu · %';
 delete from public.admin_campaign_readiness_items where workspace_id=ws and campaign_id in
  (select id from public.admin_campaigns where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_campaigns where workspace_id=ws and name like 'Mẫu · %';
 delete from public.admin_product_evidence where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_product_stage_changes where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 -- Task thật lỡ gắn vào sản phẩm mẫu sẽ được gỡ liên kết, không bị xoá.
 update public.admin_tasks set product_id=null where workspace_id=ws and product_id in
  (select id from public.admin_products where workspace_id=ws and name like 'Mẫu · %');
 delete from public.admin_products where workspace_id=ws and name like 'Mẫu · %';
end $$;
commit;
