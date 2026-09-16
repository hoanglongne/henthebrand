"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  contentInputSchema,
  contentError,
  type ContentMutateResponse,
  type ContentDetails,
} from "@/lib/domain/live-content";
import { z } from "zod";
export async function mutateContent(
  input: unknown,
): Promise<ContentMutateResponse> {
  const parsed = contentInputSchema.safeParse(input);
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
    const { data, error } = await client.rpc("admin_content_mutate", {
      p_workspace: p.workspaceId,
      p_content: p.contentId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message:
            "Chưa cài migration Content Studio. Chạy 202609180005_content.sql trước.",
        };
      return {
        ok: false,
        message: contentError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, contentId: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
export async function readContentDetails(
  workspaceId: string,
  contentId: string,
): Promise<
  { ok: true; details: ContentDetails } | { ok: false; message: string }
> {
  if (
    !z.uuid().safeParse(workspaceId).success ||
    !z.uuid().safeParse(contentId).success ||
    !isConfigured()
  )
    return { ok: false, message: "Không thể mở nội dung." };
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { ok: false, message: "Cần đăng nhập lại." };
    const [checklist, comments] = await Promise.all([
      client
        .from("admin_content_checklist")
        .select("id,label,completed")
        .eq("workspace_id", workspaceId)
        .eq("content_id", contentId)
        .order("created_at")
        .limit(100),
      client
        .from("admin_content_comments")
        .select("id,body,author_id,created_at")
        .eq("workspace_id", workspaceId)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if ([checklist, comments].some((r) => r.error))
      return {
        ok: false,
        message:
          "Chưa tải được chi tiết. Kiểm tra migration Content Studio và thử lại.",
      };
    return {
      ok: true,
      details: {
        checklist: checklist.data ?? [],
        comments: comments.data ?? [],
      },
    };
  } catch {
    return { ok: false, message: "Kết nối bị gián đoạn. Vui lòng thử lại." };
  }
}
