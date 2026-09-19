interface VocabularyResetButtonProps {
  onReset: () => void;
  disabled?: boolean;
}

export function VocabularyResetButton({ onReset, disabled }: VocabularyResetButtonProps) {
  return (
    <button type="button" className="btn" onClick={onReset} disabled={disabled}>
      Reset vocabulary
    </button>
  );
}
