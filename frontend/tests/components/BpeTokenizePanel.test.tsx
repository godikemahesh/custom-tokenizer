import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BpeTokenizePanel } from "../../src/components/bpe/BpeTokenizePanel";

describe("BpeTokenizePanel", () => {
  it("shows an explanatory message and no input when untrained", () => {
    render(
      <BpeTokenizePanel
        text=""
        trained={false}
        disabled={false}
        onTextChange={() => {}}
        onTokenize={() => {}}
      />,
    );

    expect(screen.getByText(/train a bpe tokenizer above/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tokenize with bpe/i })).not.toBeInTheDocument();
  });

  it("disables the tokenize control when the text is empty", () => {
    render(
      <BpeTokenizePanel
        text=""
        trained={true}
        disabled={false}
        onTextChange={() => {}}
        onTokenize={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /tokenize with bpe/i })).toBeDisabled();
  });

  it("calls onTokenize when clicked with trained model and non-empty text", async () => {
    const user = userEvent.setup();
    const onTokenize = vi.fn();
    render(
      <BpeTokenizePanel
        text="abz"
        trained={true}
        disabled={false}
        onTextChange={() => {}}
        onTokenize={onTokenize}
      />,
    );

    await user.click(screen.getByRole("button", { name: /tokenize with bpe/i }));
    expect(onTokenize).toHaveBeenCalledOnce();
  });
});
