import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { memberInputSchema } from "../src/lib/domain/live-settings";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const ops = "90000000-0000-4000-8000-000000000002";
const newcomer = "90000000-0000-4000-8000-000000000003";
let db: PGlite;
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function member(
  target: string | null,
  expected: string | null,
  operation: string,
  payload: object,
) {
  const r = await db.query<{ result: Record<string, unknown> }>(
    "select public.admin_member_mutate($1,$2,$3,$4,$5::jsonb) as result",
    [ws, target, expected, operation, JSON.stringify(payload)],
  );
  return r.rows[0].result;
}
async function membershipRow(userId: string) {
  const r = await db.query<{
    user_id: string;
    roles: string[];
    active: boolean;
    updated_at: string;
    display_name: string;
  }>(
    "select user_id,roles,active,updated_at::text,display_name from admin_memberships where workspace_id=$1 and user_id=$2",
    [ws, userId],
  );
  return r.rows[0];
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${ops}','ops@example.com',now()),('${newcomer}','moi@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609200007_members_settings.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${ops}','Ops','{ops}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("lets only Founder manage members and workspace settings", async () => {
  await login(ops);
  await expect(
    member(null, null, "invite", {
      email: "x@example.com",
      display_name: "X",
      roles: ["viewer"],
      capacity_percent: 100,
    }),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await expect(
    db.query("select public.admin_workspace_update($1,now(),$2::jsonb)", [
      ws,
      JSON.stringify({ name: "Hack", start_date: "2026-09-15" }),
    ]),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("adds an existing auth user straight into the workspace", async () => {
  const result = await member(null, null, "invite", {
    email: "MOI@example.com",
    display_name: "Người mới",
    roles: ["product_designer"],
    capacity_percent: 60,
  });
  expect(result.mode).toBe("member");
  const row = await membershipRow(newcomer);
  expect(row.roles).toEqual(["product_designer"]);
  expect(row.active).toBe(true);
  await expect(
    member(null, null, "invite", {
      email: "moi@example.com",
      display_name: "Trùng",
      roles: ["viewer"],
      capacity_percent: 100,
    }),
  ).rejects.toThrow("HEN_MEMBER_EXISTS");
});
it("holds a role for someone without an account until they first log in", async () => {
  const result = await member(null, null, "invite", {
    email: "chua-co@example.com",
    display_name: "Chưa có tài khoản",
    roles: ["brand_designer"],
    capacity_percent: 50,
  });
  expect(result.mode).toBe("pending");
  await expect(
    member(null, null, "invite", {
      email: "chua-co@example.com",
      display_name: "Lặp",
      roles: ["viewer"],
      capacity_percent: 100,
    }),
  ).rejects.toThrow("HEN_INVITE_EXISTS");
  await db.exec("reset role");
  await db.query("insert into auth.users values($1,'chua-co@example.com',now())", [
    "90000000-0000-4000-8000-000000000004",
  ]);
  await db.exec("set role authenticated");
  await login("90000000-0000-4000-8000-000000000004");
  const claimed = await db.query<{ claim: Record<string, unknown> }>(
    "select public.admin_claim_membership() as claim",
  );
  expect(claimed.rows[0].claim.mode).toBe("claimed");
  const row = await membershipRow("90000000-0000-4000-8000-000000000004");
  expect(row.roles).toEqual(["brand_designer"]);
  expect(
    (await db.query("select id from admin_pending_members where email=$1", [
      "chua-co@example.com",
    ])).rows,
  ).toHaveLength(0);
  await login(founder);
});
it("rejects stale versions and keeps at least one active Founder", async () => {
  const row = await membershipRow(newcomer);
  await member(newcomer, row.updated_at, "update", {
    display_name: "Người mới",
    roles: ["ops"],
    capacity_percent: 80,
    active: true,
  });
  await expect(
    member(newcomer, row.updated_at, "update", {
      display_name: "Người mới",
      roles: ["viewer"],
      capacity_percent: 80,
      active: true,
    }),
  ).rejects.toThrow("HEN_CONFLICT");
  const self = await membershipRow(founder);
  await expect(
    member(founder, self.updated_at, "update", {
      display_name: "Founder",
      roles: ["viewer"],
      capacity_percent: 100,
      active: true,
    }),
  ).rejects.toThrow("HEN_LAST_FOUNDER");
  expect((await membershipRow(founder)).roles).toEqual(["founder"]);
});
it("updates workspace name and start date for Founder", async () => {
  const before = await db.query<{ updated_at: string }>(
    "select updated_at::text from admin_workspaces where id=$1",
    [ws],
  );
  await db.query("select public.admin_workspace_update($1,$2,$3::jsonb)", [
    ws,
    before.rows[0].updated_at,
    JSON.stringify({ name: "HẸN Studio", start_date: "2026-09-22" }),
  ]);
  const after = await db.query<{ name: string; start_date: string }>(
    "select name,start_date::text from admin_workspaces where id=$1",
    [ws],
  );
  expect(after.rows[0].name).toBe("HẸN Studio");
  expect(after.rows[0].start_date).toBe("2026-09-22");
});
it("rejects malformed member commands before the server action", () => {
  expect(
    memberInputSchema.safeParse({
      workspaceId: ws,
      targetId: null,
      expected: null,
      operation: "invite",
      payload: {
        email: "khong-phai-email",
        display_name: "X",
        roles: ["viewer"],
        capacity_percent: 100,
      },
    }).success,
  ).toBe(false);
  expect(
    memberInputSchema.safeParse({
      workspaceId: ws,
      targetId: null,
      expected: null,
      operation: "invite",
      payload: {
        email: "ok@example.com",
        display_name: "X",
        roles: ["viewer", "ops"],
        capacity_percent: 100,
      },
    }).success,
  ).toBe(true);
  expect(
    memberInputSchema.safeParse({
      workspaceId: ws,
      targetId: founder,
      expected: null,
      operation: "update",
      payload: {
        display_name: "X",
        roles: [],
        capacity_percent: 100,
        active: true,
      },
    }).success,
  ).toBe(false);
});
