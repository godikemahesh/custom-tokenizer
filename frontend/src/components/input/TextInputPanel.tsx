interface TextInputPanelProps {
  text: string;
  onChange: (text: string) => void;
}

export function TextInputPanel({ text, onChange }: TextInputPanelProps) {
  return (
    <div>
      <label htmlFor="tokenizer-text-input" className="section-title" style={{ display: "block" }}>
        Text to tokenize
      </label>
      <textarea
        id="tokenizer-text-input"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or paste text here…"
        rows={8}
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
  );
}
