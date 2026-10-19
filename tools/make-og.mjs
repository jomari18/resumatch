// Renders public/og.png (1200x630) for link previews. Run: node tools/make-og.mjs
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icon = readFileSync("src/app/icon.svg", "utf8");
const sheet = (x, y, r, hl) => `<div class="sheet" style="left:${x}px;top:${y}px;transform:rotate(${r}deg)">
  ${[1, 0.8, hl, 0.9, 0.7, 0.85].map((w) => `<i style="width:${(w === hl ? 1 : w) * 150}px${w === hl ? ";background:#ffd84d" : ""}"></i>`).join("")}</div>`;
const html = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Inter:wght@400;600&display=block" rel="stylesheet">
<style>
  body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:Inter,Arial,sans-serif;color:#1c1b19;
       background:radial-gradient(520px 320px at 85% 25%,rgba(255,216,77,.35),transparent),#fbf8f3}
  .sheet{position:absolute;width:200px;height:270px;background:#fff;border:1px solid #e4ddd0;border-radius:6px;
         box-shadow:0 20px 40px rgba(28,27,25,.10);padding:28px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}
  .sheet i{display:block;height:11px;border-radius:3px;background:#d9d0bf}
  .copy{position:absolute;left:80px;top:96px;width:640px}
  .brand{display:flex;align-items:center;gap:16px;font-family:'Bricolage Grotesque';font-weight:800;font-size:40px;margin-bottom:44px}
  h1{font-family:'Bricolage Grotesque';font-weight:800;font-size:76px;line-height:1.02;letter-spacing:-2px;margin:0 0 28px}
  mark{background:linear-gradient(transparent 55%,#ffd84d 55%);color:inherit;padding:0 6px}
  p{font-size:28px;line-height:1.4;margin:0;color:#5f5b54}
</style>
${sheet(820, 60, 12, 0.3)}${sheet(960, 300, -9, 0.6)}${sheet(760, 360, 6, 0.5)}
<div class="copy">
  <div class="brand">${icon.replace("<svg", '<svg width="56" height="56"')}ResuMatch</div>
  <h1>See how your resume <mark>really</mark> matches the job.</h1>
  <p>Match score with evidence from your own resume. Free, no account.</p>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("wrote public/og.png");
