import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VocabularyResetButton } from "../../src/components/vocabulary/VocabularyResetButton";

describe("VocabularyResetButton", () => {
  it("calls onReset when clicked", () => {
    const onReset = vi.fn();
    render(<VocabularyResetButton onReset={onReset} />);

    screen.getByRole("button", { name: /reset vocabulary/i }).click();

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
