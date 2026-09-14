import { z } from "zod";
import { statuses } from "./types";
const nullableId = z.uuid().nullable();
const fields = z.object({
  title: z.string().trim().min(1).max(200),
  owner_id: nullableId,
  approver_id: nullableId,
  product_id: nullableId,
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  effort: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
    z.literal(8),
    z.literal(13),
  ]),
  due_date: z.iso.date().nullable(),
  definition_of_done: z.string().trim().max(10000),
  workstream: z.enum(["Product", "Dev", "Brand", "Operations"]),
});
const reason = z.string().trim().max(2000).optional();
const variants = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), payload: fields }),
  z.object({
    operation: z.literal("update"),
    payload: fields.extend({ reason }),
  }),
  z.object({
    operation: z.literal("transition"),
    payload: z.object({ status: z.enum(statuses), reason }),
  }),
  z.object({
    operation: z.literal("checklist_add"),
    payload: z.object({ label: z.string().trim().min(1).max(500) }),
  }),
  z.object({
    operation: z.literal("checklist_toggle"),
    payload: z.object({ id: z.uuid(), completed: z.boolean() }),
  }),
  z.object({
    operation: z.literal("link_add"),
    payload: z.object({
      label: z.string().trim().min(1).max(200),
      url: z
        .url()
        .max(2048)
        .refine((v) => /^https?:\/\//.test(v)),
    }),
  }),
  z.object({
    operation: z.literal("link_remove"),
    payload: z.object({ id: z.uuid() }),
  }),
  z.object({
    operation: z.literal("dependency_add"),
    payload: z.object({ id: z.uuid() }),
  }),
  z.object({
    operation: z.literal("dependency_remove"),
    payload: z.object({ id: z.uuid() }),
  }),
  z.object({
    operation: z.literal("comment_add"),
    payload: z.object({ body: z.string().trim().min(1).max(5000) }),
  }),
]);
export const workInputSchema = z
  .object({
    workspaceId: z.uuid(),
    taskId: nullableId,
    expected: z.string().nullable(),
  })
  .and(variants)
  .superRefine((v, ctx) => {
    if (
      v.operation !== "create" &&
      (!v.taskId || !v.expected || !Number.isFinite(Date.parse(v.expected)))
    )
      ctx.addIssue({ code: "custom", message: "Missing task version" });
  });
export type WorkCommand = z.infer<typeof variants>;
export type WorkInput = z.infer<typeof workInputSchema>;
export type WorkDetails = {
  checklist: { id: string; label: string; completed: boolean }[];
  links: { id: string; label: string; url: string }[];
  comments: {
    id: string;
    body: string;
    author_id: string;
    created_at: string;
  }[];
  dependencies: string[];
};
export type WorkResponse =
  | { ok: true; taskId: string }
  | { ok: false; message: string; conflict?: boolean };
export function workError(message: string): string {
  const known: Record<string, string> = {
    HEN_READY_REQUIRED:
      "Cần người phụ trách, người duyệt, hạn hoàn thành, effort và Definition of Done trước khi chuyển trạng thái.",
    HEN_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
    HEN_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    HEN_NOT_FOUND: "Không tìm thấy công việc hoặc mục liên quan.",
    HEN_CONFLICT:
      "Công việc vừa được người khác cập nhật. Tải lại dữ liệu trước khi sửa tiếp.",
    HEN_ASSIGNMENT_FORBIDDEN:
      "Chỉ Founder được đổi owner hoặc approver của công việc đã tạo.",
    HEN_INVALID_OWNER:
      "Owner phải là thành viên đang hoạt động, có quyền làm việc.",
    HEN_INVALID_APPROVER:
      "Approver phải là thành viên đang hoạt động, có quyền làm việc.",
    HEN_WIP_LIMIT:
      "Owner đã có 2 công việc đang làm. Chỉ Founder được override kèm lý do.",
    HEN_DEPENDENCY_CYCLE:
      "Dependency này tạo vòng lặp. Hãy chọn công việc khác.",
    HEN_DEPENDENCY_BLOCKED:
      "Dependency P0 chưa hoàn tất. Xử lý công việc phụ thuộc trước.",
    HEN_REVIEW_REQUIRED: "Công việc cần qua Review trước khi được duyệt Done.",
    HEN_OUTPUT_REQUIRED: "Gắn link output trước khi gửi Review hoặc hoàn tất.",
    HEN_CHECKLIST_REQUIRED: "Hoàn tất checklist trước khi duyệt Done.",
    HEN_BLOCK_REASON: "Cần ghi lý do khi chuyển sang Blocked.",
    HEN_DONE_LOCKED: "Mở lại công việc trước khi chỉnh sửa nội dung đã Done.",
  };
  const key = Object.keys(known).find((key) => message.includes(key));
  return key
    ? known[key]
    : "Không lưu được dữ liệu. Kiểm tra các trường bắt buộc, quyền truy cập và thử lại.";
}
