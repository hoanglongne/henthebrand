"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  milestoneInputSchema,
  milestoneError,
  type MilestoneResponse,
} from "@/lib/domain/live-timeline";
export async function mutateMilestone(
  input: unknown,
): Promise<MilestoneResponse> {
  const parsed = milestoneInputSchema.safeParse(input);
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
    const { data, error } = await client.rpc("admin_milestone_mutate", {
      p_workspace: p.workspaceId,
      p_milestone: p.milestoneId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message:
            "Chưa cài migration Timeline. Chạy 202609160003_products_timeline.sql trước.",
        };
      return {
        ok: false,
        message: milestoneError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, milestoneId: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
