import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { workInputSchema } from "../src/lib/domain/live-work";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const owner = "90000000-0000-4000-8000-000000000002";
const viewer = "90000000-0000-4000-8000-000000000003";
const outsider = "90000000-0000-4000-8000-000000000004";
let db: PGlite;
type Row = { id: string; updated_at: string; status: string };
const fields = {
  title: "Công việc thật",
  priority: "P2",
  effort: 3,
  owner_id: owner,
  approver_id: founder,
  product_id: null,
  due_date: "2026-09-20",
  definition_of_done: "Có output đã kiểm tra",
  workstream: "Product",
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function call(
  task: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ task: Row }>(
    "select public.admin_work_mutate($1,$2,$3,$4,$5::jsonb) as task",
    [
      ws,
      task?.id ?? null,
      task?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].task;
}
async function create() {
  return call(null, "create", fields);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${owner}','owner@example.com',now()),('${viewer}','viewer@example.com',now()),('${outsider}','outsider@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609150002_work_system.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${owner}','Owner','{ops}'),('${ws}','${viewer}','Viewer','{viewer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("denies viewers and outsiders, including reads outside the workspace", async () => {
  await login(viewer);
  await expect(create()).rejects.toThrow("HEN_FORBIDDEN");
  await login(outsider);
  await expect(create()).rejects.toThrow("HEN_FORBIDDEN");
  expect((await db.query("select * from admin_tasks")).rows).toHaveLength(0);
  expect(
    (await db.query("select * from admin_task_checklist")).rows,
  ).toHaveLength(0);
  await login(founder);
});
it("rejects direct table writes even for Founder", async () => {
  await expect(
    db.exec("update admin_tasks set title='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("creates checklist and audit atomically, rejects stale versions", async () => {
  await login(founder);
  const t = await create();
  expect(
    (
      await db.query("select * from admin_task_checklist where task_id=$1", [
        t.id,
      ])
    ).rows,
  ).toHaveLength(2);
  const newer = await call(t, "update", { ...fields, title: "Đã sửa" });
  expect(newer.updated_at).not.toBe(t.updated_at);
  await expect(call(t, "update", fields)).rejects.toThrow("HEN_CONFLICT");
  expect(
    (
      await db.query("select * from admin_activity_log where entity_id=$1", [
        t.id,
      ])
    ).rows,
  ).toHaveLength(2);
});
it("requires complete assignment before leaving Backlog and preserves state on failure", async () => {
  const t = await call(null, "create", {
    ...fields,
    owner_id: null,
    due_date: null,
  });
  await expect(call(t, "transition", { status: "ready" })).rejects.toThrow(
    "HEN_READY_REQUIRED",
  );
  const r = await db.query<{ status: string }>(
    "select status from admin_tasks where id=$1",
    [t.id],
  );
  expect(r.rows[0].status).toBe("backlog");
});
it("requires output, checklist and the approver for Done", async () => {
  await login(founder);
  let t = await create();
  await login(owner);
  await expect(call(t, "transition", { status: "review" })).rejects.toThrow(
    "HEN_OUTPUT_REQUIRED",
  );
  t = await call(t, "link_add", {
    label: "Bản bàn giao",
    url: "https://example.com/output",
  });
  t = await call(t, "transition", { status: "review" });
  await expect(call(t, "transition", { status: "done" })).rejects.toThrow(
    "HEN_FORBIDDEN",
  );
  await login(founder);
  await expect(call(t, "transition", { status: "done" })).rejects.toThrow(
    "HEN_CHECKLIST_REQUIRED",
  );
  for (const item of (
    await db.query<{ id: string }>(
      "select id from admin_task_checklist where task_id=$1",
      [t.id],
    )
  ).rows)
    t = await call(t, "checklist_toggle", { id: item.id, completed: true });
  t = await call(t, "transition", { status: "done" });
  expect(t.status).toBe("done");
  await expect(
    call(t, "link_remove", { id: crypto.randomUUID() }),
  ).rejects.toThrow("HEN_DONE_LOCKED");
});
it("enforces WIP and requires a Founder reason only on entering over capacity", async () => {
  await login(founder);
  let third: Row | null = null;
  for (let i = 0; i < 3; i++) {
    let t = await create();
    if (i < 2) t = await call(t, "transition", { status: "in_progress" });
    else third = t;
  }
  await login(owner);
  await expect(
    call(third, "transition", { status: "in_progress", reason: "muốn làm" }),
  ).rejects.toThrow("HEN_WIP_LIMIT");
  await login(founder);
  await expect(
    call(third, "transition", { status: "in_progress" }),
  ).rejects.toThrow("HEN_WIP_LIMIT");
  third = await call(third, "transition", {
    status: "in_progress",
    reason: "Việc gấp đã thống nhất",
  });
  await login(owner);
  third = await call(third, "link_add", {
    label: "Output",
    url: "https://example.com",
  });
  expect(third.status).toBe("in_progress");
  await login(founder);
});
it("rejects dependency cycles and unmet P0 dependencies", async () => {
  let a = await create();
  const b = await call(null, "create", { ...fields, priority: "P0" });
  a = await call(a, "dependency_add", { id: b.id });
  await expect(call(b, "dependency_add", { id: a.id })).rejects.toThrow(
    "HEN_DEPENDENCY_CYCLE",
  );
  await expect(call(a, "transition", { status: "ready" })).rejects.toThrow(
    "HEN_DEPENDENCY_BLOCKED",
  );
  await expect(
    call(a, "dependency_add", { id: crypto.randomUUID() }),
  ).rejects.toThrow("HEN_NOT_FOUND");
});
it("prevents reassignment by owners and takes comment identity from the session", async () => {
  let t = await create();
  await login(owner);
  await expect(
    call(t, "update", { ...fields, owner_id: founder }),
  ).rejects.toThrow("HEN_ASSIGNMENT_FORBIDDEN");
  t = await call(t, "comment_add", { body: "Đã cập nhật", author_id: founder });
  const r = await db.query<{ author_id: string }>(
    "select author_id from admin_task_comments where task_id=$1",
    [t.id],
  );
  expect(r.rows[0].author_id).toBe(owner);
  await login(founder);
  await expect(
    call(t, "update", { ...fields, owner_id: viewer }),
  ).rejects.toThrow("HEN_INVALID_OWNER");
});
it("rejects unsafe URLs and malformed commands before the server action", () => {
  expect(
    workInputSchema.safeParse({
      workspaceId: ws,
      taskId: owner,
      expected: new Date().toISOString(),
      operation: "link_add",
      payload: { label: "X", url: "javascript:alert(1)" },
    }).success,
  ).toBe(false);
  expect(
    workInputSchema.safeParse({
      workspaceId: ws,
      taskId: null,
      expected: null,
      operation: "create",
      payload: fields,
    }).success,
  ).toBe(true);
});

it("isolates task IDs, assignments and dependencies across workspaces", async () => {
  await login(founder);
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_tasks(workspace_id,code,title) values($1,'OTHER-1','Private') returning id,updated_at::text",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  expect(
    (await db.query("select * from admin_tasks where id=$1", [other.id])).rows,
  ).toHaveLength(0);
  const task = await create();
  await expect(call(task, "dependency_add", { id: other.id })).rejects.toThrow(
    "HEN_NOT_FOUND",
  );
  await expect(
    call(other, "comment_add", { body: "Cross workspace" }),
  ).rejects.toThrow("HEN_NOT_FOUND");
  await expect(
    call(task, "update", { ...fields, owner_id: outsider }),
  ).rejects.toThrow("foreign key constraint");
});
