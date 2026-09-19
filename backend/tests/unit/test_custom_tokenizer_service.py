from app.services.custom_tokenizer_service import CustomTokenizerService
from app.services.vocabulary_store import VocabularyStore


def test_splits_words_and_punctuation_separately() -> None:
    service = CustomTokenizerService(VocabularyStore())

    outcome = service.tokenize("Hello, world!")

    assert [t.text for t in outcome.tokens] == ["Hello", ",", "world", "!"]


def test_splitting_is_deterministic_across_repeated_calls() -> None:
    service = CustomTokenizerService(VocabularyStore())

    first = service.tokenize("Hello, world!")
    second = service.tokenize("Hello, world!")

    assert [t.text for t in first.tokens] == [t.text for t in second.tokens]


def test_first_occurrence_of_each_token_is_marked_new() -> None:
    service = CustomTokenizerService(VocabularyStore())

    outcome = service.tokenize("Hello, world!")

    assert all(t.is_new is True for t in outcome.tokens)


def test_reused_token_is_not_marked_new_and_keeps_same_id() -> None:
    service = CustomTokenizerService(VocabularyStore())

    first = service.tokenize("Hello world")
    second = service.tokenize("Hello there")

    hello_first = next(t for t in first.tokens if t.text == "Hello")
    hello_second = next(t for t in second.tokens if t.text == "Hello")

    assert hello_second.is_new is False
    assert hello_second.id == hello_first.id


def test_ids_are_assigned_deterministically_in_first_seen_order() -> None:
    service = CustomTokenizerService(VocabularyStore())

    outcome = service.tokenize("a b c")

    assert [t.id for t in outcome.tokens] == [0, 1, 2]


def test_whitespace_is_not_emitted_as_a_token() -> None:
    service = CustomTokenizerService(VocabularyStore())

    outcome = service.tokenize("a   b")

    assert [t.text for t in outcome.tokens] == ["a", "b"]
