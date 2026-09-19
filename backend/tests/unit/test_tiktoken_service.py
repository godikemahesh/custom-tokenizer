from app.services.tiktoken_service import TiktokenService


def test_tokenize_known_string_returns_real_cl100k_base_ids() -> None:
    service = TiktokenService()

    outcome = service.tokenize("Hello, world!")

    assert [t.id for t in outcome.tokens] == [9906, 11, 1917, 0]
    assert [t.text for t in outcome.tokens] == ["Hello", ",", " world", "!"]


def test_tokenize_assigns_sequential_indices() -> None:
    service = TiktokenService()

    outcome = service.tokenize("Hello, world!")

    assert [t.index for t in outcome.tokens] == list(range(len(outcome.tokens)))


def test_tokenize_never_sets_is_new() -> None:
    """Tiktoken mode has no vocabulary concept, so is_new is always null (FR-016)."""
    service = TiktokenService()

    outcome = service.tokenize("Hello, world!")

    assert all(t.is_new is None for t in outcome.tokens)


def test_repeated_calls_do_not_mutate_shared_encoding() -> None:
    """The encoding object is loaded once and reused; it must be read-only across calls (FR-015)."""
    service = TiktokenService()

    first = service.tokenize("Hello, world!")
    second = service.tokenize("Hello, world!")

    assert [t.id for t in first.tokens] == [t.id for t in second.tokens]


def test_empty_string_tokenizes_to_no_tokens() -> None:
    service = TiktokenService()

    outcome = service.tokenize("")

    assert outcome.tokens == []
