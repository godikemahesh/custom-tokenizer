import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

const TOKENIZE_RESPONSE = {
  original_text: "Hello",
  source_type: "text",
  tokenizer_mode: "tiktoken",
  encoding: "cl100k_base",
  extracted_text: null,
  character_count: 5,
  word_count: 1,
  token_count: 1,
  tokens_per_word: 1,
  tokens_per_character: 0.2,
  tokens: [{ index: 0, id: 9906, text: "Hello", is_new: null }],
};

function mockFetch() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/tokenize")) {
      return Promise.resolve({ ok: true, json: async () => TOKENIZE_RESPONSE } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => [] } as Response);
  });
}

const UNTRAINED_BPE_STATE = {
  trained: false,
  vocabulary: [],
  merge_rules: [],
  target_vocab_size: null,
  achieved_vocab_size: null,
  target_reached: null,
};

const TRAINED_BPE_STATE = {
  trained: true,
  vocabulary: [
    { id: 0, symbol: "a", is_base: true },
    { id: 1, symbol: "b", is_base: true },
    { id: 2, symbol: "ab", is_base: false },
  ],
  merge_rules: [{ order: 0, left: "a", right: "b", merged: "ab", id: 2 }],
  target_vocab_size: 3,
  achieved_vocab_size: 3,
  target_reached: true,
};

const BPE_TOKENIZE_RESPONSE = {
  original_text: "ab",
  source_type: "text",
  tokenizer_mode: "custom",
  custom_sub_mode: "bpe",
  encoding: null,
  extracted_text: null,
  character_count: 2,
  word_count: 1,
  token_count: 1,
  tokens_per_word: 1,
  tokens_per_character: 0.5,
  tokens: [{ index: 0, id: 2, text: "ab", is_new: null, is_unknown: false }],
};

function mockFetchWithBpe() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/bpe/train")) {
      return Promise.resolve({ ok: true, json: async () => TRAINED_BPE_STATE } as Response);
    }
    if (url.includes("/api/bpe/vocabulary")) {
      return Promise.resolve({ ok: true, json: async () => UNTRAINED_BPE_STATE } as Response);
    }
    if (url.includes("/api/tokenize")) {
      return Promise.resolve({ ok: true, json: async () => BPE_TOKENIZE_RESPONSE } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => [] } as Response);
  });
}

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the required UI elements (FR-031): title, description, input, mode/encoding selectors, tokenize button", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);

    expect(screen.getByRole("heading", { name: /tokenizer lab/i })).toBeInTheDocument();
    expect(screen.getByText(/type text or upload a txt\/pdf document/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /input mode/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/text to tokenize/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tokenizer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/encoding/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tokenize/i })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/enter some text/i)).toBeInTheDocument());
  });

  it("goes from empty state to showing statistics and tokens after a successful tokenize (FR-033)", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/text to tokenize/i), "Hello");
    await user.click(screen.getByRole("button", { name: /tokenize/i }));

    await waitFor(() => expect(screen.getByText("Statistics")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Tokens" })).toBeInTheDocument();
  });

  it("separates the BPE training flow from the BPE tokenization flow and reuses the result table (FR-059)", async () => {
    vi.stubGlobal("fetch", mockFetchWithBpe());
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/^tokenizer$/i), "custom");
    await user.click(screen.getByRole("radio", { name: "BPE" }));

    // The main typed-text input/tokenize control disappear in BPE sub-mode (FR-059's separation).
    expect(screen.queryByLabelText(/text to tokenize/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^tokenize$/i })).not.toBeInTheDocument();

    // BPE tokenization is disabled with an explanatory message until a model is trained.
    expect(screen.getByText(/train a bpe tokenizer above/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/training text/i), "ab ab ab");
    await user.click(screen.getByRole("button", { name: /start bpe training/i }));

    await waitFor(() => expect(screen.getByLabelText(/text to tokenize with the trained bpe/i)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /learned vocabulary/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /merge rules/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/text to tokenize with the trained bpe/i), "ab");
    await user.click(screen.getByRole("button", { name: /tokenize with bpe/i }));

    await waitFor(() => expect(screen.getByText("Statistics")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Tokens" })).toBeInTheDocument();
  });
});
