import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const sql = readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8");
async function database(confirmed: boolean) {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('90000000-0000-4000-8000-000000000001','cortexedtech@gmail.com',${confirmed ? "now()" : "null"});`,
  );
  return db;
}
it("bootstraps the confirmed Founder and real kickoff atomically", async () => {
  const db = await database(true);
  try {
    await db.exec(sql);
    const result = await db.query<{
      start_date: string;
      roles: string[];
      display_name: string;
    }>(
      "select w.start_date::text,m.roles,m.display_name from admin_workspaces w join admin_memberships m on w.id=m.workspace_id",
    );
    expect(result.rows).toEqual([
      {
        start_date: "2026-09-15",
        roles: ["founder"],
        display_name: "Founder / Dev",
      },
    ]);
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(20);
    expect(
      (await db.query("select * from admin_activity_log")).rows,
    ).toHaveLength(1);
    await expect(db.exec(sql)).rejects.toThrow("HEN_ALREADY_INITIALIZED");
    await db.exec("rollback");
    expect((await db.query("select * from admin_tasks")).rows).toHaveLength(20);
  } finally {
    await db.close();
  }
}, 30000);
it("does not initialize tables if the Founder is unconfirmed", async () => {
  const db = await database(false);
  try {
    await expect(db.exec(sql)).rejects.toThrow("HEN_FOUNDER_MISSING");
    await db.exec("rollback");
    const result = await db.query<{ table_name: string | null }>(
      "select to_regclass('public.admin_workspaces')::text as table_name",
    );
    expect(result.rows[0].table_name).toBeNull();
  } finally {
    await db.close();
  }
}, 30000);
