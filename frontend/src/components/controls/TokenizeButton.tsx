interface TokenizeButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function TokenizeButton({ disabled, onClick }: TokenizeButtonProps) {
  return (
    <button type="button" className="btn btn-primary" disabled={disabled} onClick={onClick}>
      Tokenize
    </button>
  );
}
