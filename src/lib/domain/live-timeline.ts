import { z } from "zod";
const milestoneFields = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  start_week: z.number().int().min(1).max(24),
  end_week: z.number().int().min(1).max(24),
});
const variants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: milestoneFields }),
  z.object({ operation: z.literal("update"), payload: milestoneFields }),
  z.object({ operation: z.literal("delete"), payload: z.object({}) }),
]);
export const milestoneInputSchema = z
  .object({
    workspaceId: z.uuid(),
    milestoneId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(variants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.milestoneId ||
        !v.expected ||
        !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing milestone version" });
    if (
      v.operation !== "delete" &&
      "payload" in v &&
      "end_week" in v.payload &&
      v.payload.end_week < v.payload.start_week
    )
      ctx.addIssue({
        code: "custom",
        message: "Tuần kết thúc phải bằng hoặc sau tuần bắt đầu.",
      });
  });
export type MilestoneCommand = z.infer<typeof variants>;
export type MilestoneInput = z.infer<typeof milestoneInputSchema>;
export type MilestoneResponse =
  | { ok: true; milestoneId: string }
  | { ok: false; message: string; conflict?: boolean };
export function milestoneError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Chỉ Founder hoặc Ops được chỉnh mốc hành trình.",
    HEN_NOT_FOUND: "Không tìm thấy mốc hành trình.",
    HEN_CONFLICT:
      "Mốc vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
    HEN_NAME_TAKEN: "Đã có mốc khác dùng tên này.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
