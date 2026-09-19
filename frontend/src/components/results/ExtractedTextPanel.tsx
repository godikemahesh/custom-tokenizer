interface ExtractedTextPanelProps {
  extractedText: string;
}

export function ExtractedTextPanel({ extractedText }: ExtractedTextPanelProps) {
  return (
    <div className="card">
      <h2 className="section-title">Extracted text</h2>
      <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--text-primary)" }}>
        {extractedText}
      </p>
    </div>
  );
}
