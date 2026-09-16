import { z } from "zod";
export const systemRoleKeys = [
  "founder",
  "ops",
  "product_designer",
  "brand_designer",
  "viewer",
] as const;
export type SystemRole = (typeof systemRoleKeys)[number];
const roleList = z.array(z.enum(systemRoleKeys)).min(1).max(5);
const capacity = z.number().int().min(0).max(100);
const displayName = z.string().trim().min(1).max(100);
export const workspaceInputSchema = z.object({
  workspaceId: z.uuid(),
  expected: z.string(),
  payload: z.object({
    name: z.string().trim().min(1).max(120),
    start_date: z.iso.date(),
  }),
});
const memberVariants = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("invite"),
    payload: z.object({
      email: z.email().max(200),
      display_name: displayName,
      roles: roleList,
      capacity_percent: capacity,
    }),
  }),
  z.object({
    operation: z.literal("update"),
    payload: z.object({
      display_name: displayName,
      roles: roleList,
      capacity_percent: capacity,
      active: z.boolean(),
    }),
  }),
  z.object({
    operation: z.literal("pending_update"),
    payload: z.object({
      display_name: displayName,
      roles: roleList,
      capacity_percent: capacity,
    }),
  }),
  z.object({ operation: z.literal("pending_remove"), payload: z.object({}) }),
]);
export const memberInputSchema = z
  .object({
    workspaceId: z.uuid(),
    targetId: z.uuid().nullable(),
    expected: z.string().nullable(),
  })
  .and(memberVariants)
  .superRefine((v, ctx) => {
    if (v.operation !== "invite" && !v.targetId)
      ctx.addIssue({ code: "custom", message: "Missing member target" });
    if (
      (v.operation === "update" || v.operation === "pending_update") &&
      (!v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing member version" });
  });
export type MemberCommand = z.infer<typeof memberVariants>;
export type SettingsResponse =
  | { ok: true; mode?: string }
  | { ok: false; message: string; conflict?: boolean };
export function settingsError(message: string): string {
  const known: Record<string, string> = {
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Chỉ Founder được chỉnh workspace và phân quyền.",
    HEN_NOT_FOUND: "Không tìm thấy thành viên hoặc lời mời.",
    HEN_CONFLICT:
      "Dữ liệu vừa được người khác cập nhật. Tải lại trước khi sửa tiếp.",
    HEN_INVALID_ROLES: "Vai trò không hợp lệ.",
    HEN_MEMBER_EXISTS: "Người này đã là thành viên của workspace.",
    HEN_INVITE_EXISTS: "Email này đã có trong danh sách chờ.",
    HEN_LAST_FOUNDER:
      "Workspace phải còn ít nhất một Founder đang hoạt động. Gán Founder cho người khác trước.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
