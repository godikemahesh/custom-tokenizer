import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBanner } from "../../src/components/feedback/ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the provided error message (FR-032)", () => {
    render(<ErrorBanner message="Please enter some text or upload a file before tokenizing." />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter some text or upload a file before tokenizing.",
    );
  });
});
