// Renders docs/diagrams/*.png from Mermaid definitions. Run: node tools/render-diagrams.mjs
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const diagrams = {
  "context-diagram": `flowchart LR
    U(["Job seeker"]) -- "resume text, job posting" --> S(("ResuMatch"))
    S -- "score, evidence, suggestions, cover letter" --> U
    V(["Link visitor"]) -- "share id" --> S
    S -- "read-only shared result" --> V
    S -- "delimited prompt + JSON schema" --> G(["Gemini API"])
    G -- "requirements JSON" --> S
    S -- "quota and share RPCs" --> D[("Supabase PostgreSQL")]
    D -- "quota result, shared rows" --> S`,
  "data-flow-diagram": `flowchart TB
    U(["Job seeker"]) -- "PDF file" --> P1(("P1 · Extract text<br/>in browser"))
    P1 -- "resume text" --> P2(("P2 · Validate and<br/>rate limit"))
    U -- "job posting" --> P2
    P2 -- "IP hash" --> D1[("rate_limits")]
    P2 -- "valid input" --> P3(("P3 · AI analysis"))
    P3 <-- "prompt / JSON" --> G(["Gemini API"])
    P3 -- "raw analysis" --> P4(("P4 · Verify evidence,<br/>score, sign"))
    P4 -- "signed result" --> U
    U -- "signed result" --> P5(("P5 · Create share"))
    P5 -- "result, digest, token hash" --> D2[("analyses")]
    V(["Link visitor"]) -- "share id" --> P6(("P6 · Show shared result"))
    D2 -- "live row" --> P6
    P6 -- "read-only view" --> V`,
  flowchart: `flowchart TD
    A([Start]) --> B[Paste resume or upload PDF]
    B --> C{Text readable?}
    C -- No --> C1[Show: paste your resume instead] --> B
    C -- Yes --> D[Paste job posting and click Analyze]
    D --> E{Input within limits?}
    E -- No --> E1[Inline field message] --> D
    E -- Yes --> F{Daily quota left?}
    F -- No --> F1[429: resets at 12:00 AM PH] --> Z([End])
    F -- Yes --> G[Call Gemini with 20 s deadline]
    G --> H{Valid JSON?}
    H -- No, time left --> G
    H -- No --> H1[502: try again] --> Z
    H -- Yes --> I[Verify evidence, compute score, sign]
    I --> J[Show results]
    J --> K{Create share link?}
    K -- No --> Z
    K -- Yes --> L[Store signed result for 30 days] --> Z`,
};

mkdirSync("docs/diagrams", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });

for (const [name, definition] of Object.entries(diagrams)) {
  await page.setContent(`<!doctype html><meta charset="utf-8">
    <body style="margin:0;padding:32px;background:#fff;font-family:Arial,sans-serif">
    <pre class="mermaid">${definition.replace(/</g, "&lt;")}</pre>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base",
        themeVariables: { primaryColor: "#ccfbf1", primaryBorderColor: "#0f766e", lineColor: "#475569", fontSize: "16px" },
        flowchart: { htmlLabels: true, curve: "basis" } });
      mermaid.run().then(() => (document.body.dataset.done = "1"));
    </script></body>`);
  await page.waitForFunction(() => document.body.dataset.done === "1");
  await page.locator("pre.mermaid svg").screenshot({ path: `docs/diagrams/${name}.png` });
  console.log(`wrote docs/diagrams/${name}.png`);
}
await browser.close();
