import { z } from "zod";
const nullableId = z.uuid().nullable();
const httpsUrl = z
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//.test(v));
const contentFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    hook: z.string().trim().max(2000),
    format: z.enum([
      "Video ngắn",
      "Carousel",
      "Reaction",
      "Behind the scenes",
      "Story",
    ]),
    channel: z.enum(["TikTok", "Instagram", "Facebook", "Landing"]),
    status: z.enum([
      "Idea",
      "Script",
      "Design/Edit",
      "Review",
      "Scheduled",
      "Published",
      "Learned",
    ]),
    owner_id: nullableId,
    campaign_id: nullableId,
    publish_date: z.iso.date().nullable(),
    asset_url: z.union([httpsUrl, z.literal(null)]),
    learning: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    if (
      ["Scheduled", "Published", "Learned"].includes(v.status) &&
      (!v.publish_date || !v.asset_url)
    )
      ctx.addIssue({
        code: "custom",
        message: "Cần ngày đăng và link asset trước khi lên lịch hoặc xuất bản.",
      });
  });
const variants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: contentFields }),
  z.object({ operation: z.literal("update"), payload: contentFields }),
]);
export const contentInputSchema = z
  .object({
    workspaceId: z.uuid(),
    contentId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(variants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.contentId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing content version" });
  });
export type ContentCommand = z.infer<typeof variants>;
export type ContentInput = z.infer<typeof contentInputSchema>;
export type ContentMutateResponse =
  | { ok: true; contentId: string }
  | { ok: false; message: string; conflict?: boolean };
export function contentError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    HEN_NOT_FOUND: "Không tìm thấy nội dung.",
    HEN_CONFLICT:
      "Nội dung vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
