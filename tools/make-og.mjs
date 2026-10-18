// Renders public/og.png (1200x630) for link previews. Run: node tools/make-og.mjs
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icon = readFileSync("src/app/icon.svg", "utf8");
const html = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;
       background:radial-gradient(circle at 80% 30%,#134e4a 0,#0b1220 55%);font-family:Arial,Helvetica,sans-serif;color:#e2e8f0}
  .orb{width:300px;height:300px;flex:none;filter:drop-shadow(0 30px 60px rgba(45,212,191,.35))}
  h1{font-size:72px;line-height:1.05;margin:0 0 20px;color:#fff}
  h1 span{color:#2dd4bf}
  p{font-size:30px;line-height:1.35;margin:0;color:#cbd5e1;max-width:620px}
  .tag{display:inline-block;margin-top:28px;font-size:22px;color:#fbbf24;border:2px solid #fbbf24;border-radius:999px;padding:6px 18px}
</style>
<div class="orb">${icon.replace("<svg", '<svg width="300" height="300"')}</div>
<div><h1>Resu<span>Match</span></h1>
<p>See how your resume matches the job, with evidence from your own resume.</p>
<span class="tag">Free · No account · Honest scoring</span></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("wrote public/og.png");
