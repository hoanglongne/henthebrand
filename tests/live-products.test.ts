import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { productInputSchema } from "../src/lib/domain/live-products";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const designer = "90000000-0000-4000-8000-000000000002";
const viewer = "90000000-0000-4000-8000-000000000003";
const discoveryProduct = "20000000-0000-4000-8000-000000000001";
const ideaProduct = "20000000-0000-4000-8000-000000000002";
let db: PGlite;
type Row = {
  id: string;
  updated_at: string;
  stage: string;
  stage_since?: string;
  impact_score?: number;
};
const fields = {
  name: "Sản phẩm thật",
  moment: "Một khoảnh khắc",
  audience: "Cặp đôi",
  promise: "Lời hứa",
  owner_id: null,
  impact_score: 4,
  effort_score: 2,
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function call(
  product: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ product: Row }>(
    "select public.admin_product_mutate($1,$2,$3,$4,$5::jsonb) as product",
    [
      ws,
      product?.id ?? null,
      product?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].product;
}
async function create() {
  return call(null, "create", fields);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${designer}','designer@example.com',now()),('${viewer}','viewer@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609160003_products_timeline.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609210008_product_insights.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${designer}','Designer','{product_designer}'),('${ws}','${viewer}','Viewer','{viewer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("denies viewers", async () => {
  await login(viewer);
  await expect(create()).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("rejects direct table writes even for Founder", async () => {
  await expect(
    db.exec("update admin_products set name='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("creates a product with a deduped slug and audit log, rejects stale versions", async () => {
  const p = await create();
  expect(p.stage).toBe("idea");
  const dup = await create();
  const rows = await db.query<{ slug: string }>(
    "select slug from admin_products where id in ($1,$2)",
    [p.id, dup.id],
  );
  expect(new Set(rows.rows.map((r) => r.slug)).size).toBe(2);
  const edited = await call(p, "update", { ...fields, name: "Đổi tên" });
  expect(edited.updated_at).not.toBe(p.updated_at);
  await expect(call(p, "update", fields)).rejects.toThrow("HEN_CONFLICT");
  expect(
    (await db.query("select * from admin_activity_log where entity_id=$1", [p.id]))
      .rows,
  ).toHaveLength(2);
});
it("requires a reason for stage changes and blocks privileged stages for non-Founders", async () => {
  let p = await create();
  await login(designer);
  await expect(
    call(p, "stage_change", { stage: "ready_for_build", note: "" }),
  ).rejects.toThrow("HEN_STAGE_REASON_REQUIRED");
  p = await call(p, "stage_change", {
    stage: "ready_for_build",
    note: "Đã phỏng vấn xong",
  });
  expect(p.stage).toBe("ready_for_build");
  await expect(
    call(p, "stage_change", { stage: "build", note: "Sẵn sàng" }),
  ).rejects.toThrow("HEN_STAGE_FORBIDDEN");
  await login(founder);
});
it("blocks a second product entering Build or Discovery/Design", async () => {
  await login(founder);
  let p = await create();
  p = await call(p, "stage_change", { stage: "build", note: "Đi build" });
  expect(p.stage).toBe("build");
  const existingDiscovery = await db.query<Row>(
    "select id,updated_at::text,stage from admin_products where id=$1",
    [discoveryProduct],
  );
  await expect(
    call(existingDiscovery.rows[0], "stage_change", {
      stage: "build",
      note: "Đi build",
    }),
  ).rejects.toThrow("HEN_STAGE_BUILD_LIMIT");
  const second = await create();
  await expect(
    call(second, "stage_change", { stage: "discovery", note: "Ý tưởng khác" }),
  ).rejects.toThrow("HEN_STAGE_DISCOVERY_LIMIT");
});
it("stamps stage_since and keeps the impact/effort score", async () => {
  await login(founder);
  const p = await create();
  expect(p.impact_score).toBe(4);
  const before = (
    await db.query<{ stage_since: string }>(
      "select stage_since::text from admin_products where id=$1",
      [p.id],
    )
  ).rows[0].stage_since;
  const moved = await call(p, "stage_change", {
    stage: "ready_for_build",
    note: "Đi tiếp",
  });
  const after = (
    await db.query<{ stage_since: string }>(
      "select stage_since::text from admin_products where id=$1",
      [moved.id],
    )
  ).rows[0].stage_since;
  expect(after).not.toBe(before);
});
it("requires readiness confirmation before Pilot or Live", async () => {
  let p = await create();
  await expect(
    call(p, "stage_change", { stage: "pilot", note: "Ra mắt" }),
  ).rejects.toThrow("HEN_STAGE_READINESS_REQUIRED");
  p = await call(p, "stage_change", {
    stage: "pilot",
    note: "Ra mắt",
    readiness_confirmed: true,
  });
  expect(p.stage).toBe("pilot");
});
it("adds and removes evidence scoped to the product", async () => {
  const idea = await db.query<Row>(
    "select id,updated_at::text,stage from admin_products where id=$1",
    [ideaProduct],
  );
  const p = idea.rows[0];
  await call(p, "evidence_add", {
    kind: "Phỏng vấn",
    title: "Insight #1",
    summary: "Người dùng muốn X",
    source_url: "https://example.com/notes",
    observed_at: "2026-09-10",
  });
  const rows = await db.query<{ id: string }>(
    "select id from admin_product_evidence where product_id=$1",
    [p.id],
  );
  expect(rows.rows).toHaveLength(1);
  const refreshed = await db.query<Row>(
    "select id,updated_at::text,stage from admin_products where id=$1",
    [p.id],
  );
  await expect(
    call(refreshed.rows[0], "evidence_remove", {
      id: crypto.randomUUID(),
    }),
  ).rejects.toThrow("HEN_NOT_FOUND");
  await call(refreshed.rows[0], "evidence_remove", { id: rows.rows[0].id });
  expect(
    (
      await db.query("select id from admin_product_evidence where product_id=$1", [
        p.id,
      ])
    ).rows,
  ).toHaveLength(0);
});
it("rejects unsafe URLs and malformed commands before the server action", () => {
  expect(
    productInputSchema.safeParse({
      workspaceId: ws,
      productId: null,
      expected: null,
      operation: "evidence_add",
      payload: {
        kind: "Phỏng vấn",
        title: "X",
        summary: "Y",
        source_url: "javascript:alert(1)",
        observed_at: "2026-09-10",
      },
    }).success,
  ).toBe(false);
  expect(
    productInputSchema.safeParse({
      workspaceId: ws,
      productId: null,
      expected: null,
      operation: "create",
      payload: fields,
    }).success,
  ).toBe(true);
});
it("isolates products across workspaces", async () => {
  await login(founder);
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_products(workspace_id,name,slug) values($1,'Private','private') returning id,updated_at::text,stage",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  await expect(call(other, "update", fields)).rejects.toThrow("HEN_NOT_FOUND");
});
