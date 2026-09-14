"use server";
import { revalidatePath } from "next/cache";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  productInputSchema,
  productError,
  type ProductResponse,
  type ProductDetails,
} from "@/lib/domain/live-products";
import { z } from "zod";
export async function mutateProduct(input: unknown): Promise<ProductResponse> {
  const parsed = productInputSchema.safeParse(input);
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
    const { data, error } = await client.rpc("admin_product_mutate", {
      p_workspace: p.workspaceId,
      p_product: p.productId,
      p_expected: p.expected,
      p_operation: p.operation,
      p_payload: p.payload,
    });
    if (error) {
      if (error.code === "PGRST202")
        return {
          ok: false,
          message:
            "Chưa cài migration Products. Chạy 202609160003_products_timeline.sql trước.",
        };
      return {
        ok: false,
        message: productError(error.message),
        conflict: error.message.includes("HEN_CONFLICT"),
      };
    }
    revalidatePath("/", "layout");
    return { ok: true, productId: data.id };
  } catch {
    return {
      ok: false,
      message:
        "Kết nối bị gián đoạn. Tải lại dữ liệu để kiểm tra thao tác đã được lưu chưa trước khi thử lại.",
    };
  }
}
export async function readProductDetails(
  workspaceId: string,
  productId: string,
): Promise<
  { ok: true; details: ProductDetails } | { ok: false; message: string }
> {
  if (
    !z.uuid().safeParse(workspaceId).success ||
    !z.uuid().safeParse(productId).success ||
    !isConfigured()
  )
    return { ok: false, message: "Không thể mở sản phẩm." };
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { ok: false, message: "Cần đăng nhập lại." };
    const { data: product, error } = await client
      .from("admin_products")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", productId)
      .maybeSingle();
    if (error || !product)
      return {
        ok: false,
        message: "Không tìm thấy sản phẩm hoặc bạn chưa có quyền truy cập.",
      };
    const [evidence, stageChanges] = await Promise.all([
      client
        .from("admin_product_evidence")
        .select("id,kind,title,summary,source_url,observed_at")
        .eq("workspace_id", workspaceId)
        .eq("product_id", productId)
        .order("observed_at", { ascending: false })
        .limit(200),
      client
        .from("admin_product_stage_changes")
        .select("id,from_stage,to_stage,note,changed_by,created_at")
        .eq("workspace_id", workspaceId)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if ([evidence, stageChanges].some((r) => r.error))
      return {
        ok: false,
        message:
          "Chưa tải được chi tiết. Kiểm tra migration Products và thử lại.",
      };
    return {
      ok: true,
      details: {
        evidence: evidence.data ?? [],
        stageChanges: stageChanges.data ?? [],
      },
    };
  } catch {
    return { ok: false, message: "Kết nối bị gián đoạn. Vui lòng thử lại." };
  }
}
