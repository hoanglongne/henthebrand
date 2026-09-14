import { test, expect } from "@playwright/test";
test("create a task, validate workflow, attach output and finish in preview", async ({
  page,
}) => {
  await page.goto("/work");
  await page
    .getByRole("button", { name: "Tạo công việc", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên công việc").fill("Kiểm thử UI đóng gói");
  await dialog.getByLabel("Người phụ trách").selectOption("Ops");
  await dialog.getByLabel("Hạn hoàn thành").fill("2026-09-22");
  await dialog
    .getByLabel("Definition of Done")
    .fill("Một người khác chạy thử SOP và xác nhận.");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("link")
    .filter({ hasText: "Kiểm thử UI đóng gói" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Kiểm thử UI đóng gói/ }),
  ).toBeVisible();
  await page
    .getByLabel("Trạng thái công việc", { exact: true })
    .selectOption("ready");
  await page
    .getByLabel("Trạng thái công việc", { exact: true })
    .selectOption("in_progress");
  await page
    .getByLabel("Trạng thái công việc", { exact: true })
    .selectOption("review");
  await expect(page.locator("#main [role=alert]")).toContainText(
    "Gắn link output",
  );
  await page.getByLabel("Tên output").fill("SOP đã review");
  await page
    .getByLabel("Đường dẫn", { exact: true })
    .fill("https://example.com/hen-sop");
  await page.getByRole("button", { name: "Gắn link trong bản thử" }).click();
  await page
    .getByLabel("Trạng thái công việc", { exact: true })
    .selectOption("review");
  await page.getByLabel("Kết quả đáp ứng Definition of Done").check();
  await page.getByLabel("Output đã được approver kiểm tra").check();
  await page
    .getByLabel("Trạng thái công việc", { exact: true })
    .selectOption("done");
  await expect(
    page.getByLabel("Trạng thái công việc", { exact: true }),
  ).toHaveValue("done");
  await page.getByRole("link", { name: "← Công việc của đội" }).click();
  await expect(
    page.getByRole("link").filter({ hasText: "Kiểm thử UI đóng gói" }),
  ).toContainText("Hoàn tất");
  await page.reload();
  await expect(page.getByText("Kiểm thử UI đóng gói")).toHaveCount(0);
});
test("campaign readiness and product stage notes are interactive", async ({
  page,
}) => {
  await page.goto("/campaigns");
  await expect(page.locator(".campaign-card")).toHaveCount(4);
  await page.locator(".campaign-card").first().click();
  await page.getByRole("button", { name: /Kiểm tra mở bán/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "điều kiện chưa hoàn tất",
  );
  await page.getByRole("button", { name: "Đóng cửa sổ" }).click();
  for (const checkbox of await page
    .locator(".checklist-panel input[type=checkbox]")
    .all())
    await checkbox.check();
  await page.getByRole("button", { name: /Kiểm tra mở bán/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tất cả điều kiện đã hoàn tất",
  );
  await page.getByRole("button", { name: "Mở campaign trong bản thử" }).click();
  await expect(
    page.getByRole("button", { name: "Kết thúc bản thử" }),
  ).toBeVisible();
  await page.goto("/products/product-0");
  await page
    .getByRole("button", { name: "Chuyển giai đoạn", exact: true })
    .click();
  await page.getByLabel("Giai đoạn tiếp theo").selectOption("design");
  await page
    .getByLabel("Lý do & căn cứ")
    .fill("Đã tổng hợp 10 cuộc phỏng vấn, sẵn sàng thiết kế.");
  await page.getByRole("button", { name: "Chuyển trong bản thử" }).click();
  await page.getByRole("button", { name: /Lịch sử giai đoạn/ }).click();
  await expect(page.locator(".history-list")).toContainText(
    "Đã tổng hợp 10 cuộc phỏng vấn",
  );
});
test("content scheduling validates assets and inventory validates reserved stock", async ({
  page,
}) => {
  await page.goto("/content");
  await page.getByRole("button", { name: "Ý tưởng mới" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên nội dung").fill("Một lời hẹn nhỏ");
  await dialog
    .getByLabel("Hook / câu mở đầu")
    .fill("Bạn sẽ nói gì khi gặp lại?");
  await dialog
    .getByLabel("Trạng thái", { exact: true })
    .selectOption("Scheduled");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Cần ngày đăng và link asset",
  );
  await dialog.getByLabel("Ngày đăng dự kiến").fill("2026-11-15");
  await dialog
    .getByLabel("Link asset / bài đã đăng")
    .fill("https://example.com/hen-asset");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(
    page.locator(".content-card").filter({ hasText: "Một lời hẹn nhỏ" }),
  ).toContainText("Scheduled");
  await page.goto("/operations");
  await page.getByRole("button", { name: "Chỉnh HEN-BOX-01" }).click();
  await dialog.getByLabel("Tồn thực tế").fill("2");
  await dialog.getByLabel("Đã giữ cho đơn").fill("10");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Số đã giữ không thể lớn hơn tồn thực tế",
  );
  await dialog.getByLabel("Tồn thực tế").fill("30");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "HEN-BOX-01" }),
  ).toContainText("Đủ dự phòng");
});
test("search, modal escape and all modules fit the viewport", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Tìm trong workspace/ }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Reunion");
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /Reunion Box/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const route of [
    "/campaigns",
    "/content",
    "/operations",
    "/settings",
    "/timeline",
    "/work/task-1",
  ]) {
    await page.goto(route);
    await expect(page.locator("#main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/settings");
  await page.getByRole("button", { name: /Đội hình/ }).click();
  await page.getByRole("button", { name: "Thêm thành viên mẫu" }).click();
  await page.getByLabel("Tên hiển thị").fill("Linh");
  await page.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Linh" })).toBeVisible();
  if (isMobile) {
    await page.getByRole("button", { name: "Mở điều hướng" }).click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Content Studio" })
      .click();
    await expect(page.locator("#main h1")).toContainText("Chuyện hay");
  }
  expect(errors).toEqual([]);
});

test("product evidence and campaign deadlines can be completed in the UI", async ({
  page,
}) => {
  await page.goto("/products/product-0");
  await page.getByRole("button", { name: "Tài liệu & bằng chứng" }).click();
  await page.getByRole("button", { name: "Gắn tài liệu", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tên tài liệu / insight")
    .fill("Phỏng vấn cặp đôi đầu tiên");
  await dialog.getByLabel("Ngày ghi nhận").fill("2026-09-16");
  await dialog
    .getByLabel("Điều đã học được")
    .fill("Người nhận quan tâm khoảnh khắc cùng mở hơn số lượng quà.");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await expect(page.locator(".evidence-list")).toContainText(
    "Phỏng vấn cặp đôi đầu tiên",
  );
  await page.goto("/campaigns/pilot-reaction");
  await page.getByRole("button", { name: "Chỉnh sửa brief" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Hạn chốt brief").fill("2026-10-26");
  await dialog.getByLabel("Hạn duyệt asset").fill("2026-11-02");
  await dialog.getByLabel("Hạn postmortem").fill("2026-11-30");
  await dialog.getByLabel("Cutoff giao hàng").fill("2026-11-16");
  await dialog
    .getByLabel("Support script / người trực")
    .fill("Ops trực buổi tối, Founder xử lý lỗi truy cập.");
  await dialog.getByRole("button", { name: "Áp dụng bản thử" }).click();
  await page.getByRole("button", { name: "Brief & kế hoạch" }).click();
  await expect(page.locator("#main")).toContainText("2026-11-30");
  await expect(page.locator("#main")).toContainText("Ops trực buổi tối");
});
