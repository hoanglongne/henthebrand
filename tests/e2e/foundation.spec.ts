import { test, expect } from "@playwright/test";
test("preview is explicit, excluded modules absent, and main navigation works", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Một ngày, gần hơn/ }),
  ).toBeVisible();
  await expect(page.locator(".preview-banner")).toContainText("Dữ liệu mẫu");
  await expect(page.locator(".preview-banner")).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Mở điều hướng" }).click();
  await expect(
    page.getByRole("navigation").getByText("Experiments"),
  ).toHaveCount(0);
  await expect(page.getByRole("navigation").getByText("Risks")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Công việc của đội/ }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Tìm công việc", exact: true })
    .fill("vendor");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.locator(".task-row").click();
  await expect(
    page.getByRole("heading", { name: "Lấy báo giá từ 3 vendor" }),
  ).toBeVisible();
});
test("board filtering, product details, roadmap, no horizontal page overflow", async ({
  page,
}) => {
  await page.goto("/work");
  await page.getByRole("button", { name: "Dạng bảng" }).click();
  await expect(page.locator(".kanban-column")).toHaveCount(6);
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(10);
  await page.locator(".product-card").first().click();
  await expect(
    page.getByRole("heading", { name: "Lời hứa sản phẩm" }),
  ).toBeVisible();
  await page.goto("/timeline");
  await expect(page.locator(".timeline-item")).toHaveCount(8);
  for (const route of ["/", "/work", "/products", "/settings", "/login"]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
