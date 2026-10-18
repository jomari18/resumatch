import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const RESUME = readFileSync("e2e/fixtures/resume.txt", "utf8");
export const JOB = readFileSync("e2e/fixtures/job.txt", "utf8");

let counter = 0;
/** A unique client IP per test, so each test has its own rate-limit counter. */
export function uniqueIp(): string {
  counter += 1;
  return `198.51.100.${(Date.now() + counter) % 250}`;
}

export async function openAnalyze(page: Page) {
  await page.goto("/analyze");
  await expect(page.locator("form[data-ready=true]")).toBeVisible();
}

export async function fillAndAnalyze(page: Page) {
  await page.getByRole("textbox", { name: "Resume" }).fill(RESUME);
  await page.getByRole("textbox", { name: "Job posting" }).fill(JOB);
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("Good match")).toBeVisible();
}
