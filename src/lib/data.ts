import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "./supabase/server";
import { preview } from "./seed";
import type { Snapshot, Task } from "./domain/types";
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  if (!isConfigured()) return preview;
  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: membership, error: membershipError } = await client
    .from("admin_memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (membershipError)
    throw new Error(
      "Không thể đọc quyền workspace. Kiểm tra migration và kết nối.",
    );
  if (!membership) redirect("/login?error=membership");
  const workspace = membership.workspace_id;
  const { data: workVersion } = await client.rpc("admin_work_version");
  const { data: catalogVersion } = await client.rpc("admin_catalog_version");
  const results = await Promise.all([
    client.from("admin_workspaces").select("*").eq("id", workspace).single(),
    (async () => {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const result = await client
          .from("admin_tasks")
          .select("*")
          .eq("workspace_id", workspace)
          .is("deleted_at", null)
          .order("id")
          .range(offset, offset + 499);
        if (result.error) return result;
        rows.push(...result.data);
        if (result.data.length < 500) break;
      }
      rows.sort((a, b) =>
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
      );
      return { data: rows, error: null };
    })(),
    client
      .from("admin_products")
      .select("*")
      .eq("workspace_id", workspace)
      .order("sort_order"),
    client
      .from("admin_milestones")
      .select("*")
      .eq("workspace_id", workspace)
      .order("start_week"),
    client
      .from("admin_memberships")
      .select("*")
      .eq("workspace_id", workspace)
      .eq("active", true),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Không thể tải dữ liệu HẸN. Vui lòng thử lại.");
  const [ws, tasks, products, milestones, members] = results;
  return {
    mode: "connected",
    workspaceId: workspace,
    userId: user.id,
    workReady: workVersion === 1,
    catalogReady: catalogVersion === 1,
    name: ws.data.name,
    startDate: ws.data.start_date,
    roles: membership.roles,
    tasks: (tasks.data ?? []).map((t) => ({
      ...t,
      due_date: t.due_date ?? "",
      owner:
        members.data?.find((m) => m.user_id === t.owner_id)?.display_name ??
        "Chưa phân công",
      product:
        products.data?.find((p) => p.id === t.product_id)?.name ??
        "Chưa gắn sản phẩm",
    })) as Task[],
    products: products.data ?? [],
    milestones: milestones.data ?? [],
    members: (members.data ?? []).map((m) => ({
      id: m.user_id,
      roles: m.roles,
      name: m.display_name,
      role: m.roles.join(" · "),
      capacity: m.capacity_percent,
    })),
  };
});
