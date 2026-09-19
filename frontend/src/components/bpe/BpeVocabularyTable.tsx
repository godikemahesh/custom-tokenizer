import type { BpeVocabularyEntry } from "../../types/bpe";

interface BpeVocabularyTableProps {
  entries: BpeVocabularyEntry[];
}

export function BpeVocabularyTable({ entries }: BpeVocabularyTableProps) {
  if (entries.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        No BPE vocabulary yet — train a BPE tokenizer to see its learned symbols here.
      </p>
    );
  }

  return (
    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: "0.4rem" }}>ID</th>
            <th style={{ padding: "0.4rem" }}>Symbol</th>
            <th style={{ padding: "0.4rem" }}>Origin</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>{entry.id}</td>
              <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                {JSON.stringify(entry.symbol)}
              </td>
              <td style={{ padding: "0.4rem" }}>
                <span className="badge">{entry.is_base ? "base" : "merged"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
