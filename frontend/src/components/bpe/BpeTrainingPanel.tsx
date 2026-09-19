interface BpeTrainingPanelProps {
  trainingText: string;
  targetVocabSize: number;
  disabled: boolean;
  onTrainingTextChange: (text: string) => void;
  onTargetVocabSizeChange: (size: number) => void;
  onStartTraining: () => void;
}

export function BpeTrainingPanel({
  trainingText,
  targetVocabSize,
  disabled,
  onTrainingTextChange,
  onTargetVocabSizeChange,
  onStartTraining,
}: BpeTrainingPanelProps) {
  const canTrain = trainingText.trim().length > 0 && targetVocabSize > 0 && !disabled;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <label htmlFor="bpe-training-text" className="section-title" style={{ display: "block" }}>
          Training text
        </label>
        <textarea
          id="bpe-training-text"
          value={trainingText}
          onChange={(event) => onTrainingTextChange(event.target.value)}
          placeholder="Paste or type the text to train the BPE tokenizer on…"
          rows={6}
          style={{
            width: "100%",
            resize: "vertical",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem",
            fontFamily: "inherit",
            fontSize: "0.95rem",
          }}
        />
      </div>

      <div>
        <label htmlFor="bpe-vocab-size" className="section-title" style={{ display: "block" }}>
          Target vocabulary size
        </label>
        <input
          id="bpe-vocab-size"
          type="number"
          min={1}
          value={targetVocabSize}
          onChange={(event) => onTargetVocabSizeChange(Number(event.target.value))}
          style={{
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 0.75rem",
            width: "100%",
          }}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canTrain}
        onClick={onStartTraining}
      >
        Start BPE training
      </button>
    </div>
  );
}
