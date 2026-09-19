import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileUploadPanel } from "../../src/components/input/FileUploadPanel";

describe("FileUploadPanel", () => {
  it("calls onChange with the selected file", () => {
    const onChange = vi.fn();
    render(<FileUploadPanel file={null} onChange={onChange} />);

    const file = new File(["hello"], "sample.txt", { type: "text/plain" });
    const input = screen.getByLabelText(/upload a \.txt or \.pdf file/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("shows the selected file name when a file is provided", () => {
    const file = new File(["hello"], "sample.txt", { type: "text/plain" });
    render(<FileUploadPanel file={file} onChange={vi.fn()} />);

    expect(screen.getByText(/sample\.txt/)).toBeInTheDocument();
  });
});
