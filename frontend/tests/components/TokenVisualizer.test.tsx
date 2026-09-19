import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TokenVisualizer } from "../../src/components/results/TokenVisualizer";
import type { TokenItem } from "../../src/types/tokenizer";

describe("TokenVisualizer", () => {
  it("renders every token's text and id", () => {
    const tokens: TokenItem[] = [
      { index: 0, id: 9906, text: "Hello", is_new: null },
      { index: 1, id: 11, text: ",", is_new: null },
    ];
    render(<TokenVisualizer tokens={tokens} />);

    expect(screen.getByText('"Hello"')).toBeInTheDocument();
    expect(screen.getByText("(9906)")).toBeInTheDocument();
  });

  it('shows a "new" badge only for tokens flagged is_new', () => {
    const tokens: TokenItem[] = [
      { index: 0, id: 0, text: "fresh", is_new: true },
      { index: 1, id: 1, text: "known", is_new: false },
    ];
    render(<TokenVisualizer tokens={tokens} />);

    expect(screen.getAllByText("new")).toHaveLength(1);
  });

  it('shows an "unknown" badge, distinct from "new", for BPE tokens flagged is_unknown', () => {
    const tokens: TokenItem[] = [
      { index: 0, id: 2, text: "ab", is_new: null, is_unknown: false },
      { index: 1, id: null, text: "z", is_new: null, is_unknown: true },
    ];
    render(<TokenVisualizer tokens={tokens} />);

    expect(screen.getAllByText("unknown")).toHaveLength(1);
    expect(screen.queryByText("new")).not.toBeInTheDocument();
  });

  it("renders an em dash for a null id instead of a raw empty value", () => {
    const tokens: TokenItem[] = [{ index: 0, id: null, text: "z", is_new: null, is_unknown: true }];
    render(<TokenVisualizer tokens={tokens} />);

    expect(screen.getByText("(—)")).toBeInTheDocument();
  });
});
