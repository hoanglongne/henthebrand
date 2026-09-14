"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  campaignInputSchema,
  campaignError,
  type CampaignResponse,
} from "@/lib/domain/live-campaigns";
export async function mutateCampaign(
  input: unknown,
): Promise<CampaignResponse> {
  const parsed = campaignInputSchema.safeParse(input);
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
    const { data, error } = await client.rpc("admin_campaign_mutate", {
      p_workspace: p.workspaceId,
      p_campaign: p.campaignId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message:
            "Chưa cài migration Campaigns. Chạy 202609170004_campaigns.sql trước.",
        };
      return {
        ok: false,
        message: campaignError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, campaignId: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
