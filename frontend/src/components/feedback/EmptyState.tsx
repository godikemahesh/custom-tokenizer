export function EmptyState() {
  return (
    <div className="card" role="status">
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        Enter some text or upload a TXT/PDF file, then click Tokenize to see the results here.
      </p>
    </div>
  );
}
