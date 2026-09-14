"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  workInputSchema,
  workError,
  type WorkResponse,
  type WorkDetails,
} from "@/lib/domain/live-work";
import { z } from "zod";
export async function mutateWork(input: unknown): Promise<WorkResponse> {
  const parsed = workInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  if (!isConfigured()) return { ok: false, message: "Chưa kết nối Supabase." };
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return {
        ok: false,
        message: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
      };
    const p = parsed.data;
    // RPC independently authenticates, authorizes and enforces all rules atomically.
    const { data, error } = await client.rpc("admin_work_mutate", {
      p_workspace: p.workspaceId,
      p_task: p.taskId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message:
            "Chưa cài migration Work. Chạy 202609150002_work_system.sql trước.",
        };
      return {
        ok: false,
        message: workError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, taskId: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
export async function readWorkDetails(
  workspaceId: string,
  taskId: string,
): Promise<
  { ok: true; details: WorkDetails } | { ok: false; message: string }
> {
  if (
    !z.uuid().safeParse(workspaceId).success ||
    !z.uuid().safeParse(taskId).success ||
    !isConfigured()
  )
    return { ok: false, message: "Không thể mở công việc." };
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { ok: false, message: "Cần đăng nhập lại." };
    const { data: task, error } = await client
      .from("admin_tasks")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", taskId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !task)
      return {
        ok: false,
        message: "Không tìm thấy công việc hoặc bạn chưa có quyền truy cập.",
      };
    const [checklist, links, comments, deps] = await Promise.all([
      client
        .from("admin_task_checklist")
        .select("id,label,completed")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .order("created_at")
        .limit(200),
      client
        .from("admin_task_links")
        .select("id,label,url")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .order("created_at")
        .limit(200),
      client
        .from("admin_task_comments")
        .select("id,body,author_id,created_at")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("admin_task_dependencies")
        .select("depends_on_task_id")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .limit(200),
    ]);
    if ([checklist, links, comments, deps].some((r) => r.error))
      return {
        ok: false,
        message: "Chưa tải được chi tiết. Kiểm tra migration Work và thử lại.",
      };
    return {
      ok: true,
      details: {
        checklist: checklist.data ?? [],
        links: links.data ?? [],
        comments: comments.data ?? [],
        dependencies: (deps.data ?? []).map((d) => d.depends_on_task_id),
      },
    };
  } catch {
    return { ok: false, message: "Kết nối bị gián đoạn. Vui lòng thử lại." };
  }
}
