import type { TokenizerMode } from "../../types/tokenizer";

interface EncodingSelectProps {
  tokenizerMode: TokenizerMode;
}

/** The application supports exactly one Tiktoken encoding (spec Clarifications), so this is a
 * fixed, disabled selector rather than a real choice — kept visible so users can see which
 * encoding produced their Tiktoken results. */
export function EncodingSelect({ tokenizerMode }: EncodingSelectProps) {
  if (tokenizerMode !== "tiktoken") {
    return null;
  }

  return (
    <div>
      <label htmlFor="encoding-select" className="section-title" style={{ display: "block" }}>
        Encoding
      </label>
      <select
        id="encoding-select"
        value="cl100k_base"
        disabled
        style={{
          background: "var(--surface-raised)",
          color: "var(--text-muted)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.5rem 0.75rem",
          width: "100%",
        }}
      >
        <option value="cl100k_base">cl100k_base</option>
      </select>
    </div>
  );
}
