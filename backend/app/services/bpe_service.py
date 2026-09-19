from dataclasses import dataclass, field

from app.schemas.bpe import BpeMergeRule
from app.schemas.tokenize import TokenItem
from app.services.tokenizer_base import TokenizationOutcome

# Merges apply within whitespace-delimited words only, never across word boundaries — whitespace
# is the separator and is never a symbol, mirroring the Simple sub-mode's convention (FR-014) and
# the standard (Sennrich et al.) word-level BPE formulation (research.md #10).


@dataclass(frozen=True)
class BpeModelState:
    """The full learned state of one BPE training run (spec: "BPE Training Session")."""

    vocabulary: dict[str, int] = field(default_factory=dict)
    base_symbols: frozenset[str] = field(default_factory=frozenset)
    merge_rules: list[BpeMergeRule] = field(default_factory=list)
    target_vocab_size: int = 0
    achieved_vocab_size: int = 0


def _apply_merge(symbols: list[str], left: str, right: str, merged: str) -> list[str]:
    """Replaces every non-overlapping left-to-right occurrence of (left, right) with merged."""
    result: list[str] = []
    i = 0
    while i < len(symbols):
        if i < len(symbols) - 1 and symbols[i] == left and symbols[i + 1] == right:
            result.append(merged)
            i += 2
        else:
            result.append(symbols[i])
            i += 1
    return result


def count_distinct_characters(training_text: str) -> int:
    """Number of distinct base characters across the training text's words (used for FR-040's
    vocab-size-vs-base-alphabet validation, without running the full training loop)."""
    return len({ch for word in training_text.split() for ch in word})


def train_bpe(training_text: str, vocab_size: int) -> BpeModelState:
    """Runs word-level BPE training to (at most) `vocab_size` symbols (FR-045).

    Pure and deterministic: identical `(training_text, vocab_size)` always produces an identical
    `BpeModelState` (FR-052), thanks to sorted-codepoint base IDs and a lexicographic merge
    tie-break (FR-046, research.md #11).
    """
    words = training_text.split()

    word_frequency: dict[str, int] = {}
    for word in words:
        word_frequency[word] = word_frequency.get(word, 0) + 1

    word_symbols: dict[str, list[str]] = {word: list(word) for word in word_frequency}

    base_chars = sorted({ch for word in word_frequency for ch in word})
    vocabulary: dict[str, int] = {ch: index for index, ch in enumerate(base_chars)}
    base_symbols = frozenset(vocabulary.keys())
    merge_rules: list[BpeMergeRule] = []
    next_id = len(vocabulary)

    while len(vocabulary) < vocab_size:
        pair_counts: dict[tuple[str, str], int] = {}
        for word, frequency in word_frequency.items():
            symbols = word_symbols[word]
            for i in range(len(symbols) - 1):
                pair = (symbols[i], symbols[i + 1])
                pair_counts[pair] = pair_counts.get(pair, 0) + frequency

        if not pair_counts:
            break

        max_frequency = max(pair_counts.values())
        if max_frequency < 2:
            # No pair recurs anywhere in the training text — nothing left worth merging, so
            # further "merges" would be arbitrary rather than frequency-driven (FR-047).
            break

        best_pair = min(pair for pair, count in pair_counts.items() if count == max_frequency)
        left, right = best_pair
        merged = left + right

        vocabulary[merged] = next_id
        merge_rules.append(
            BpeMergeRule(order=len(merge_rules), left=left, right=right, merged=merged, id=next_id)
        )
        next_id += 1

        for word in word_symbols:
            word_symbols[word] = _apply_merge(word_symbols[word], left, right, merged)

    return BpeModelState(
        vocabulary=vocabulary,
        base_symbols=base_symbols,
        merge_rules=merge_rules,
        target_vocab_size=vocab_size,
        achieved_vocab_size=len(vocabulary),
    )


def tokenize_with_model(text: str, model: BpeModelState) -> TokenizationOutcome:
    """Applies only the learned merge rules, in learned order, to new text (FR-056).

    Never selects a new pair or mutates `model`; a character absent from the trained vocabulary
    cannot match any rule and so is emitted as its own token with `id=None, is_unknown=True`
    (FR-058).
    """
    tokens: list[TokenItem] = []
    index = 0

    for word in text.split():
        symbols = list(word)
        for rule in model.merge_rules:
            symbols = _apply_merge(symbols, rule.left, rule.right, rule.merged)

        for symbol in symbols:
            vocab_id = model.vocabulary.get(symbol)
            tokens.append(
                TokenItem(
                    index=index,
                    id=vocab_id,
                    text=symbol,
                    is_new=None,
                    is_unknown=vocab_id is None,
                )
            )
            index += 1

    return TokenizationOutcome(tokens=tokens)
