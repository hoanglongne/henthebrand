import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const ws = "10000000-0000-4000-8000-000000000001";
const founder = "90000000-0000-4000-8000-000000000001";
const brand = "90000000-0000-4000-8000-000000000002";
const viewer = "90000000-0000-4000-8000-000000000003";
let db: PGlite;
type Row = { id: string; updated_at: string; owner_id?: string | null };
const productFields = {
  name: "Sản phẩm có chỗ làm việc",
  moment: "Một khoảnh khắc",
  audience: "Cặp đôi",
  promise: "Lời hứa",
  owner_id: null,
  impact_score: 3,
  effort_score: 2,
};
const contentFields = {
  title: "Nội dung có checklist",
  hook: "Hook",
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
async function product(row: Row | null, operation: string, payload: object) {
  const r = await db.query<{ item: Row }>(
    "select public.admin_product_mutate($1,$2,$3,$4,$5::jsonb) as item",
    [ws, row?.id ?? null, row?.updated_at ?? null, operation, JSON.stringify(payload)],
  );
  return r.rows[0].item;
}
async function content(row: Row | null, operation: string, payload: object) {
  const r = await db.query<{ item: Row }>(
    "select public.admin_content_mutate($1,$2,$3,$4,$5::jsonb) as item",
    [ws, row?.id ?? null, row?.updated_at ?? null, operation, JSON.stringify(payload)],
  );
  return r.rows[0].item;
}
const rows = async <T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => (await db.query<T>(sql, params)).rows;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${founder}','cortexedtech@gmail.com',now()),('${brand}','brand@example.com',now()),('${viewer}','viewer@example.com',now());`,
  );
  await db.exec(
    readFileSync("supabase/bootstrap/01_initial_setup.sql", "utf8"),
  );
  for (const m of [
    "202609160003_products_timeline",
    "202609170004_campaigns",
    "202609180005_content",
    "202609200007_members_settings",
    "202609210008_product_insights",
    "202609220009_item_workspace",
  ])
    await db.exec(readFileSync(`supabase/migrations/${m}.sql`, "utf8"));
  await db.exec(
    `insert into admin_memberships(workspace_id,user_id,display_name,roles) values('${ws}','${brand}','Brand','{brand_designer}'),('${ws}','${viewer}','Viewer','{viewer}');grant usage on schema auth to authenticated;set role authenticated;`,
  );
  await login(founder);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("seeds a production checklist on every content item, old and new", async () => {
  const existing = await rows(
    "select content_id,count(*)::int as n from admin_content_checklist group by content_id",
  );
  // Bootstrap ships no content, so the backfill has nothing to do yet.
  expect(existing).toEqual([]);
  const item = await content(null, "create", contentFields);
  const seeded = await rows(
    "select label from admin_content_checklist where content_id=$1 order by created_at",
    [item.id],
  );
  expect(seeded).toHaveLength(4);
});
it("tracks checklist progress and review comments on a content item", async () => {
  let item = await content(null, "create", contentFields);
  const step = (
    await rows<{ id: string }>(
      "select id from admin_content_checklist where content_id=$1 order by created_at limit 1",
      [item.id],
    )
  )[0];
  item = await content(item, "checklist_toggle", {
    id: step.id,
    completed: true,
  });
  expect(
    (
      await rows<{ completed: boolean; completed_at: string | null }>(
        "select completed,completed_at::text from admin_content_checklist where id=$1",
        [step.id],
      )
    )[0].completed,
  ).toBe(true);
  item = await content(item, "checklist_add", { label: "Dựng bản 9:16" });
  item = await content(item, "comment_add", { body: "Hook chưa đủ mạnh." });
  const comment = (
    await rows<{ author_id: string; body: string }>(
      "select author_id,body from admin_content_comments where content_id=$1",
      [item.id],
    )
  )[0];
  expect(comment.author_id).toBe(founder);
  await content(item, "checklist_remove", { id: step.id });
  expect(
    await rows("select id from admin_content_checklist where id=$1", [step.id]),
  ).toHaveLength(0);
});
it("keeps content tools closed to roles without write access", async () => {
  const item = await content(null, "create", contentFields);
  await login(viewer);
  await expect(
    content(item, "comment_add", { body: "Xem thôi" }),
  ).rejects.toThrow("HEN_FORBIDDEN");
  await login(founder);
});
it("records an owner, questions, links and discussion on a product", async () => {
  let p = await product(null, "create", {
    ...productFields,
    owner_id: brand,
  });
  expect(p.owner_id).toBe(brand);
  p = await product(p, "question_add", {
    question: "Giá bao nhiêu thì họ mua?",
  });
  const question = (
    await rows<{ id: string; answered_at: string | null }>(
      "select id,answered_at::text from admin_product_questions where product_id=$1",
      [p.id],
    )
  )[0];
  expect(question.answered_at).toBeNull();
  p = await product(p, "question_answer", {
    id: question.id,
    answer: "199k, theo 8 cuộc phỏng vấn.",
  });
  expect(
    (
      await rows<{ answered_at: string | null; answered_by: string | null }>(
        "select answered_at::text,answered_by from admin_product_questions where id=$1",
        [question.id],
      )
    )[0].answered_by,
  ).toBe(founder);
  // Xoá câu trả lời thì câu hỏi mở lại.
  p = await product(p, "question_answer", { id: question.id, answer: "" });
  expect(
    (
      await rows<{ answered_at: string | null }>(
        "select answered_at::text from admin_product_questions where id=$1",
        [question.id],
      )
    )[0].answered_at,
  ).toBeNull();
  p = await product(p, "link_add", {
    label: "Bản vẽ Figma",
    url: "https://example.com/figma",
  });
  p = await product(p, "comment_add", { body: "Nên thử giá 149k trước." });
  expect(
    await rows("select id from admin_product_links where product_id=$1", [p.id]),
  ).toHaveLength(1);
  expect(
    await rows("select id from admin_product_comments where product_id=$1", [
      p.id,
    ]),
  ).toHaveLength(1);
  await product(p, "question_remove", { id: question.id });
  expect(
    await rows("select id from admin_product_questions where product_id=$1", [
      p.id,
    ]),
  ).toHaveLength(0);
});
it("refuses an owner who cannot work in this workspace", async () => {
  await expect(
    product(null, "create", { ...productFields, owner_id: viewer }),
  ).rejects.toThrow("HEN_INVALID_OWNER");
});
it("rejects unsafe working links", async () => {
  const p = await product(null, "create", productFields);
  await expect(
    product(p, "link_add", { label: "Xấu", url: "javascript:alert(1)" }),
  ).rejects.toThrow();
});
