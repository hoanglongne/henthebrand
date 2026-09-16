"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  workspaceInputSchema,
  memberInputSchema,
  settingsError,
  type SettingsResponse,
} from "@/lib/domain/live-settings";
const MIGRATION = "202609200007_members_settings.sql";
async function withClient(
  run: (
    client: Awaited<ReturnType<typeof createClient>>,
  ) => Promise<SettingsResponse>,
): Promise<SettingsResponse> {
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
    return await run(client);
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
function toResponse(
  error: { code?: string; message: string } | null,
  mode?: string,
): SettingsResponse {
  if (!error) return { ok: true, mode };
  if (error.code === "PGRST202")
    return {
      ok: false,
      message: `Chưa cài migration Settings. Chạy ${MIGRATION} trước.`,
    };
  return {
    ok: false,
    message: settingsError(error.message),
    conflict: error.message.includes("HEN_CONFLICT"),
  };
}
export async function updateWorkspaceSettings(
  input: unknown,
): Promise<SettingsResponse> {
  const parsed = workspaceInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  const p = parsed.data;
  return withClient(async (client) => {
    // RPC independently authenticates, authorizes and enforces all rules atomically.
    const { error } = await client.rpc("admin_workspace_update", {
      p_workspace: p.workspaceId,
      p_expected: p.expected,
      p_payload: p.payload,
    });
    if (!error) revalidatePath("/", "layout");
    return toResponse(error);
  });
}
export async function mutateMember(input: unknown): Promise<SettingsResponse> {
  const parsed = memberInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  const p = parsed.data;
  return withClient(async (client) => {
    const { data, error } = await client.rpc("admin_member_mutate", {
      p_workspace: p.workspaceId,
      p_target: p.targetId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (!error) revalidatePath("/", "layout");
    return toResponse(error, data?.mode);
  });
}
