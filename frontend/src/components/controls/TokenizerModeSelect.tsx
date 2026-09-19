import type { TokenizerMode } from "../../types/tokenizer";

interface TokenizerModeSelectProps {
  tokenizerMode: TokenizerMode;
  onChange: (mode: TokenizerMode) => void;
}

export function TokenizerModeSelect({ tokenizerMode, onChange }: TokenizerModeSelectProps) {
  return (
    <div>
      <label htmlFor="tokenizer-mode-select" className="section-title" style={{ display: "block" }}>
        Tokenizer
      </label>
      <select
        id="tokenizer-mode-select"
        value={tokenizerMode}
        onChange={(event) => onChange(event.target.value as TokenizerMode)}
        style={{
          background: "var(--surface-raised)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.5rem 0.75rem",
          width: "100%",
        }}
      >
        <option value="tiktoken">Tiktoken</option>
        <option value="custom">Custom Tokenizer</option>
      </select>
    </div>
  );
}
