export function AppHeader() {
  return (
    <header>
      <h1 className="gradient-text" style={{ fontSize: "2rem", margin: "0 0 0.35rem" }}>
        Tokenizer Lab
      </h1>
      <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "60ch" }}>
        Type text or upload a TXT/PDF document, then tokenize it with the real Tiktoken
        (cl100k_base) encoding or an application-owned, deterministic Custom Tokenizer — and see
        exactly how your text becomes tokens.
      </p>
    </header>
  );
}
