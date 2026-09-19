import threading

import pytest

from app.core.errors import NoTrainedBpeModelError, TrainingInProgressError
from app.services.bpe_store import BpeModelStore


def test_snapshot_returns_untrained_shape_before_any_training() -> None:
    store = BpeModelStore()

    snapshot = store.snapshot()

    assert snapshot.trained is False
    assert snapshot.vocabulary == []
    assert snapshot.merge_rules == []
    assert snapshot.target_vocab_size is None
    assert snapshot.achieved_vocab_size is None
    assert snapshot.target_reached is None


def test_tokenize_before_training_raises_no_trained_bpe_model_error() -> None:
    store = BpeModelStore()

    with pytest.raises(NoTrainedBpeModelError):
        store.tokenize("hello")


def test_train_populates_a_trained_snapshot() -> None:
    store = BpeModelStore()

    result = store.train("ab ab ab abc", vocab_size=4)

    assert result.trained is True
    assert result.achieved_vocab_size == 4
    assert result.target_vocab_size == 4
    assert result.target_reached is True
    assert len(result.merge_rules) == 1


def test_train_reports_target_not_reached_when_text_cannot_support_it() -> None:
    store = BpeModelStore()

    result = store.train("a b c d e", vocab_size=100)

    assert result.trained is True
    assert result.achieved_vocab_size == 5
    assert result.target_vocab_size == 100
    assert result.target_reached is False


def test_retraining_replaces_the_previous_model_atomically() -> None:
    store = BpeModelStore()
    store.train("ab ab ab abc", vocab_size=4)

    second = store.train("xy xy xy xyz", vocab_size=4)

    symbols = {entry.symbol for entry in second.vocabulary}
    assert "ab" not in symbols
    assert "xy" in symbols


def test_concurrent_train_call_is_rejected_while_one_is_in_progress(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.services.bpe_store as bpe_store_module

    store = BpeModelStore()
    started = threading.Event()
    release = threading.Event()
    original_train_bpe = bpe_store_module.train_bpe

    def slow_train_bpe(training_text: str, vocab_size: int):
        started.set()
        release.wait(timeout=2)
        return original_train_bpe(training_text, vocab_size)

    monkeypatch.setattr(bpe_store_module, "train_bpe", slow_train_bpe)

    thread = threading.Thread(target=store.train, args=("ab ab ab abc", 4))
    thread.start()
    started.wait(timeout=2)

    with pytest.raises(TrainingInProgressError):
        store.train("xy xy xy xyz", 4)

    release.set()
    thread.join(timeout=2)
