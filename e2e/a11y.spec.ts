import { expect, test, type Page } from "@playwright/test";
import { JOB, RESUME, openAnalyze, uniqueIp } from "./helpers";

test("reduced motion shows the static orb instead of the 3D canvas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("orb-fallback")).toBeVisible();
  await expect(page.getByTestId("orb-canvas")).toHaveCount(0);
});

async function tabUntil(page: Page, matches: () => Promise<boolean>) {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    if (await matches()) return;
  }
  throw new Error("Element never received focus with Tab");
}

const focusedLabel = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null;
    return (label ?? el.textContent ?? "").trim();
  });

test("the paste flow works with the keyboard only", async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "x-nf-client-connection-ip": uniqueIp() });
  await openAnalyze(page);

  await tabUntil(page, async () => (await focusedLabel(page)) === "Paste text");
  await page.keyboard.press("ArrowRight");
  expect(await focusedLabel(page)).toBe("Upload PDF");
  await page.keyboard.press("ArrowLeft");

  await tabUntil(page, async () => (await focusedLabel(page)) === "Resume");
  await page.keyboard.insertText(RESUME);
  await tabUntil(page, async () => (await focusedLabel(page)) === "Job posting");
  await page.keyboard.insertText(JOB);
  await tabUntil(page, async () => (await focusedLabel(page)) === "Analyze");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Good match")).toBeVisible();
});
