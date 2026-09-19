import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BpeMergeRulesTable } from "../../src/components/bpe/BpeMergeRulesTable";
import type { BpeMergeRule } from "../../src/types/bpe";

describe("BpeMergeRulesTable", () => {
  it("shows an empty-state message when there are no merge rules", () => {
    render(
      <BpeMergeRulesTable
        mergeRules={[]}
        targetVocabSize={null}
        achievedVocabSize={null}
        targetReached={null}
      />,
    );
    expect(screen.getByText(/no merge rules yet/i)).toBeInTheDocument();
  });

  it("renders each merge rule's step, pair, and result (FR-050, FR-051)", () => {
    const mergeRules: BpeMergeRule[] = [
      { order: 0, left: "a", right: "b", merged: "ab", id: 3 },
    ];
    const { container } = render(
      <BpeMergeRulesTable
        mergeRules={mergeRules}
        targetVocabSize={4}
        achievedVocabSize={4}
        targetReached={true}
      />,
    );

    expect(container.textContent).toContain('"a" + "b"');
    expect(container.textContent).toContain('"ab"');
    expect(container.textContent).toContain("(3)");
    expect(screen.queryByText(/was not fully reached/i)).not.toBeInTheDocument();
  });

  it("shows a target-not-reached note when the target vocabulary size was not fully reached", () => {
    render(
      <BpeMergeRulesTable
        mergeRules={[]}
        targetVocabSize={100}
        achievedVocabSize={5}
        targetReached={false}
      />,
    );

    expect(screen.getByText(/was not fully reached/i)).toBeInTheDocument();
  });
});
