import type { TokenItem } from "../../types/tokenizer";

interface TokenVisualizerProps {
  tokens: TokenItem[];
}

export function TokenVisualizer({ tokens }: TokenVisualizerProps) {
  return (
    <div className="card">
      <h2 className="section-title">Tokens</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {tokens.map((token) => (
          <span
            key={token.index}
            className={token.is_new ? "neon-border" : token.is_unknown ? "neon-border-unknown" : ""}
            title={`index ${token.index} · id ${token.id ?? "none"}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.6rem",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-raised)",
              border: token.is_new || token.is_unknown ? undefined : "1px solid transparent",
              fontFamily: "monospace",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>#{token.index}</span>
            <span>{JSON.stringify(token.text)}</span>
            <span style={{ color: "var(--accent-secondary)" }}>({token.id ?? "—"})</span>
            {token.is_new === true && <span className="badge badge-new">new</span>}
            {token.is_unknown === true && <span className="badge badge-unknown">unknown</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
