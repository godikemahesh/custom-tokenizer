import { useEffect, useReducer } from "react";
import {
  getVocabulary,
  postTokenize,
  resetVocabulary,
  TokenizerApiError,
} from "../api/tokenizerClient";
import {
  initialTokenizerState,
  tokenizerReducer,
  type InputMode,
} from "../state/tokenizerReducer";
import type { TokenizerMode } from "../types/tokenizer";

export function useTokenizer() {
  const [state, dispatch] = useReducer(tokenizerReducer, initialTokenizerState);

  async function refreshVocabulary() {
    try {
      const vocabulary = await getVocabulary();
      dispatch({ type: "VOCABULARY_LOADED", vocabulary });
    } catch {
      // Vocabulary is a supplementary view; a failed refresh should not block the main flow.
    }
  }

  // Fetch the vocabulary once on mount so it's visible even before the first tokenize (FR-023).
  useEffect(() => {
    void refreshVocabulary();
  }, []);

  function setInputMode(inputMode: InputMode) {
    dispatch({ type: "SET_INPUT_MODE", inputMode });
  }

  function setText(text: string) {
    dispatch({ type: "SET_TEXT", text });
  }

  function setFile(file: File | null) {
    dispatch({ type: "SET_FILE", file });
  }

  function setTokenizerMode(tokenizerMode: TokenizerMode) {
    dispatch({ type: "SET_TOKENIZER_MODE", tokenizerMode });
  }

  async function submit() {
    dispatch({ type: "TOKENIZE_START" });
    try {
      const result = await postTokenize({
        tokenizerMode: state.tokenizerMode,
        encoding: state.tokenizerMode === "tiktoken" ? state.encoding : undefined,
        text: state.inputMode === "text" ? state.text : undefined,
        file: state.inputMode === "file" ? (state.file ?? undefined) : undefined,
      });
      dispatch({ type: "TOKENIZE_SUCCESS", result });
      if (state.tokenizerMode === "custom") {
        // Keep the vocabulary view in sync immediately after a successful Custom Tokenizer run,
        // with no manual refresh required (FR-025).
        await refreshVocabulary();
      }
    } catch (error) {
      const message =
        error instanceof TokenizerApiError
          ? error.message
          : "Something went wrong. Please try again.";
      dispatch({ type: "TOKENIZE_ERROR", message });
    }
  }

  async function resetVocabularyAction() {
    try {
      const response = await resetVocabulary();
      dispatch({ type: "VOCABULARY_LOADED", vocabulary: response.vocabulary });
    } catch (error) {
      const message =
        error instanceof TokenizerApiError
          ? error.message
          : "Could not reset the vocabulary. Please try again.";
      dispatch({ type: "TOKENIZE_ERROR", message });
    }
  }

  return {
    state,
    setInputMode,
    setText,
    setFile,
    setTokenizerMode,
    submit,
    resetVocabularyAction,
  };
}
