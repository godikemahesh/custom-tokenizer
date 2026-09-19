import type { CustomSubMode } from "../../types/tokenizer";

interface CustomSubModeToggleProps {
  customSubMode: CustomSubMode;
  onChange: (mode: CustomSubMode) => void;
}

export function CustomSubModeToggle({ customSubMode, onChange }: CustomSubModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Custom Tokenizer sub-mode" style={{ display: "flex", gap: "0.5rem" }}>
      <button
        type="button"
        role="radio"
        aria-checked={customSubMode === "simple"}
        className={`btn ${customSubMode === "simple" ? "btn-primary" : ""}`}
        onClick={() => onChange("simple")}
      >
        Simple
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={customSubMode === "bpe"}
        className={`btn ${customSubMode === "bpe" ? "btn-primary" : ""}`}
        onClick={() => onChange("bpe")}
      >
        BPE
      </button>
    </div>
  );
}
