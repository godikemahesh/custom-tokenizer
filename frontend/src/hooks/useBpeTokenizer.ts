import { useEffect, useReducer } from "react";
import { BpeApiError, getBpeState, trainBpe } from "../api/bpeClient";
import { postTokenize, TokenizerApiError } from "../api/tokenizerClient";
import { bpeReducer, initialBpeState } from "../state/bpeReducer";

export function useBpeTokenizer() {
  const [state, dispatch] = useReducer(bpeReducer, initialBpeState);

  // Load whatever model already exists on mount, so a page refresh restores the trained/untrained
  // empty state instead of always starting blank (FR-053).
  useEffect(() => {
    async function loadModel() {
      try {
        const model = await getBpeState();
        dispatch({ type: "MODEL_LOADED", model });
      } catch {
        // The model status is a supplementary view; a failed load should not block the UI.
      }
    }
    void loadModel();
  }, []);

  function setTrainingText(trainingText: string) {
    dispatch({ type: "SET_TRAINING_TEXT", trainingText });
  }

  function setTargetVocabSize(targetVocabSize: number) {
    dispatch({ type: "SET_TARGET_VOCAB_SIZE", targetVocabSize });
  }

  async function startTraining() {
    dispatch({ type: "TRAIN_START" });
    try {
      const model = await trainBpe({
        trainingText: state.trainingText,
        vocabSize: state.targetVocabSize,
      });
      dispatch({ type: "TRAIN_SUCCESS", model });
    } catch (error) {
      const message =
        error instanceof BpeApiError ? error.message : "Something went wrong. Please try again.";
      dispatch({ type: "TRAIN_ERROR", message });
    }
  }

  function setBpeText(bpeText: string) {
    dispatch({ type: "SET_BPE_TEXT", bpeText });
  }

  async function tokenizeWithBpe() {
    dispatch({ type: "BPE_TOKENIZE_START" });
    try {
      const result = await postTokenize({
        tokenizerMode: "custom",
        customSubMode: "bpe",
        text: state.bpeText,
      });
      dispatch({ type: "BPE_TOKENIZE_SUCCESS", result });
    } catch (error) {
      const message =
        error instanceof TokenizerApiError
          ? error.message
          : "Something went wrong. Please try again.";
      dispatch({ type: "BPE_TOKENIZE_ERROR", message });
    }
  }

  return {
    state,
    setTrainingText,
    setTargetVocabSize,
    startTraining,
    setBpeText,
    tokenizeWithBpe,
  };
}
