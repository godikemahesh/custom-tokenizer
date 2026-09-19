import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BpeVocabularyTable } from "../../src/components/bpe/BpeVocabularyTable";
import type { BpeVocabularyEntry } from "../../src/types/bpe";

describe("BpeVocabularyTable", () => {
  it("shows an empty-state message when there are no entries", () => {
    render(<BpeVocabularyTable entries={[]} />);
    expect(screen.getByText(/no bpe vocabulary yet/i)).toBeInTheDocument();
  });

  it("renders id, symbol, and origin for each entry", () => {
    const entries: BpeVocabularyEntry[] = [
      { id: 0, symbol: "a", is_base: true },
      { id: 1, symbol: "b", is_base: true },
      { id: 2, symbol: "ab", is_base: false },
    ];
    render(<BpeVocabularyTable entries={entries} />);

    expect(screen.getByText('"ab"')).toBeInTheDocument();
    expect(screen.getAllByText("base")).toHaveLength(2);
    expect(screen.getByText("merged")).toBeInTheDocument();
  });
});
