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
  const read = async () =>
    client
      .from("admin_memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
  const first = await read();
  let membership = first.data;
  if (first.error)
    throw new Error(
      "Không thể đọc quyền workspace. Kiểm tra migration và kết nối.",
    );
  if (!membership) {
    // Người đã được Founder mời trước sẽ nhận vai trò ngay ở lần đăng nhập đầu.
    const { data: claimed } = await client.rpc("admin_claim_membership");
    if (claimed?.mode === "claimed") ({ data: membership } = await read());
  }
  if (!membership) redirect("/login?error=membership");
  const workspace = membership.workspace_id;
  const { data: workVersion } = await client.rpc("admin_work_version");
  const { data: catalogVersion } = await client.rpc("admin_catalog_version");
  const { data: campaignVersion } = await client.rpc("admin_campaign_version");
  const { data: contentVersion } = await client.rpc("admin_content_version");
  const { data: operationsVersion } = await client.rpc(
    "admin_operations_version",
  );
  const { data: settingsVersion } = await client.rpc("admin_settings_version");
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
    client.from("admin_memberships").select("*").eq("workspace_id", workspace),
    client
      .from("admin_campaigns")
      .select("*")
      .eq("workspace_id", workspace)
      .order("launch_date"),
    client
      .from("admin_campaign_readiness_items")
      .select("*")
      .eq("workspace_id", workspace)
      .order("created_at"),
    client
      .from("admin_content_items")
      .select("*")
      .eq("workspace_id", workspace)
      .order("created_at", { ascending: false }),
    client
      .from("admin_stock_items")
      .select("*")
      .eq("workspace_id", workspace)
      .order("name"),
    client
      .from("admin_vendors")
      .select("*")
      .eq("workspace_id", workspace)
      .order("name"),
    client
      .from("admin_order_issues")
      .select("*")
      .eq("workspace_id", workspace)
      .order("created_at", { ascending: false }),
    // RLS chỉ trả danh sách chờ cho Founder; role khác nhận mảng rỗng.
    client
      .from("admin_pending_members")
      .select("*")
      .eq("workspace_id", workspace)
      .order("created_at"),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Không thể tải dữ liệu HẸN. Vui lòng thử lại.");
  const [
    ws,
    tasks,
    products,
    milestones,
    members,
    campaigns,
    readiness,
    content,
    stock,
    vendors,
    issues,
    pending,
  ] = results;
  return {
    mode: "connected",
    workspaceId: workspace,
    userId: user.id,
    workReady: workVersion === 1,
    catalogReady: catalogVersion === 1,
    campaignsReady: campaignVersion === 1,
    contentReady: contentVersion === 1,
    operationsReady: operationsVersion === 1,
    settingsReady: settingsVersion === 1,
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
    campaigns: (campaigns.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      occasion: c.occasion,
      product:
        products.data?.find((p) => p.id === c.product_id)?.name ??
        "Chưa gắn sản phẩm",
      product_id: c.product_id,
      status: c.status,
      channel: c.channel,
      owner:
        members.data?.find((m) => m.user_id === c.owner_id)?.display_name ??
        "Chưa phân công",
      owner_id: c.owner_id,
      launch: c.launch_date,
      end: c.end_date,
      budget: c.budget,
      orders: c.target_orders,
      brief: c.brief,
      stop: c.stop_condition,
      briefDue: c.brief_due ?? undefined,
      assetDue: c.asset_due ?? undefined,
      postmortemDue: c.postmortem_due ?? undefined,
      cutoff: c.cutoff_date ?? undefined,
      support: c.support_note,
      updated_at: c.updated_at,
      readiness: (readiness.data ?? [])
        .filter((r) => r.campaign_id === c.id)
        .map((r) => ({
          id: r.id,
          label: r.label,
          owner: r.owner_role,
          done: r.completed,
        })),
    })),
    content: (content.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      hook: c.hook,
      format: c.format,
      channel: c.channel,
      status: c.status,
      owner:
        members.data?.find((m) => m.user_id === c.owner_id)?.display_name ??
        "Chưa phân công",
      owner_id: c.owner_id,
      publish: c.publish_date ?? "",
      campaign: c.campaign_id ?? "",
      url: c.asset_url ?? "",
      learning: c.learning,
      updated_at: c.updated_at,
    })),
    stock: (stock.data ?? []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      onHand: s.on_hand,
      reserved: s.reserved,
      buffer: s.buffer,
      reorder: s.reorder,
      cost: s.cost,
      updated_at: s.updated_at,
    })),
    vendors: (vendors.data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      contact: v.contact,
      lead: v.lead_time_days,
      moq: v.moq,
      sample: v.sample_status,
      note: v.note,
      updated_at: v.updated_at,
    })),
    issues: (issues.data ?? []).map((i) => ({
      id: i.id,
      ref: i.external_ref,
      title: i.title,
      severity: i.severity,
      owner:
        members.data?.find((m) => m.user_id === i.owner_id)?.display_name ??
        "Chưa phân công",
      owner_id: i.owner_id,
      status: i.status,
      resolution: i.resolution,
      updated_at: i.updated_at,
    })),
    members: (members.data ?? []).map((m) => ({
      id: m.user_id,
      roles: m.roles,
      name: m.display_name,
      role: m.roles.join(" · "),
      capacity: m.capacity_percent,
      active: m.active,
      updated_at: m.updated_at,
    })),
    pendingMembers: (pending.data ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      name: p.display_name,
      roles: p.roles,
      capacity: p.capacity_percent,
      updated_at: p.updated_at,
    })),
    workspaceUpdatedAt: ws.data.updated_at,
  };
});
