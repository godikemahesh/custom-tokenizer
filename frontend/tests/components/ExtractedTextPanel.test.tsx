import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExtractedTextPanel } from "../../src/components/results/ExtractedTextPanel";

describe("ExtractedTextPanel", () => {
  it("renders the extracted text content", () => {
    render(<ExtractedTextPanel extractedText="The quick brown fox." />);
    expect(screen.getByText("The quick brown fox.")).toBeInTheDocument();
  });
});
