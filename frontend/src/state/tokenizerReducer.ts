import type { TokenizeResponse, TokenizerMode, VocabularyEntry } from "../types/tokenizer";

export type InputMode = "text" | "file";
export type RequestStatus = "idle" | "loading" | "success" | "error";

export interface TokenizerState {
  inputMode: InputMode;
  text: string;
  file: File | null;
  tokenizerMode: TokenizerMode;
  encoding: "cl100k_base";
  status: RequestStatus;
  result: TokenizeResponse | null;
  error: string | null;
  vocabulary: VocabularyEntry[];
}

export const initialTokenizerState: TokenizerState = {
  inputMode: "text",
  text: "",
  file: null,
  tokenizerMode: "tiktoken",
  encoding: "cl100k_base",
  status: "idle",
  result: null,
  error: null,
  vocabulary: [],
};

export type TokenizerAction =
  | { type: "SET_INPUT_MODE"; inputMode: InputMode }
  | { type: "SET_TEXT"; text: string }
  | { type: "SET_FILE"; file: File | null }
  | { type: "SET_TOKENIZER_MODE"; tokenizerMode: TokenizerMode }
  | { type: "TOKENIZE_START" }
  | { type: "TOKENIZE_SUCCESS"; result: TokenizeResponse }
  | { type: "TOKENIZE_ERROR"; message: string }
  | { type: "VOCABULARY_LOADED"; vocabulary: VocabularyEntry[] };

export function tokenizerReducer(state: TokenizerState, action: TokenizerAction): TokenizerState {
  switch (action.type) {
    case "SET_INPUT_MODE":
      return { ...state, inputMode: action.inputMode };
    case "SET_TEXT":
      return { ...state, text: action.text };
    case "SET_FILE":
      return { ...state, file: action.file };
    case "SET_TOKENIZER_MODE":
      return { ...state, tokenizerMode: action.tokenizerMode };
    case "TOKENIZE_START":
      return { ...state, status: "loading", error: null };
    case "TOKENIZE_SUCCESS":
      return { ...state, status: "success", result: action.result, error: null };
    case "TOKENIZE_ERROR":
      return { ...state, status: "error", error: action.message };
    case "VOCABULARY_LOADED":
      return { ...state, vocabulary: action.vocabulary };
    default:
      return state;
  }
}
