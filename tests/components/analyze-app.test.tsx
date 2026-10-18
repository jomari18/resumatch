// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeApp } from "@/components/AnalyzeApp";

const analyze = vi.fn();
vi.mock("@/lib/client/api", () => ({ analyze: (...a: unknown[]) => analyze(...a), createShare: vi.fn() }));
vi.mock("@/components/MatchOrb", () => ({ MatchOrb: () => null }));

const RESUME = readFileSync("src/lib/ai/fixtures/sample-resume.txt", "utf8");
const JOB = "Junior Web Developer at Acme Digital. Requirements: React, PostgreSQL. Nice to have: Docker. Build web apps.";
const sample = JSON.parse(readFileSync("src/lib/ai/fixtures/sample-analysis.json", "utf8"));
const ok = {
  ok: true,
  data: {
    analysis: { ...sample, requirements: sample.requirements.map((r: object) => ({ ...r, evidenceVerified: true })) },
    score: 60,
    band: "Good match",
    issuedAt: "2026-10-19T03:00:00.000Z",
    signature: "sig",
  },
};

async function fillBoth(user: ReturnType<typeof userEvent.setup>) {
  // fireEvent-free fill: paste is much faster than typing 400+ characters
  await user.click(screen.getByRole("textbox", { name: "Resume" }));
  await user.paste(RESUME);
  await user.click(screen.getByRole("textbox", { name: "Job posting" }));
  await user.paste(JOB);
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
});
afterEach(() => analyze.mockReset());

describe("AnalyzeApp", () => {
  it("keeps one disabled, busy Analyze button while a request is pending and sends one request", async () => {
    const user = userEvent.setup();
    analyze.mockReturnValue(new Promise(() => {}));
    render(<AnalyzeApp />);
    await fillBoth(user);
    const button = screen.getByRole("button", { name: /Analyz/ });
    await user.dblClick(button);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Analyz/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Analyz/ })).toHaveAttribute("aria-busy", "true");
  });

  it("recovers when the request throws: shows an error and re-enables Analyze", async () => {
    const user = userEvent.setup();
    analyze.mockRejectedValue(new Error("boom"));
    render(<AnalyzeApp />);
    await fillBoth(user);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("The service is busy. Please try again in a few minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  });

  it("moves focus to the results heading when results arrive", async () => {
    const user = userEvent.setup();
    analyze.mockResolvedValue(ok);
    render(<AnalyzeApp />);
    await fillBoth(user);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Junior Web Developer/ })).toHaveFocus());
  });

  it("clears a field error as soon as the user edits that field", async () => {
    const user = userEvent.setup();
    render(<AnalyzeApp />);
    await user.click(screen.getByRole("textbox", { name: "Resume" }));
    await user.paste("too short");
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(screen.getByText("Resume must be at least 200 characters.")).toBeInTheDocument();
    await user.click(screen.getByRole("textbox", { name: "Resume" }));
    await user.paste(RESUME);
    expect(screen.queryByText("Resume must be at least 200 characters.")).not.toBeInTheDocument();
  });

  it("switches to the Paste tab so a resume error is visible", async () => {
    const user = userEvent.setup();
    render(<AnalyzeApp />);
    await user.click(screen.getByRole("tab", { name: "Upload PDF" }));
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(screen.getByRole("tab", { name: "Paste text" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Resume must be at least 200 characters.")).toBeVisible();
  });
});
