import { expect, test } from "@playwright/test";
import { fillAndAnalyze, openAnalyze, uniqueIp } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-nf-client-connection-ip": uniqueIp() });
});

test("long unbroken words in a result wrap instead of running off a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openAnalyze(page);
  await fillAndAnalyze(page);
  await expect(page.getByRole("heading", { level: 2, name: /Junior Web Developer/ })).toBeVisible();

  // Real resumes contain links; the AI can quote them or put them in a title or skill.
  const url = "https://github.com/juandelacruz/inventory-tracker-application-with-supabase-and-react";
  await page.evaluate((link) => {
    const key = "resumatch:last-result";
    const result = JSON.parse(sessionStorage.getItem(key)!);
    result.analysis.jobTitle = "Senior_Full_Stack_Developer_(React/Node/AWS/Kubernetes)_Remote";
    result.analysis.requirements[0].skill = "ContinuousIntegration/ContinuousDeploymentPipelines";
    result.analysis.requirements[0].evidence = link;
    result.analysis.suggestions[0] = `Add ${link} near the top.`;
    sessionStorage.setItem(key, JSON.stringify(result));
  }, url);
  await page.reload();
  await expect(page.locator("blockquote", { hasText: url })).toBeVisible();

  const overflowing = await page.evaluate(() => {
    const edge = document.documentElement.clientWidth;
    return [...document.querySelectorAll("main *")]
      .filter((el) => el.getBoundingClientRect().right > edge + 1)
      .map((el) => `${el.tagName}: ${el.textContent?.trim().slice(0, 40)}`);
  });
  expect(overflowing).toEqual([]);
});
