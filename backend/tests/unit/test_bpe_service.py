from app.services.bpe_service import count_distinct_characters, tokenize_with_model, train_bpe


def test_base_vocabulary_ids_are_sorted_by_codepoint() -> None:
    model = train_bpe("cab cab", vocab_size=3)

    # distinct chars {a, b, c} sorted by codepoint -> a=0, b=1, c=2, regardless of first-seen order
    assert model.vocabulary["a"] == 0
    assert model.vocabulary["b"] == 1
    assert model.vocabulary["c"] == 2
    assert model.base_symbols == frozenset({"a", "b", "c"})


def test_training_merges_the_most_frequent_adjacent_pair_first() -> None:
    # "ab" occurs 3 times (as a pair, within "ab" and "abc"); "bc" occurs only once.
    model = train_bpe("ab ab ab abc", vocab_size=4)

    assert model.merge_rules[0].left == "a"
    assert model.merge_rules[0].right == "b"
    assert model.merge_rules[0].merged == "ab"
    assert model.merge_rules[0].order == 0
    assert model.merge_rules[0].id == 3  # after base symbols a=0, b=1, c=2


def test_repeat_training_with_identical_inputs_is_fully_deterministic() -> None:
    first = train_bpe("the cat sat on the mat", vocab_size=15)
    second = train_bpe("the cat sat on the mat", vocab_size=15)

    assert first.vocabulary == second.vocabulary
    assert first.merge_rules == second.merge_rules
    assert first.achieved_vocab_size == second.achieved_vocab_size


def test_tie_break_selects_the_lexicographically_smallest_pair() -> None:
    # "ab" and "cd" both occur twice; no pair is more frequent. Lexicographically, ("a","b") < ("c","d").
    model = train_bpe("ab ab cd cd", vocab_size=5)

    assert model.merge_rules[0].left == "a"
    assert model.merge_rules[0].right == "b"


def test_training_stops_early_when_no_pair_recurs() -> None:
    # Every character here is unique and no two-character combination repeats anywhere.
    model = train_bpe("a b c d e", vocab_size=100)

    assert model.merge_rules == []
    assert model.achieved_vocab_size == 5
    assert model.achieved_vocab_size < model.target_vocab_size


def test_count_distinct_characters_matches_the_base_vocabulary_size() -> None:
    assert count_distinct_characters("cab cab") == 3
    assert count_distinct_characters("") == 0


def test_tokenize_applies_learned_merges_in_order() -> None:
    model = train_bpe("ab ab ab abc", vocab_size=4)

    outcome = tokenize_with_model("ab", model)

    assert [t.text for t in outcome.tokens] == ["ab"]
    assert outcome.tokens[0].id == model.vocabulary["ab"]
    assert outcome.tokens[0].is_unknown is False
    assert outcome.tokens[0].is_new is None


def test_tokenize_marks_unseen_characters_as_unknown_without_mutating_the_model() -> None:
    model = train_bpe("ab ab ab abc", vocab_size=4)
    vocabulary_before = dict(model.vocabulary)
    merge_rules_before = list(model.merge_rules)

    outcome = tokenize_with_model("abz", model)

    texts_and_flags = [(t.text, t.id, t.is_unknown) for t in outcome.tokens]
    assert texts_and_flags == [("ab", model.vocabulary["ab"], False), ("z", None, True)]

    # Tokenizing must never learn a new rule or vocabulary entry (FR-056).
    assert model.vocabulary == vocabulary_before
    assert model.merge_rules == merge_rules_before


def test_tokenize_never_mutates_the_model_across_repeated_calls() -> None:
    model = train_bpe("the cat sat on the mat", vocab_size=20)

    first = tokenize_with_model("the cat", model)
    second = tokenize_with_model("the cat", model)

    assert [(t.text, t.id, t.is_unknown) for t in first.tokens] == [
        (t.text, t.id, t.is_unknown) for t in second.tokens
    ]
