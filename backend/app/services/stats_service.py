from dataclasses import dataclass


@dataclass(frozen=True)
class TextStatistics:
    character_count: int
    word_count: int
    token_count: int
    tokens_per_word: float
    tokens_per_character: float


def compute_statistics(original_text: str, token_count: int) -> TextStatistics:
    """Computes character/word/token counts and ratios.

    Identical for both tokenizer modes (FR-028), so neither TiktokenService nor
    CustomTokenizerService needs its own copy of this logic (constitution Principle VI).
    """
    character_count = len(original_text)
    word_count = len(original_text.split())

    tokens_per_word = token_count / word_count if word_count else 0.0
    tokens_per_character = token_count / character_count if character_count else 0.0

    return TextStatistics(
        character_count=character_count,
        word_count=word_count,
        token_count=token_count,
        tokens_per_word=tokens_per_word,
        tokens_per_character=tokens_per_character,
    )
