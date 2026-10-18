// Generates e2e/fixtures/resume.pdf (text layer) and scanned.pdf (image only, no text layer).
// Run: node tools/make-pdf-fixtures.mjs
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const text = readFileSync("e2e/fixtures/resume.txt", "utf8");
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const resumeHtml = `<!doctype html><meta charset="utf-8"><body style="font:14px/1.5 Arial,sans-serif;padding:40px;white-space:pre-wrap">${escape(text)}</body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

await page.setContent(resumeHtml);
await page.pdf({ path: "e2e/fixtures/resume.pdf", format: "A4" });

const png = await page.screenshot({ fullPage: true });
await page.setContent(
  `<!doctype html><body style="margin:0"><img style="width:100%" src="data:image/png;base64,${png.toString("base64")}"></body>`,
);
await page.pdf({ path: "e2e/fixtures/scanned.pdf", format: "A4", printBackground: true });

await browser.close();
console.log("wrote e2e/fixtures/resume.pdf and e2e/fixtures/scanned.pdf");
