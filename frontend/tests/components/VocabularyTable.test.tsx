import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VocabularyTable } from "../../src/components/vocabulary/VocabularyTable";
import type { VocabularyEntry } from "../../src/types/tokenizer";

describe("VocabularyTable", () => {
  it("shows an empty-state message when there are no entries", () => {
    render(<VocabularyTable entries={[]} />);
    expect(screen.getByText(/no custom tokens yet/i)).toBeInTheDocument();
  });

  it("renders id, token, frequency, and status for each entry", () => {
    const entries: VocabularyEntry[] = [
      { id: 0, token: "Hello", frequency: 3, status: "existing" },
      { id: 1, token: "world", frequency: 1, status: "new" },
    ];
    render(<VocabularyTable entries={entries} />);

    expect(screen.getByText('"Hello"')).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("existing")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });
});
