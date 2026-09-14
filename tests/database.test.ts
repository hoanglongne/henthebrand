import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const a = "90000000-0000-4000-8000-000000000001";
const b = "90000000-0000-4000-8000-000000000002";
const workspace = "10000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202609140001_foundation.sql", "utf8"),
  );
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(
    `insert into auth.users values('${a}'),('${b}');insert into admin_workspaces(id,name,slug,start_date) values('10000000-0000-4000-8000-000000000002','Other','other','2026-09-14');insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${workspace}','${a}','Founder','{founder}'),('10000000-0000-4000-8000-000000000002','${b}','Viewer','{viewer}');`,
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("Database foundation", () => {
  it("seeds repeatedly without duplicate products or tasks", async () => {
    const result = await db.query<{ count: number }>(
      "select count(*)::integer as count from admin_tasks",
    );
    expect(result.rows[0].count).toBe(20);
  });
  it("isolates a member from another workspace", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${b}',false);`,
    );
    try {
      const tasks = await db.query("select * from admin_tasks");
      expect(tasks.rows).toHaveLength(0);
      const workspaces = await db.query("select * from admin_workspaces");
      expect(workspaces.rows).toHaveLength(1);
    } finally {
      await db.exec("reset role");
    }
  });
  it("allows members to read only their own data", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`,
    );
    try {
      expect((await db.query("select * from admin_tasks")).rows).toHaveLength(
        20,
      );
      await expect(
        db.exec("update admin_memberships set roles='{founder}'"),
      ).rejects.toThrow();
      await expect(
        db.exec("update admin_tasks set status='done'"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("denies anonymous reads", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from admin_tasks")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("enforces Definition of Ready in the database", async () => {
    await expect(
      db.exec("update admin_tasks set status='ready' where code='HEN-001'"),
    ).rejects.toThrow();
  });
  it("allows only one product at Build", async () => {
    await db.exec(
      "update admin_products set stage='build' where slug='only-when-we-meet'",
    );
    await expect(
      db.exec(
        "update admin_products set stage='build' where slug='reunion-box'",
      ),
    ).rejects.toThrow();
  });
});
