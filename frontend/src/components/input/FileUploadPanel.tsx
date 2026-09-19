interface FileUploadPanelProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function FileUploadPanel({ file, onChange }: FileUploadPanelProps) {
  return (
    <div>
      <label htmlFor="tokenizer-file-input" className="section-title" style={{ display: "block" }}>
        Upload a .txt or .pdf file (max 5MB)
      </label>
      <input
        id="tokenizer-file-input"
        type="file"
        accept=".txt,.pdf,text/plain,application/pdf"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        style={{ color: "var(--text-primary)" }}
      />
      {file && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
        </p>
      )}
    </div>
  );
}
