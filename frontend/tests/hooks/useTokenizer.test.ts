import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTokenizer } from "../../src/hooks/useTokenizer";

const TIKTOKEN_RESPONSE = {
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

function jsonResponse(ok: boolean, body: unknown) {
  return Promise.resolve({ ok, json: async () => body } as Response);
}

/** Routes mock fetch calls by URL/method so the hook's on-mount vocabulary fetch doesn't
 * interfere with a test's own tokenize/vocabulary expectations. */
function mockFetchRouter(overrides: {
  tokenize?: () => Promise<Response>;
  vocabulary?: () => Promise<Response>;
}) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/tokenize")) {
      return (overrides.tokenize ?? (() => jsonResponse(true, TIKTOKEN_RESPONSE)))();
    }
    if (url.includes("/api/vocabulary/reset")) {
      return jsonResponse(true, { message: "reset", vocabulary: [] });
    }
    if (url.includes("/api/vocabulary")) {
      return (overrides.vocabulary ?? (() => jsonResponse(true, [])))();
    }
    throw new Error(`Unexpected fetch call: ${String(init?.method)} ${url}`);
  });
}

describe("useTokenizer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle and fetches the vocabulary once on mount", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({}));

    const { result } = renderHook(() => useTokenizer());
    expect(result.current.state.status).toBe("idle");

    await waitFor(() => expect(result.current.state.vocabulary).toEqual([]));
  });

  it("transitions idle -> loading -> success on a successful tokenize call", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({}));

    const { result } = renderHook(() => useTokenizer());
    act(() => result.current.setText("Hello"));

    act(() => {
      void result.current.submit();
    });
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state.result).toEqual(TIKTOKEN_RESPONSE);
  });

  it("transitions to error and surfaces the API message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        tokenize: () =>
          jsonResponse(false, { error_code: "EMPTY_INPUT", message: "Please enter some text." }),
      }),
    );

    const { result } = renderHook(() => useTokenizer());
    act(() => {
      void result.current.submit();
    });

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.error).toBe("Please enter some text.");
  });

  it("refreshes the vocabulary after a successful Custom Tokenizer run", async () => {
    let vocabularyCallCount = 0;
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        tokenize: () =>
          jsonResponse(true, { ...TIKTOKEN_RESPONSE, tokenizer_mode: "custom", encoding: null }),
        vocabulary: () => {
          vocabularyCallCount += 1;
          return jsonResponse(true, [{ id: 0, token: "Hello", frequency: 1, status: "new" }]);
        },
      }),
    );

    const { result } = renderHook(() => useTokenizer());
    await waitFor(() => expect(vocabularyCallCount).toBe(1)); // mount fetch

    act(() => result.current.setTokenizerMode("custom"));
    act(() => result.current.setText("Hello"));
    act(() => {
      void result.current.submit();
    });

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await waitFor(() => expect(vocabularyCallCount).toBe(2)); // post-tokenize refresh
    expect(result.current.state.vocabulary).toEqual([
      { id: 0, token: "Hello", frequency: 1, status: "new" },
    ]);
  });

  it("clears the vocabulary when reset is called", async () => {
    vi.stubGlobal("fetch", mockFetchRouter({}));

    const { result } = renderHook(() => useTokenizer());
    await waitFor(() => expect(result.current.state.vocabulary).toEqual([]));

    act(() => {
      void result.current.resetVocabularyAction();
    });

    await waitFor(() => expect(result.current.state.vocabulary).toEqual([]));
  });
});
