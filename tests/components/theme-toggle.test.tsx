// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";

function mockDeviceTheme(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    document.cookie = "theme=; path=/; max-age=0";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("switches from the device's light theme to dark and remembers it", async () => {
    mockDeviceTheme(false);
    render(<ThemeToggle initial={null} />);
    const button = screen.getByRole("button", { name: "Dark theme" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(button);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("switches a dark device to light", async () => {
    mockDeviceTheme(true);
    render(<ThemeToggle initial={null} />);
    const button = screen.getByRole("button", { name: "Dark theme" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.setup().click(button);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.cookie).toContain("theme=light");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
