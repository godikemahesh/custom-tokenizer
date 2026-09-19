import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TokenizeButton } from "../../src/components/controls/TokenizeButton";

describe("TokenizeButton", () => {
  it("is disabled when there is no input", () => {
    render(<TokenizeButton disabled onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /tokenize/i })).toBeDisabled();
  });

  it("is enabled and clickable when input is present", () => {
    const onClick = vi.fn();
    render(<TokenizeButton disabled={false} onClick={onClick} />);

    const button = screen.getByRole("button", { name: /tokenize/i });
    expect(button).toBeEnabled();

    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
