import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatisticsPanel } from "../../src/components/results/StatisticsPanel";
import type { TokenizeResponse } from "../../src/types/tokenizer";

const RESULT: TokenizeResponse = {
  original_text: "Hello, world!",
  source_type: "text",
  tokenizer_mode: "tiktoken",
  encoding: "cl100k_base",
  extracted_text: null,
  character_count: 13,
  word_count: 2,
  token_count: 4,
  tokens_per_word: 2,
  tokens_per_character: 0.31,
  tokens: [],
};

describe("StatisticsPanel", () => {
  it("renders character, word, and token counts and ratios (FR-028)", () => {
    render(<StatisticsPanel result={RESULT} />);

    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2.00")).toBeInTheDocument();
    expect(screen.getByText("0.31")).toBeInTheDocument();
  });
});
