interface BpeTokenizePanelProps {
  text: string;
  trained: boolean;
  disabled: boolean;
  onTextChange: (text: string) => void;
  onTokenize: () => void;
}

export function BpeTokenizePanel({
  text,
  trained,
  disabled,
  onTextChange,
  onTokenize,
}: BpeTokenizePanelProps) {
  if (!trained) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        Train a BPE tokenizer above before tokenizing new text with it.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <label htmlFor="bpe-tokenize-text" className="section-title" style={{ display: "block" }}>
          Text to tokenize with the trained BPE tokenizer
        </label>
        <textarea
          id="bpe-tokenize-text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Type or paste new text here…"
          rows={4}
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

      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled || text.trim().length === 0}
        onClick={onTokenize}
      >
        Tokenize with BPE
      </button>
    </div>
  );
}
