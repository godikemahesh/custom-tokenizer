import type { InputMode } from "../../state/tokenizerReducer";

interface InputModeToggleProps {
  inputMode: InputMode;
  onChange: (mode: InputMode) => void;
}

export function InputModeToggle({ inputMode, onChange }: InputModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Input mode" style={{ display: "flex", gap: "0.5rem" }}>
      <button
        type="button"
        role="radio"
        aria-checked={inputMode === "text"}
        className={`btn ${inputMode === "text" ? "btn-primary" : ""}`}
        onClick={() => onChange("text")}
      >
        Type text
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={inputMode === "file"}
        className={`btn ${inputMode === "file" ? "btn-primary" : ""}`}
        onClick={() => onChange("file")}
      >
        Upload file
      </button>
    </div>
  );
}
