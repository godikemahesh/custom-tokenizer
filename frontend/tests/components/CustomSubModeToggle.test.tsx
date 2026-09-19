import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomSubModeToggle } from "../../src/components/controls/CustomSubModeToggle";

describe("CustomSubModeToggle", () => {
  it("marks the current sub-mode as checked", () => {
    render(<CustomSubModeToggle customSubMode="bpe" onChange={() => {}} />);

    expect(screen.getByRole("radio", { name: "BPE" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Simple" })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the clicked sub-mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomSubModeToggle customSubMode="simple" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "BPE" }));
    expect(onChange).toHaveBeenCalledWith("bpe");
  });
});
