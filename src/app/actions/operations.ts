"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  stockInputSchema,
  vendorInputSchema,
  issueInputSchema,
  operationsError,
  type OperationsResponse,
} from "@/lib/domain/live-operations";
async function callRpc(
  fn: string,
  params: Record<string, unknown>,
  migrationHint: string,
): Promise<OperationsResponse> {
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
    // RPC independently authenticates, authorizes and enforces all rules atomically.
    const { data, error } = await client.rpc(fn, params);
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message: `Chưa cài migration Operations. Chạy ${migrationHint} trước.`,
        };
      return {
        ok: false,
        message: operationsError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, id: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
const MIGRATION = "202609190006_operations.sql";
export async function mutateStock(input: unknown): Promise<OperationsResponse> {
  const parsed = stockInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  const p = parsed.data;
  return callRpc(
    "admin_stock_mutate",
    {
      p_workspace: p.workspaceId,
      p_stock: p.stockId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    },
    MIGRATION,
  );
}
export async function mutateVendor(
  input: unknown,
): Promise<OperationsResponse> {
  const parsed = vendorInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  const p = parsed.data;
  return callRpc(
    "admin_vendor_mutate",
    {
      p_workspace: p.workspaceId,
      p_vendor: p.vendorId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    },
    MIGRATION,
  );
}
export async function mutateIssue(input: unknown): Promise<OperationsResponse> {
  const parsed = issueInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Kiểm tra lại các trường trong form.",
    };
  const p = parsed.data;
  return callRpc(
    "admin_issue_mutate",
    {
      p_workspace: p.workspaceId,
      p_issue: p.issueId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    },
    MIGRATION,
  );
}
