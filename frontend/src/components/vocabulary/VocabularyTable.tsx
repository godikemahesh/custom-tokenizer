import type { VocabularyEntry } from "../../types/tokenizer";

interface VocabularyTableProps {
  entries: VocabularyEntry[];
}

export function VocabularyTable({ entries }: VocabularyTableProps) {
  if (entries.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        No custom tokens yet — tokenize some text to start building the vocabulary.
      </p>
    );
  }

  return (
    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: "0.4rem" }}>ID</th>
            <th style={{ padding: "0.4rem" }}>Token</th>
            <th style={{ padding: "0.4rem" }}>Frequency</th>
            <th style={{ padding: "0.4rem" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={entry.status === "new" ? "neon-border" : undefined}
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>{entry.id}</td>
              <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                {JSON.stringify(entry.token)}
              </td>
              <td style={{ padding: "0.4rem" }}>{entry.frequency}</td>
              <td style={{ padding: "0.4rem" }}>
                <span className={`badge ${entry.status === "new" ? "badge-new" : ""}`}>
                  {entry.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
