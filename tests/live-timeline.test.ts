import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { milestoneInputSchema } from "../src/lib/domain/live-timeline";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const ops = "90000000-0000-4000-8000-000000000002";
const designer = "90000000-0000-4000-8000-000000000003";
let db: PGlite;
type Row = { id: string; updated_at: string; name: string };
const fields = {
  name: "Mốc thật",
  description: "Kết quả cần đạt",
  start_week: 1,
  end_week: 2,
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function call(
  milestone: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ milestone: Row }>(
    "select public.admin_milestone_mutate($1,$2,$3,$4,$5::jsonb) as milestone",
    [
      ws,
      milestone?.id ?? null,
      milestone?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].milestone;
}
async function create() {
  return call(null, "create", fields);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${ops}','ops@example.com',now()),('${designer}','designer@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609160003_products_timeline.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${ops}','Ops','{ops}'),('${ws}','${designer}','Designer','{product_designer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("denies non-planner roles", async () => {
  await login(designer);
  await expect(create()).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("rejects direct table writes even for Founder", async () => {
  await expect(
    db.exec("update admin_milestones set name='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("allows Ops to create, update and delete, rejecting stale versions", async () => {
  await login(ops);
  const m = await create();
  const edited = await call(m, "update", { ...fields, name: "Đổi tên mốc" });
  expect(edited.updated_at).not.toBe(m.updated_at);
  await expect(call(m, "update", fields)).rejects.toThrow("HEN_CONFLICT");
  const deleted = await db.query<{ deleted: boolean }>(
    "select (public.admin_milestone_mutate($1,$2,$3,'delete','{}'::jsonb)->>'deleted')::boolean as deleted",
    [ws, edited.id, edited.updated_at],
  );
  expect(deleted.rows[0].deleted).toBe(true);
  expect(
    (await db.query("select * from admin_milestones where id=$1", [edited.id]))
      .rows,
  ).toHaveLength(0);
  await login(founder);
});
it("rejects duplicate names and week ranges beyond the 24-week board", async () => {
  const m = await create();
  await expect(
    call(null, "create", { ...fields, name: m.name }),
  ).rejects.toThrow("HEN_NAME_TAKEN");
  await expect(
    call(null, "create", { ...fields, start_week: 20, end_week: 26 }),
  ).rejects.toThrow();
});
it("rejects malformed commands before the server action", () => {
  expect(
    milestoneInputSchema.safeParse({
      workspaceId: ws,
      milestoneId: null,
      expected: null,
      operation: "create",
      payload: { ...fields, end_week: 0 },
    }).success,
  ).toBe(false);
  expect(
    milestoneInputSchema.safeParse({
      workspaceId: ws,
      milestoneId: null,
      expected: null,
      operation: "create",
      payload: fields,
    }).success,
  ).toBe(true);
});
it("isolates milestones across workspaces", async () => {
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_milestones(workspace_id,name,start_week,end_week) values($1,'Private',1,2) returning id,updated_at::text,name",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  await expect(call(other, "update", fields)).rejects.toThrow("HEN_NOT_FOUND");
});
