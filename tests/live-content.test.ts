import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { contentInputSchema } from "../src/lib/domain/live-content";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const brand = "90000000-0000-4000-8000-000000000002";
const designer = "90000000-0000-4000-8000-000000000003";
let db: PGlite;
type Row = { id: string; updated_at: string; status: string };
const fields = {
  title: "Nội dung thật",
  hook: "Một câu mở đầu",
  format: "Video ngắn",
  channel: "TikTok",
  status: "Idea",
  owner_id: null,
  campaign_id: null,
  publish_date: null,
  asset_url: null,
  learning: "",
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function call(
  item: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ item: Row }>(
    "select public.admin_content_mutate($1,$2,$3,$4,$5::jsonb) as item",
    [
      ws,
      item?.id ?? null,
      item?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].item;
}
async function create(payload: object = fields) {
  return call(null, "create", payload);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${brand}','brand@example.com',now()),('${designer}','designer@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609170004_campaigns.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609180005_content.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${brand}','Brand','{brand_designer}'),('${ws}','${designer}','Designer','{product_designer}');grant usage on schema auth to authenticated;set role authenticated;`,
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
    db.exec("update admin_content_items set title='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("creates and updates content, logs audit, rejects stale versions", async () => {
  await login(brand);
  const item = await create();
  expect(item.status).toBe("Idea");
  const edited = await call(item, "update", { ...fields, title: "Đổi tên" });
  expect(edited.updated_at).not.toBe(item.updated_at);
  await expect(call(item, "update", fields)).rejects.toThrow("HEN_CONFLICT");
  expect(
    (await db.query("select * from admin_activity_log where entity_id=$1", [
      item.id,
    ])).rows,
  ).toHaveLength(2);
  await login(founder);
});
it("enforces publish date and asset url before Scheduled/Published/Learned", async () => {
  await expect(
    db.query(
      "select public.admin_content_mutate($1,null,null,'create',$2::jsonb)",
      [ws, JSON.stringify({ ...fields, status: "Scheduled" })],
    ),
  ).rejects.toThrow();
  const scheduled = await create({
    ...fields,
    status: "Scheduled",
    publish_date: "2026-11-01",
    asset_url: "https://example.com/post",
  });
  expect(scheduled.status).toBe("Scheduled");
});
it("rejects unsafe asset URLs before the server action", () => {
  expect(
    contentInputSchema.safeParse({
      workspaceId: ws,
      contentId: null,
      expected: null,
      operation: "create",
      payload: { ...fields, asset_url: "javascript:alert(1)" },
    }).success,
  ).toBe(false);
  expect(
    contentInputSchema.safeParse({
      workspaceId: ws,
      contentId: null,
      expected: null,
      operation: "create",
      payload: fields,
    }).success,
  ).toBe(true);
  expect(
    contentInputSchema.safeParse({
      workspaceId: ws,
      contentId: null,
      expected: null,
      operation: "create",
      payload: { ...fields, status: "Published", publish_date: null },
    }).success,
  ).toBe(false);
});
it("isolates content across workspaces", async () => {
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_content_items(workspace_id,title,format,channel) values($1,'Private','Story','TikTok') returning id,updated_at::text,status",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  await expect(call(other, "update", fields)).rejects.toThrow("HEN_NOT_FOUND");
});
