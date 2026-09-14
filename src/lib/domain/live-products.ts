import { z } from "zod";
const productFields = z.object({
  name: z.string().trim().min(1).max(200),
  moment: z.string().trim().max(2000),
  audience: z.string().trim().max(2000),
  promise: z.string().trim().max(2000),
});
const httpsUrl = z
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//.test(v));
const variants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: productFields }),
  z.object({ operation: z.literal("update"), payload: productFields }),
  z.object({
    operation: z.literal("stage_change"),
    payload: z.object({
      stage: z.enum([
        "idea",
        "discovery",
        "design",
        "ready_for_build",
        "build",
        "pilot",
        "live",
        "learned",
        "archived",
      ]),
      note: z.string().trim().min(1).max(2000),
      readiness_confirmed: z.boolean().optional(),
    }),
  }),
  z.object({
    operation: z.literal("evidence_add"),
    payload: z.object({
      kind: z.enum([
        "Phỏng vấn",
        "Prototype",
        "Usability test",
        "Tài liệu thiết kế",
        "Ghi chú vận hành",
      ]),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().min(1).max(5000),
      source_url: z.union([httpsUrl, z.literal("")]).optional(),
      observed_at: z.iso.date(),
    }),
  }),
  z.object({
    operation: z.literal("evidence_remove"),
    payload: z.object({ id: z.uuid() }),
  }),
]);
export const productInputSchema = z
  .object({
    workspaceId: z.uuid(),
    productId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(variants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.productId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing product version" });
  });
export type ProductCommand = z.infer<typeof variants>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductDetails = {
  evidence: {
    id: string;
    kind: string;
    title: string;
    summary: string;
    source_url: string | null;
    observed_at: string;
  }[];
  stageChanges: {
    id: string;
    from_stage: string;
    to_stage: string;
    note: string;
    changed_by: string;
    created_at: string;
  }[];
};
export type ProductResponse =
  | { ok: true; productId: string }
  | { ok: false; message: string; conflict?: boolean };
export function productError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    HEN_NOT_FOUND: "Không tìm thấy sản phẩm hoặc mục liên quan.",
    HEN_CONFLICT:
      "Sản phẩm vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
    HEN_INVALID_STAGE: "Giai đoạn không hợp lệ.",
    HEN_STAGE_REASON_REQUIRED: "Cần ghi lý do khi chuyển giai đoạn.",
    HEN_STAGE_READINESS_REQUIRED:
      "Cần xác nhận đã kiểm tra trải nghiệm và readiness vận hành trước khi chuyển Pilot/Live.",
    HEN_STAGE_FORBIDDEN:
      "Chỉ Founder được chuyển sản phẩm sang Build, Pilot, Live, Learned hoặc Archived.",
    HEN_STAGE_BUILD_LIMIT:
      "Đã có một sản phẩm đang Build. Hoàn tất hoặc đổi giai đoạn sản phẩm đó trước.",
    HEN_STAGE_DISCOVERY_LIMIT:
      "Đội đang có một sản phẩm ở Discovery/Design. Giữ một sản phẩm trong giai đoạn này.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
