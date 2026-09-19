import type { BpeMergeRule } from "../../types/bpe";

interface BpeMergeRulesTableProps {
  mergeRules: BpeMergeRule[];
  targetVocabSize: number | null;
  achievedVocabSize: number | null;
  targetReached: boolean | null;
}

export function BpeMergeRulesTable({
  mergeRules,
  targetVocabSize,
  achievedVocabSize,
  targetReached,
}: BpeMergeRulesTableProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {targetReached === false && (
        <p style={{ color: "var(--accent-error)", margin: 0, fontSize: "0.85rem" }}>
          Target vocabulary size of {targetVocabSize} was not fully reached — the training text
          only supported {achievedVocabSize} entries.
        </p>
      )}

      {mergeRules.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          No merge rules yet — train a BPE tokenizer to see the ordered merges and per-step
          training details here.
        </p>
      ) : (
        <div style={{ maxHeight: "320px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.4rem" }}>Step</th>
                <th style={{ padding: "0.4rem" }}>Pair merged</th>
                <th style={{ padding: "0.4rem" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {mergeRules.map((rule) => (
                <tr key={rule.order} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>{rule.order}</td>
                  <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                    {JSON.stringify(rule.left)} + {JSON.stringify(rule.right)}
                  </td>
                  <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>
                    {JSON.stringify(rule.merged)} <span style={{ color: "var(--accent-secondary)" }}>({rule.id})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
