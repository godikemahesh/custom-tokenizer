export function LoadingState() {
  return (
    <div className="card neon-border" role="status" aria-live="polite">
      <p style={{ margin: 0, color: "var(--text-muted)" }}>Tokenizing your input…</p>
    </div>
  );
}
