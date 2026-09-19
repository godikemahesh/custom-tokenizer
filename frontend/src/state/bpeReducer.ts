import type { BpeStateResponse } from "../types/bpe";
import type { TokenizeResponse } from "../types/tokenizer";

export type TrainStatus = "idle" | "training" | "trained" | "error";
export type BpeTokenizeStatus = "idle" | "loading" | "success" | "error";

export interface BpeState {
  trainingText: string;
  targetVocabSize: number;
  trainStatus: TrainStatus;
  trainError: string | null;
  model: BpeStateResponse | null;
  bpeText: string;
  tokenizeStatus: BpeTokenizeStatus;
  bpeResult: TokenizeResponse | null;
  bpeError: string | null;
}

export const initialBpeState: BpeState = {
  trainingText: "",
  targetVocabSize: 50,
  trainStatus: "idle",
  trainError: null,
  model: null,
  bpeText: "",
  tokenizeStatus: "idle",
  bpeResult: null,
  bpeError: null,
};

export type BpeAction =
  | { type: "SET_TRAINING_TEXT"; trainingText: string }
  | { type: "SET_TARGET_VOCAB_SIZE"; targetVocabSize: number }
  | { type: "TRAIN_START" }
  | { type: "TRAIN_SUCCESS"; model: BpeStateResponse }
  | { type: "TRAIN_ERROR"; message: string }
  | { type: "MODEL_LOADED"; model: BpeStateResponse }
  | { type: "SET_BPE_TEXT"; bpeText: string }
  | { type: "BPE_TOKENIZE_START" }
  | { type: "BPE_TOKENIZE_SUCCESS"; result: TokenizeResponse }
  | { type: "BPE_TOKENIZE_ERROR"; message: string };

// Training and tokenize status are tracked independently so the two BPE flows never share or
// clobber each other's loading/empty/error/success state (FR-059, FR-060).
export function bpeReducer(state: BpeState, action: BpeAction): BpeState {
  switch (action.type) {
    case "SET_TRAINING_TEXT":
      return { ...state, trainingText: action.trainingText };
    case "SET_TARGET_VOCAB_SIZE":
      return { ...state, targetVocabSize: action.targetVocabSize };
    case "TRAIN_START":
      return { ...state, trainStatus: "training", trainError: null };
    case "TRAIN_SUCCESS":
      return { ...state, trainStatus: "trained", model: action.model, trainError: null };
    case "TRAIN_ERROR":
      return { ...state, trainStatus: "error", trainError: action.message };
    case "MODEL_LOADED":
      return {
        ...state,
        model: action.model,
        trainStatus: action.model.trained ? "trained" : state.trainStatus,
      };
    case "SET_BPE_TEXT":
      return { ...state, bpeText: action.bpeText };
    case "BPE_TOKENIZE_START":
      return { ...state, tokenizeStatus: "loading", bpeError: null };
    case "BPE_TOKENIZE_SUCCESS":
      return { ...state, tokenizeStatus: "success", bpeResult: action.result, bpeError: null };
    case "BPE_TOKENIZE_ERROR":
      return { ...state, tokenizeStatus: "error", bpeError: action.message };
    default:
      return state;
  }
}
