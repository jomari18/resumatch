// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverLetterEditor } from "@/components/CoverLetterEditor";
import { RequirementList } from "@/components/RequirementList";
import { ScoreRing } from "@/components/ScoreRing";
import { ShareButton } from "@/components/ShareButton";
import type { AnalysisResult, Requirement } from "@/lib/ai/schema";

const createShare = vi.fn();
vi.mock("@/lib/client/api", () => ({ createShare: (...args: unknown[]) => createShare(...args) }));

afterEach(() => {
  createShare.mockReset();
  vi.restoreAllMocks();
});

const requirements: Requirement[] = [
  { skill: "React", importance: "required", status: "matched", evidence: "Built with React", evidenceVerified: true },
  { skill: "PostgreSQL", importance: "required", status: "partial", evidence: "Knows databases", evidenceVerified: false },
  { skill: "Docker", importance: "nice_to_have", status: "missing", evidence: null, evidenceVerified: false },
];

const analysis: AnalysisResult = {
  jobTitle: "Junior Web Developer",
  company: "Acme",
  requirements,
  suggestions: ["Lead with React."],
  coverLetter: "Original letter ".repeat(30),
};

describe("ScoreRing", () => {
  it("shows the score as text and in an accessible label", () => {
    render(<ScoreRing score={72} band="Good match" />);
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Match score 72 out of 100, Good match" })).toBeInTheDocument();
  });
});

describe("RequirementList", () => {
  it("labels each status in text", () => {
    render(<RequirementList requirements={requirements} />);
    expect(screen.getByText("Matched")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
  });

  it("flags quotes that were not found in the resume", () => {
    render(<RequirementList requirements={requirements} />);
    expect(screen.getAllByText("Not found word-for-word in your resume")).toHaveLength(1);
  });
});

describe("CoverLetterEditor", () => {
  it("copies the edited text", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CoverLetterEditor initial="Hello team" />);
    const box = screen.getByRole("textbox", { name: "Cover letter" });
    await user.clear(box);
    await user.type(box, "Edited letter");
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("Edited letter");
  });
});

describe("ShareButton", () => {
  it("explains what the link shows before creating it", () => {
    render(<ShareButton analysis={analysis} issuedAt="2026-10-19T03:00:00.000Z" signature="sig" />);
    expect(
      screen.getByText(
        "The link shows the original analysis and cover letter, not your edits. Anyone with the link can view it for 30 days.",
      ),
    ).toBeInTheDocument();
  });

  it("sends the original signed analysis", async () => {
    const user = userEvent.setup();
    createShare.mockResolvedValue({
      ok: true,
      data: { id: "abcdefghijkl", url: "https://x/r/abcdefghijkl", expiresAt: "2026-11-18T00:00:00.000Z", created: true, deleteToken: "t" },
    });
    render(<ShareButton analysis={analysis} issuedAt="2026-10-19T03:00:00.000Z" signature="sig" />);
    await user.click(screen.getByRole("button", { name: "Create share link" }));
    expect(createShare).toHaveBeenCalledWith({ analysis, issuedAt: "2026-10-19T03:00:00.000Z", signature: "sig" });
    expect(await screen.findByRole("link", { name: "https://x/r/abcdefghijkl" })).toBeInTheDocument();
  });

  it("points to the visible link when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    createShare.mockResolvedValue({
      ok: true,
      data: { id: "abcdefghijkl", url: "https://x/r/abcdefghijkl", expiresAt: "2026-11-18T00:00:00.000Z", created: true, deleteToken: "t" },
    });
    render(<ShareButton analysis={analysis} issuedAt="2026-10-19T03:00:00.000Z" signature="sig" />);
    await user.click(screen.getByRole("button", { name: "Create share link" }));
    expect(await screen.findByText("Copy the link above to share it.")).toBeInTheDocument();
  });
});
