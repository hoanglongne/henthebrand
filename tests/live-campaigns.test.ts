import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { campaignInputSchema } from "../src/lib/domain/live-campaigns";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const ops = "90000000-0000-4000-8000-000000000002";
const brand = "90000000-0000-4000-8000-000000000003";
const designer = "90000000-0000-4000-8000-000000000004";
let db: PGlite;
type Row = { id: string; updated_at: string; status: string };
const fields = {
  name: "Campaign thật",
  product_id: null,
  owner_id: null,
  occasion: "Pilot",
  channel: "TikTok",
  launch_date: "2026-10-01",
  end_date: "2026-10-15",
  budget: 5000000,
  target_orders: 50,
  brief: "Kế hoạch mở bán",
  stop_condition: "Dừng nếu vượt ngân sách",
  brief_due: null,
  asset_due: null,
  postmortem_due: null,
  cutoff_date: null,
  support_note: "",
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function call(
  campaign: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ campaign: Row }>(
    "select public.admin_campaign_mutate($1,$2,$3,$4,$5::jsonb) as campaign",
    [
      ws,
      campaign?.id ?? null,
      campaign?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].campaign;
}
async function create() {
  return call(null, "create", fields);
}
async function completeReadiness(id: string) {
  const items = await db.query<{ id: string }>(
    "select id from admin_campaign_readiness_items where campaign_id=$1",
    [id],
  );
  let c: Row = (
    await db.query<Row>(
      "select id,updated_at::text,status from admin_campaigns where id=$1",
      [id],
    )
  ).rows[0];
  for (const item of items.rows)
    c = await call(c, "readiness_toggle", { id: item.id, completed: true });
  return c;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${ops}','ops@example.com',now()),('${brand}','brand@example.com',now()),('${designer}','designer@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609170004_campaigns.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${ops}','Ops','{ops}'),('${ws}','${brand}','Brand','{brand_designer}'),('${ws}','${designer}','Designer','{product_designer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("denies roles outside founder/ops/brand_designer", async () => {
  await login(designer);
  await expect(create()).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("rejects direct table writes even for Founder", async () => {
  await expect(
    db.exec("update admin_campaigns set name='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("seeds a 7-item readiness checklist and audit log, rejects stale versions", async () => {
  const c = await create();
  expect(c.status).toBe("draft");
  const items = await db.query(
    "select id from admin_campaign_readiness_items where campaign_id=$1",
    [c.id],
  );
  expect(items.rows).toHaveLength(7);
  const edited = await call(c, "update", { ...fields, name: "Đổi tên" });
  expect(edited.updated_at).not.toBe(c.updated_at);
  await expect(call(c, "update", fields)).rejects.toThrow("HEN_CONFLICT");
  expect(
    (await db.query("select * from admin_activity_log where entity_id=$1", [c.id]))
      .rows,
  ).toHaveLength(2);
});
it("requires Founder override with a reason before launching when not ready", async () => {
  let c = await create();
  await login(brand);
  await expect(call(c, "launch", {})).rejects.toThrow("HEN_STAGE_FORBIDDEN");
  await login(founder);
  await expect(call(c, "launch", {})).rejects.toThrow(
    "HEN_STAGE_REASON_REQUIRED",
  );
  c = await call(c, "launch", { reason: "Chấp nhận rủi ro để test pilot" });
  expect(c.status).toBe("live");
  c = await call(c, "complete", {});
  expect(c.status).toBe("complete");
});
it("lets Ops launch once readiness is complete, but not Brand", async () => {
  const c = await completeReadiness((await create()).id);
  await login(brand);
  await expect(call(c, "launch", {})).rejects.toThrow("HEN_FORBIDDEN");
  await login(ops);
  const live = await call(c, "launch", {});
  expect(live.status).toBe("live");
  await login(founder);
  await call(live, "complete", {});
});
it("blocks a second campaign from launching while one is live and locks readiness once live", async () => {
  const first = await completeReadiness((await create()).id);
  const live = await call(first, "launch", {});
  const second = await completeReadiness((await create()).id);
  await expect(call(second, "launch", {})).rejects.toThrow(
    "HEN_CAMPAIGN_ALREADY_LIVE",
  );
  const items = await db.query<{ id: string }>(
    "select id from admin_campaign_readiness_items where campaign_id=$1",
    [live.id],
  );
  await expect(
    call(live, "readiness_toggle", { id: items.rows[0].id, completed: false }),
  ).rejects.toThrow("HEN_CAMPAIGN_LOCKED");
  await call(live, "complete", {});
});
it("rejects completing a campaign that is not live", async () => {
  const c = await create();
  await expect(call(c, "complete", {})).rejects.toThrow(
    "HEN_CAMPAIGN_NOT_LIVE",
  );
});
it("rejects invalid date ranges before the server action", () => {
  expect(
    campaignInputSchema.safeParse({
      workspaceId: ws,
      campaignId: null,
      expected: null,
      operation: "create",
      payload: { ...fields, end_date: "2026-09-01" },
    }).success,
  ).toBe(false);
  expect(
    campaignInputSchema.safeParse({
      workspaceId: ws,
      campaignId: null,
      expected: null,
      operation: "create",
      payload: fields,
    }).success,
  ).toBe(true);
});
it("isolates campaigns across workspaces", async () => {
  await login(founder);
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_campaigns(workspace_id,name,occasion,channel,launch_date,end_date) values($1,'Private','x','TikTok','2026-10-01','2026-10-02') returning id,updated_at::text,status",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  await expect(call(other, "update", fields)).rejects.toThrow("HEN_NOT_FOUND");
});
