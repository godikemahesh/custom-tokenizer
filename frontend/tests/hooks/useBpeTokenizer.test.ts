import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBpeTokenizer } from "../../src/hooks/useBpeTokenizer";

const UNTRAINED_STATE = {
  trained: false,
  vocabulary: [],
  merge_rules: [],
  target_vocab_size: null,
  achieved_vocab_size: null,
  target_reached: null,
};

const TRAINED_STATE = {
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
  original_text: "abz",
  source_type: "text",
  tokenizer_mode: "custom",
  custom_sub_mode: "bpe",
  encoding: null,
  extracted_text: null,
  character_count: 3,
  word_count: 1,
  token_count: 2,
  tokens_per_word: 2,
  tokens_per_character: 0.67,
  tokens: [
    { index: 0, id: 2, text: "ab", is_new: null, is_unknown: false },
    { index: 1, id: null, text: "z", is_new: null, is_unknown: true },
  ],
};

function jsonResponse(ok: boolean, body: unknown) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

function mockFetchRouter(overrides: {
  bpeState?: () => Promise<Response>;
  train?: () => Promise<Response>;
  tokenize?: () => Promise<Response>;
}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/bpe/train")) {
      return (overrides.train ?? (() => jsonResponse(true, TRAINED_STATE)))();
    }
    if (url.includes("/api/bpe/vocabulary")) {
      return (overrides.bpeState ?? (() => jsonResponse(true, UNTRAINED_STATE)))();
    }
    if (url.includes("/api/tokenize")) {
      return (overrides.tokenize ?? (() => jsonResponse(true, BPE_TOKENIZE_RESPONSE)))();
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
}

describe("useBpeTokenizer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle and loads the untrained model state on mount", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({}));

    const { result } = renderHook(() => useBpeTokenizer());
    expect(result.current.state.trainStatus).toBe("idle");

    await waitFor(() => expect(result.current.state.model).toEqual(UNTRAINED_STATE));
  });

  it("transitions idle -> training -> trained on a successful training call", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({}));

    const { result } = renderHook(() => useBpeTokenizer());
    act(() => result.current.setTrainingText("ab ab ab"));
    act(() => result.current.setTargetVocabSize(3));

    act(() => {
      void result.current.startTraining();
    });
    expect(result.current.state.trainStatus).toBe("training");

    await waitFor(() => expect(result.current.state.trainStatus).toBe("trained"));
    expect(result.current.state.model).toEqual(TRAINED_STATE);
  });

  it("transitions to error and surfaces the API message when training fails", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        train: () =>
          jsonResponse(false, {
            error_code: "EMPTY_TRAINING_TEXT",
            message: "Please enter some training text.",
          }),
      }),
    );

    const { result } = renderHook(() => useBpeTokenizer());
    act(() => {
      void result.current.startTraining();
    });

    await waitFor(() => expect(result.current.state.trainStatus).toBe("error"));
    expect(result.current.state.trainError).toBe("Please enter some training text.");
  });

  it("keeps the tokenize flow's status independent of the training flow's status", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({ bpeState: () => jsonResponse(true, TRAINED_STATE) }));

    const { result } = renderHook(() => useBpeTokenizer());
    await waitFor(() => expect(result.current.state.model).toEqual(TRAINED_STATE));

    act(() => result.current.setBpeText("abz"));
    act(() => {
      void result.current.tokenizeWithBpe();
    });
    expect(result.current.state.tokenizeStatus).toBe("loading");
    expect(result.current.state.trainStatus).toBe("trained"); // untouched by the tokenize call

    await waitFor(() => expect(result.current.state.tokenizeStatus).toBe("success"));
    expect(result.current.state.bpeResult).toEqual(BPE_TOKENIZE_RESPONSE);
  });

  it("transitions the tokenize flow to error and surfaces the API message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        tokenize: () =>
          jsonResponse(false, {
            error_code: "NO_TRAINED_BPE_MODEL",
            message: "No BPE tokenizer has been trained yet.",
          }),
      }),
    );

    const { result } = renderHook(() => useBpeTokenizer());
    act(() => {
      void result.current.tokenizeWithBpe();
    });

    await waitFor(() => expect(result.current.state.tokenizeStatus).toBe("error"));
    expect(result.current.state.bpeError).toBe("No BPE tokenizer has been trained yet.");
  });
});
