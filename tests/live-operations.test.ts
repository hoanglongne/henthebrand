import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import {
  stockInputSchema,
  vendorInputSchema,
  issueInputSchema,
} from "../src/lib/domain/live-operations";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const ops = "90000000-0000-4000-8000-000000000002";
const designer = "90000000-0000-4000-8000-000000000003";
let db: PGlite;
type Row = {
  id: string;
  updated_at: string;
  status?: string;
  sample_status?: string;
};
const stockFields = {
  name: "Card QR",
  code: "HEN-QR-01",
  category: "Thành phẩm",
  on_hand: 20,
  reserved: 5,
  buffer: 5,
  reorder: 5,
  cost: 12000,
};
const vendorFields = {
  name: "Xưởng in ABC",
  category: "In ấn",
  contact: "anh Nam - 090xxx",
  lead_time_days: 7,
  moq: 50,
  sample_status: "Chưa đặt mẫu",
  note: "",
};
const issueFields = {
  title: "Card không scan được",
  external_ref: "ORDER-123",
  severity: "Cao",
  status: "Mới ghi nhận",
  owner_id: null,
  resolution: "",
};
async function login(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function callFn(
  fn: string,
  row: Row | null,
  operation: string,
  payload: object,
): Promise<Row> {
  const r = await db.query<{ item: Row }>(
    `select public.${fn}($1,$2,$3,$4,$5::jsonb) as item`,
    [
      ws,
      row?.id ?? null,
      row?.updated_at ?? null,
      operation,
      JSON.stringify(payload),
    ],
  );
  return r.rows[0].item;
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
    readFileSync("supabase/migrations/202609190006_operations.sql", "utf8"),
  );
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${ops}','Ops','{ops}'),('${ws}','${designer}','Designer','{product_designer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("denies roles outside founder/ops for all three entities", async () => {
  await login(designer);
  await expect(
    callFn("admin_stock_mutate", null, "create", stockFields),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await expect(
    callFn("admin_vendor_mutate", null, "create", vendorFields),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await expect(
    callFn("admin_issue_mutate", null, "create", issueFields),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("rejects direct table writes even for Founder", async () => {
  await expect(
    db.exec("update admin_stock_items set name='bypass'"),
  ).rejects.toThrow("permission denied");
});
it("creates and updates stock, rejecting reserved above on-hand and stale versions", async () => {
  await login(ops);
  const item = await callFn("admin_stock_mutate", null, "create", stockFields);
  const edited = await callFn("admin_stock_mutate", item, "update", {
    ...stockFields,
    on_hand: 30,
  });
  expect(edited.updated_at).not.toBe(item.updated_at);
  await expect(
    callFn("admin_stock_mutate", item, "update", stockFields),
  ).rejects.toThrow("HEN_CONFLICT");
  await expect(
    callFn("admin_stock_mutate", null, "create", {
      ...stockFields,
      code: "OTHER",
      reserved: 999,
    }),
  ).rejects.toThrow();
  expect(
    (await db.query("select * from admin_activity_log where entity_id=$1", [
      item.id,
    ])).rows,
  ).toHaveLength(2);
});
it("creates and updates a vendor", async () => {
  const item = await callFn(
    "admin_vendor_mutate",
    null,
    "create",
    vendorFields,
  );
  const edited = await callFn("admin_vendor_mutate", item, "update", {
    ...vendorFields,
    sample_status: "Đã duyệt mẫu",
  });
  expect(edited.sample_status).toBe("Đã duyệt mẫu");
});
it("requires a resolution before closing an issue", async () => {
  const item = await callFn("admin_issue_mutate", null, "create", issueFields);
  await expect(
    callFn("admin_issue_mutate", item, "update", {
      ...issueFields,
      status: "Đã xử lý",
    }),
  ).rejects.toThrow();
  const closed = await callFn("admin_issue_mutate", item, "update", {
    ...issueFields,
    status: "Đã xử lý",
    resolution: "Đã đổi card mới cho khách",
  });
  expect(closed.status).toBe("Đã xử lý");
});
it("rejects invalid input before the server action", () => {
  expect(
    stockInputSchema.safeParse({
      workspaceId: ws,
      stockId: null,
      expected: null,
      operation: "create",
      payload: { ...stockFields, reserved: 999 },
    }).success,
  ).toBe(false);
  expect(
    vendorInputSchema.safeParse({
      workspaceId: ws,
      vendorId: null,
      expected: null,
      operation: "create",
      payload: vendorFields,
    }).success,
  ).toBe(true);
  expect(
    issueInputSchema.safeParse({
      workspaceId: ws,
      issueId: null,
      expected: null,
      operation: "create",
      payload: { ...issueFields, status: "Đã xử lý", resolution: "" },
    }).success,
  ).toBe(false);
});
it("isolates operations data across workspaces", async () => {
  const otherWs = "10000000-0000-4000-8000-000000000099";
  await db.exec("reset role");
  await db.query(
    "insert into admin_workspaces(id,name,slug,start_date) values($1,'Other','other','2026-09-15')",
    [otherWs],
  );
  const other = (
    await db.query<Row>(
      "insert into admin_stock_items(workspace_id,name,code,category) values($1,'Private','P-1','Thành phẩm') returning id,updated_at::text",
      [otherWs],
    )
  ).rows[0];
  await db.exec("set role authenticated");
  await expect(
    callFn("admin_stock_mutate", other, "update", stockFields),
  ).rejects.toThrow("HEN_NOT_FOUND");
});
