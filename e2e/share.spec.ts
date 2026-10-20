import { expect, test } from "@playwright/test";
import { fillAndAnalyze, openAnalyze, uniqueIp } from "./helpers";

test("share, open read-only in another browser, then delete", async ({ page, browser }) => {
  await page.context().setExtraHTTPHeaders({ "x-nf-client-connection-ip": uniqueIp() });
  await openAnalyze(page);
  await fillAndAnalyze(page);

  await page.getByRole("button", { name: "Create share link" }).click();
  const link = page.locator('a[href*="/r/"]');
  await expect(link).toBeVisible();
  const url = await link.getAttribute("href");
  expect(url).toMatch(/\/r\/[A-Za-z0-9_-]{12}$/);

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(url!);
  await expect(visitorPage.getByText("Good match")).toBeVisible();
  await expect(visitorPage.getByRole("button", { name: "Delete link" })).toHaveCount(0);
  await expect(visitorPage.getByRole("textbox", { name: "Cover letter" })).toHaveAttribute("readonly", "");
  await visitor.close();

  await page.goto(url!);
  // Deleting asks first; Cancel keeps the link.
  await page.getByRole("button", { name: "Delete link" }).click();
  await expect(page.getByText("Delete this link? This can't be undone.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Delete link" })).toBeVisible();

  await page.getByRole("button", { name: "Delete link" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("status")).toHaveText("Link deleted. Anyone who opens it now sees a not-found page.");
  await page.goto(url!);
  await expect(page.getByText("This page doesn't exist or has expired.")).toBeVisible();
});

test("an unknown link shows the 404 page", async ({ page }) => {
  await page.goto("/r/zzzzzzzzzzzz");
  await expect(page.getByText("This page doesn't exist or has expired.")).toBeVisible();
});
