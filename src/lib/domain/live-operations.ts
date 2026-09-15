import { z } from "zod";
const stockFields = z
  .object({
    name: z.string().trim().min(1).max(200),
    code: z.string().trim().min(1).max(50),
    category: z.enum(["Thành phẩm", "Bao bì", "Phụ kiện"]),
    on_hand: z.number().int().min(0),
    reserved: z.number().int().min(0),
    buffer: z.number().int().min(0),
    reorder: z.number().int().min(0),
    cost: z.number().int().min(0),
  })
  .superRefine((v, ctx) => {
    if (v.reserved > v.on_hand)
      ctx.addIssue({
        code: "custom",
        path: ["reserved"],
        message: "Số đã giữ không thể lớn hơn tồn thực tế.",
      });
  });
const stockVariants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: stockFields }),
  z.object({ operation: z.literal("update"), payload: stockFields }),
]);
export const stockInputSchema = z
  .object({
    workspaceId: z.uuid(),
    stockId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(stockVariants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.stockId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing stock version" });
  });
export type StockCommand = z.infer<typeof stockVariants>;
const vendorFields = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  contact: z.string().trim().min(1).max(300),
  lead_time_days: z.number().int().min(0),
  moq: z.number().int().min(1),
  sample_status: z.enum([
    "Chưa đặt mẫu",
    "Đang chờ mẫu",
    "Cần chỉnh mẫu",
    "Đã duyệt mẫu",
  ]),
  note: z.string().trim().max(2000),
});
const vendorVariants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: vendorFields }),
  z.object({ operation: z.literal("update"), payload: vendorFields }),
]);
export const vendorInputSchema = z
  .object({
    workspaceId: z.uuid(),
    vendorId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(vendorVariants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.vendorId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing vendor version" });
  });
export type VendorCommand = z.infer<typeof vendorVariants>;
const issueFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    external_ref: z.string().trim().min(1).max(100),
    severity: z.enum(["Thấp", "Trung bình", "Cao"]),
    status: z.enum(["Mới ghi nhận", "Đang xử lý", "Đã xử lý"]),
    owner_id: z.uuid().nullable(),
    resolution: z.string().trim().max(3000),
  })
  .superRefine((v, ctx) => {
    if (v.status === "Đã xử lý" && !v.resolution)
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "Ghi cách giải quyết trước khi đóng sự cố.",
      });
  });
const issueVariants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: issueFields }),
  z.object({ operation: z.literal("update"), payload: issueFields }),
]);
export const issueInputSchema = z
  .object({
    workspaceId: z.uuid(),
    issueId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(issueVariants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.issueId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing issue version" });
  });
export type IssueCommand = z.infer<typeof issueVariants>;
export type OperationsResponse =
  | { ok: true; id: string }
  | { ok: false; message: string; conflict?: boolean };
export function operationsError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Chỉ Founder hoặc Ops được chỉnh dữ liệu vận hành.",
    HEN_NOT_FOUND: "Không tìm thấy mục vận hành.",
    HEN_CONFLICT:
      "Mục vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
