import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BpeTrainingPanel } from "../../src/components/bpe/BpeTrainingPanel";

describe("BpeTrainingPanel", () => {
  it("disables the start-training control when the training text is empty", () => {
    render(
      <BpeTrainingPanel
        trainingText=""
        targetVocabSize={50}
        disabled={false}
        onTrainingTextChange={() => {}}
        onTargetVocabSizeChange={() => {}}
        onStartTraining={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /start bpe training/i })).toBeDisabled();
  });

  it("disables the start-training control while a training run is in progress", () => {
    render(
      <BpeTrainingPanel
        trainingText="ab ab ab"
        targetVocabSize={50}
        disabled={true}
        onTrainingTextChange={() => {}}
        onTargetVocabSizeChange={() => {}}
        onStartTraining={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /start bpe training/i })).toBeDisabled();
  });

  it("never calls onStartTraining merely from entering text or a vocab size (FR-043)", async () => {
    const user = userEvent.setup();
    const onStartTraining = vi.fn();
    render(
      <BpeTrainingPanel
        trainingText=""
        targetVocabSize={50}
        disabled={false}
        onTrainingTextChange={() => {}}
        onTargetVocabSizeChange={() => {}}
        onStartTraining={onStartTraining}
      />,
    );

    await user.type(screen.getByLabelText(/training text/i), "ab ab");
    await user.clear(screen.getByLabelText(/target vocabulary size/i));
    await user.type(screen.getByLabelText(/target vocabulary size/i), "10");

    expect(onStartTraining).not.toHaveBeenCalled();
  });

  it("calls onStartTraining when clicked with valid input", async () => {
    const user = userEvent.setup();
    const onStartTraining = vi.fn();
    render(
      <BpeTrainingPanel
        trainingText="ab ab ab"
        targetVocabSize={50}
        disabled={false}
        onTrainingTextChange={() => {}}
        onTargetVocabSizeChange={() => {}}
        onStartTraining={onStartTraining}
      />,
    );

    await user.click(screen.getByRole("button", { name: /start bpe training/i }));
    expect(onStartTraining).toHaveBeenCalledOnce();
  });
});
