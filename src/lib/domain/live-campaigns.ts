import { z } from "zod";
const nullableId = z.uuid().nullable();
const campaignFields = z
  .object({
    name: z.string().trim().min(1).max(200),
    product_id: nullableId,
    owner_id: nullableId,
    occasion: z.string().trim().min(1).max(200),
    channel: z.string().trim().min(1).max(200),
    launch_date: z.iso.date(),
    end_date: z.iso.date(),
    budget: z.number().int().min(0),
    target_orders: z.number().int().min(0),
    brief: z.string().trim().max(10000),
    stop_condition: z.string().trim().max(5000),
    brief_due: z.iso.date().nullable(),
    asset_due: z.iso.date().nullable(),
    postmortem_due: z.iso.date().nullable(),
    cutoff_date: z.iso.date().nullable(),
    support_note: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    if (v.end_date < v.launch_date)
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "Ngày kết thúc phải sau ngày mở bán.",
      });
    if (v.brief_due && v.brief_due > v.launch_date)
      ctx.addIssue({
        code: "custom",
        path: ["brief_due"],
        message: "Hạn brief không thể sau ngày mở campaign.",
      });
    if (v.asset_due && v.asset_due > v.launch_date)
      ctx.addIssue({
        code: "custom",
        path: ["asset_due"],
        message: "Hạn asset không thể sau ngày mở campaign.",
      });
    if (v.postmortem_due && v.postmortem_due < v.end_date)
      ctx.addIssue({
        code: "custom",
        path: ["postmortem_due"],
        message: "Postmortem cần nằm sau ngày kết thúc campaign.",
      });
  });
const variants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: campaignFields }),
  z.object({ operation: z.literal("update"), payload: campaignFields }),
  z.object({
    operation: z.literal("readiness_toggle"),
    payload: z.object({ id: z.uuid(), completed: z.boolean() }),
  }),
  z.object({
    operation: z.literal("launch"),
    payload: z.object({ reason: z.string().trim().max(2000).optional() }),
  }),
  z.object({ operation: z.literal("complete"), payload: z.object({}) }),
]);
export const campaignInputSchema = z
  .object({
    workspaceId: z.uuid(),
    campaignId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(variants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.campaignId ||
        !v.expected ||
        !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing campaign version" });
  });
export type CampaignCommand = z.infer<typeof variants>;
export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignResponse =
  | { ok: true; campaignId: string }
  | { ok: false; message: string; conflict?: boolean };
export function campaignError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    HEN_NOT_FOUND: "Không tìm thấy campaign hoặc mục liên quan.",
    HEN_CONFLICT:
      "Campaign vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
    HEN_CAMPAIGN_LOCKED:
      "Campaign đang chạy hoặc đã kết thúc. Không thể chỉnh sửa readiness.",
    HEN_CAMPAIGN_ALREADY_LIVE:
      "Đã có một campaign đang chạy. Kết thúc campaign đó trước.",
    HEN_CAMPAIGN_NOT_LIVE: "Campaign chưa chạy nên không thể kết thúc.",
    HEN_STAGE_FORBIDDEN: "Chỉ Founder được override khi chưa sẵn sàng.",
    HEN_STAGE_REASON_REQUIRED:
      "Cần ghi lý do override khi readiness chưa hoàn tất.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
