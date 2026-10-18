import { expect, test } from "@playwright/test";
import { JOB, RESUME, fillAndAnalyze, openAnalyze, uniqueIp } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-nf-client-connection-ip": uniqueIp() });
});

test("paste flow shows the fixture score and band", async ({ page }) => {
  await openAnalyze(page);
  await fillAndAnalyze(page);
  await expect(page.getByRole("img", { name: "Match score 60 out of 100, Good match" })).toBeVisible();
  await expect(page.getByText("“Built MediSched with React and TypeScript”")).toBeVisible();
});

test("PDF upload fills the resume box with the extracted text", async ({ page }) => {
  await openAnalyze(page);
  await page.getByRole("tab", { name: "Upload PDF" }).click();
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/resume.pdf");
  await expect(page.getByText(/Text extracted from resume\.pdf/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Resume" })).toHaveValue(/Built MediSched with React and TypeScript/);
});

test("a scanned PDF shows the no-text message", async ({ page }) => {
  await openAnalyze(page);
  await page.getByRole("tab", { name: "Upload PDF" }).click();
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/scanned.pdf");
  await expect(page.getByText("We couldn't read text from this PDF. Paste your resume text instead.")).toBeVisible();
});

test("a double-click on Analyze sends exactly one request", async ({ page }) => {
  let requests = 0;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/analyze")) requests += 1;
  });
  await openAnalyze(page);
  await page.getByRole("textbox", { name: "Resume" }).fill(RESUME);
  await page.getByRole("textbox", { name: "Job posting" }).fill(JOB);
  await page.getByRole("button", { name: "Analyze" }).dblclick();
  await expect(page.getByText("Good match")).toBeVisible();
  expect(requests).toBe(1);
});

test("the 11th analysis from one IP shows the daily-limit message", async ({ page, request }) => {
  const ip = uniqueIp();
  for (let i = 0; i < 10; i++) {
    const res = await request.post("/api/analyze", {
      data: { resumeText: RESUME, jobText: JOB },
      headers: { "x-nf-client-connection-ip": ip },
    });
    expect(res.status()).toBe(200);
  }
  await page.context().setExtraHTTPHeaders({ "x-nf-client-connection-ip": ip });
  await openAnalyze(page);
  await page.getByRole("textbox", { name: "Resume" }).fill(RESUME);
  await page.getByRole("textbox", { name: "Job posting" }).fill(JOB);
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("You've used today's 10 analyses. It resets at 12:00 AM (PH time).")).toBeVisible();
});

test("going offline shows the offline message and keeps the inputs", async ({ page, context }) => {
  await openAnalyze(page);
  await page.getByRole("textbox", { name: "Resume" }).fill(RESUME);
  await page.getByRole("textbox", { name: "Job posting" }).fill(JOB);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("You seem to be offline. Check your connection and try again.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Job posting" })).toHaveValue(JOB);
  await context.setOffline(false);
});
