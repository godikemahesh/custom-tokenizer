import { useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { InputModeToggle } from "./components/input/InputModeToggle";
import { TextInputPanel } from "./components/input/TextInputPanel";
import { FileUploadPanel } from "./components/input/FileUploadPanel";
import { TokenizerModeSelect } from "./components/controls/TokenizerModeSelect";
import { CustomSubModeToggle } from "./components/controls/CustomSubModeToggle";
import { EncodingSelect } from "./components/controls/EncodingSelect";
import { TokenizeButton } from "./components/controls/TokenizeButton";
import { StatisticsPanel } from "./components/results/StatisticsPanel";
import { TokenVisualizer } from "./components/results/TokenVisualizer";
import { ExtractedTextPanel } from "./components/results/ExtractedTextPanel";
import { VocabularyTable } from "./components/vocabulary/VocabularyTable";
import { VocabularyResetButton } from "./components/vocabulary/VocabularyResetButton";
import { BpeTrainingPanel } from "./components/bpe/BpeTrainingPanel";
import { BpeVocabularyTable } from "./components/bpe/BpeVocabularyTable";
import { BpeMergeRulesTable } from "./components/bpe/BpeMergeRulesTable";
import { BpeTokenizePanel } from "./components/bpe/BpeTokenizePanel";
import { LoadingState } from "./components/feedback/LoadingState";
import { EmptyState } from "./components/feedback/EmptyState";
import { ErrorBanner } from "./components/feedback/ErrorBanner";
import { useTokenizer } from "./hooks/useTokenizer";
import { useBpeTokenizer } from "./hooks/useBpeTokenizer";
import type { CustomSubMode } from "./types/tokenizer";

export function App() {
  const {
    state,
    setInputMode,
    setText,
    setFile,
    setTokenizerMode,
    submit,
    resetVocabularyAction,
  } = useTokenizer();
  const bpe = useBpeTokenizer();
  const [customSubMode, setCustomSubMode] = useState<CustomSubMode>("simple");

  const hasInput = state.inputMode === "text" ? state.text.trim().length > 0 : state.file !== null;
  // The BPE sub-mode replaces the main input/tokenize flow with its own two regions (training and
  // BPE-tokenize) so the two flows never visually or functionally overlap (FR-059).
  const isBpeSubMode = state.tokenizerMode === "custom" && customSubMode === "bpe";
  const bpeModel = bpe.state.model;
  const isBpeTrained = bpeModel?.trained ?? false;

  return (
    <AppLayout>
      <div className="app-columns">
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!isBpeSubMode && (
            <>
              <InputModeToggle inputMode={state.inputMode} onChange={setInputMode} />
              {state.inputMode === "text" ? (
                <TextInputPanel text={state.text} onChange={setText} />
              ) : (
                <FileUploadPanel file={state.file} onChange={setFile} />
              )}
            </>
          )}

          <TokenizerModeSelect tokenizerMode={state.tokenizerMode} onChange={setTokenizerMode} />
          <EncodingSelect tokenizerMode={state.tokenizerMode} />
          {state.tokenizerMode === "custom" && (
            <CustomSubModeToggle customSubMode={customSubMode} onChange={setCustomSubMode} />
          )}

          {!isBpeSubMode && (
            <TokenizeButton disabled={!hasInput || state.status === "loading"} onClick={submit} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!isBpeSubMode && (
            <>
              {state.status === "idle" && <EmptyState />}
              {state.status === "loading" && <LoadingState />}
              {state.status === "error" && state.error && <ErrorBanner message={state.error} />}
              {state.status === "success" && state.result && (
                <>
                  {state.result.extracted_text && (
                    <ExtractedTextPanel extractedText={state.result.extracted_text} />
                  )}
                  <StatisticsPanel result={state.result} />
                  <TokenVisualizer tokens={state.result.tokens} />
                </>
              )}

              {state.tokenizerMode === "custom" && customSubMode === "simple" && (
                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h2 className="section-title" style={{ margin: 0 }}>
                      Custom Tokenizer vocabulary
                    </h2>
                    <VocabularyResetButton onReset={resetVocabularyAction} />
                  </div>
                  <VocabularyTable entries={state.vocabulary} />
                </div>
              )}
            </>
          )}

          {isBpeSubMode && (
            <>
              <div className="card">
                <h2 className="section-title" style={{ margin: "0 0 0.75rem" }}>
                  Train a BPE tokenizer
                </h2>
                <BpeTrainingPanel
                  trainingText={bpe.state.trainingText}
                  targetVocabSize={bpe.state.targetVocabSize}
                  disabled={bpe.state.trainStatus === "training"}
                  onTrainingTextChange={bpe.setTrainingText}
                  onTargetVocabSizeChange={bpe.setTargetVocabSize}
                  onStartTraining={bpe.startTraining}
                />
                <div style={{ marginTop: "1rem" }}>
                  {bpe.state.trainStatus === "training" && <LoadingState />}
                  {bpe.state.trainStatus === "error" && bpe.state.trainError && (
                    <ErrorBanner message={bpe.state.trainError} />
                  )}
                  {!isBpeTrained && bpe.state.trainStatus !== "training" && (
                    <p style={{ color: "var(--text-muted)", margin: 0 }} role="status">
                      No BPE tokenizer trained yet in this session.
                    </p>
                  )}
                </div>
              </div>

              {isBpeTrained && bpeModel && (
                <div className="card">
                  <h2 className="section-title">Learned vocabulary</h2>
                  <BpeVocabularyTable entries={bpeModel.vocabulary} />
                </div>
              )}

              {isBpeTrained && bpeModel && (
                <div className="card">
                  <h2 className="section-title">Merge rules &amp; training steps</h2>
                  <BpeMergeRulesTable
                    mergeRules={bpeModel.merge_rules}
                    targetVocabSize={bpeModel.target_vocab_size}
                    achievedVocabSize={bpeModel.achieved_vocab_size}
                    targetReached={bpeModel.target_reached}
                  />
                </div>
              )}

              <div className="card">
                <h2 className="section-title">Tokenize with the trained BPE tokenizer</h2>
                <BpeTokenizePanel
                  text={bpe.state.bpeText}
                  trained={isBpeTrained}
                  disabled={bpe.state.tokenizeStatus === "loading"}
                  onTextChange={bpe.setBpeText}
                  onTokenize={bpe.tokenizeWithBpe}
                />
                <div style={{ marginTop: "1rem" }}>
                  {bpe.state.tokenizeStatus === "loading" && <LoadingState />}
                  {bpe.state.tokenizeStatus === "error" && bpe.state.bpeError && (
                    <ErrorBanner message={bpe.state.bpeError} />
                  )}
                  {bpe.state.tokenizeStatus === "success" && bpe.state.bpeResult && (
                    <>
                      <StatisticsPanel result={bpe.state.bpeResult} />
                      <TokenVisualizer tokens={bpe.state.bpeResult.tokens} />
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
