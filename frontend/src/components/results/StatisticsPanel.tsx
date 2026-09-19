import type { TokenizeResponse } from "../../types/tokenizer";

interface StatisticsPanelProps {
  result: TokenizeResponse;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700 }} className="gradient-text">
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

export function StatisticsPanel({ result }: StatisticsPanelProps) {
  return (
    <div className="card">
      <h2 className="section-title">Statistics</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "1rem",
        }}
      >
        <Stat label="Characters" value={result.character_count} />
        <Stat label="Words" value={result.word_count} />
        <Stat label="Tokens" value={result.token_count} />
        <Stat label="Tokens / word" value={result.tokens_per_word.toFixed(2)} />
        <Stat label="Tokens / character" value={result.tokens_per_character.toFixed(2)} />
      </div>
    </div>
  );
}
