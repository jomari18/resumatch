// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ResumeInput } from "@/components/ResumeInput";

function Harness() {
  const [value, setValue] = useState("");
  return <ResumeInput value={value} onChange={setValue} />;
}

describe("ResumeInput", () => {
  it("selects the Paste tab by default and moves to Upload with ArrowRight", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const paste = screen.getByRole("tab", { name: "Paste text" });
    expect(paste).toHaveAttribute("aria-selected", "true");
    paste.focus();
    await user.keyboard("{ArrowRight}");
    const upload = screen.getByRole("tab", { name: "Upload PDF" });
    expect(upload).toHaveFocus();
    expect(upload).toHaveAttribute("aria-selected", "true");
  });

  it("shows a live character counter", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText("0 / 15,000")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Resume" }), "abc");
    expect(screen.getByText("3 / 15,000")).toBeInTheDocument();
  });

  it("shows the too-short message only after blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole("textbox", { name: "Resume" }), "short resume");
    expect(screen.queryByText(/at least 200/)).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText("Resume must be at least 200 characters.")).toBeInTheDocument();
  });
});

describe("ResumeInput PDF failures", () => {
  it("shows the can't-open message and re-enables the file input when reading throws", async () => {
    vi.doMock("@/lib/pdf/extract-text", () => ({
      extractPdfText: async () => {
        throw new Error("chunk failed");
      },
    }));
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Upload PDF" }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("This PDF can't be opened here. Use a text-based PDF under 5 MB, or paste your resume.")).toBeInTheDocument();
    expect(input).toBeEnabled();
    vi.doUnmock("@/lib/pdf/extract-text");
  });
});
