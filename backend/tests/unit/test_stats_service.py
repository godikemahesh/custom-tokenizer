from app.services.stats_service import compute_statistics


def test_normal_input_computes_expected_ratios() -> None:
    stats = compute_statistics("Hello, world!", token_count=4)

    assert stats.character_count == 13
    assert stats.word_count == 2
    assert stats.token_count == 4
    assert stats.tokens_per_word == 2.0
    assert round(stats.tokens_per_character, 2) == 0.31


def test_empty_text_guards_against_division_by_zero() -> None:
    stats = compute_statistics("", token_count=0)

    assert stats.character_count == 0
    assert stats.word_count == 0
    assert stats.tokens_per_word == 0.0
    assert stats.tokens_per_character == 0.0


def test_whitespace_only_text_has_zero_word_count_but_nonzero_characters() -> None:
    stats = compute_statistics("   ", token_count=0)

    assert stats.character_count == 3
    assert stats.word_count == 0
    assert stats.tokens_per_word == 0.0
