import threading

from app.core.errors import NoTrainedBpeModelError, TrainingInProgressError
from app.schemas.bpe import BpeStateResponse, BpeVocabularyEntry
from app.services.bpe_service import BpeModelState, tokenize_with_model, train_bpe
from app.services.tokenizer_base import TokenizationOutcome


class BpeModelStore:
    """The application-owned, in-memory trained BPE model (spec FR-048).

    At most one trained model exists at a time. A single lock guards the `in_progress` flag and
    every read/replace of `_model`, mirroring `VocabularyStore`'s concurrency approach: FastAPI can
    run synchronous route handlers on multiple worker threads (research.md #2, #12). The lock is
    only held briefly around state transitions — the (potentially slow) training algorithm itself
    runs outside the lock so `GET /api/bpe/vocabulary` is never blocked by an in-progress run.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model: BpeModelState | None = None
        self._in_progress = False

    def train(self, training_text: str, vocab_size: int) -> BpeStateResponse:
        """Trains a new BPE model, replacing any previous one atomically (FR-048).

        Rejects a concurrent call immediately with `TrainingInProgressError` rather than queuing
        or blocking (FR-044).
        """
        with self._lock:
            if self._in_progress:
                raise TrainingInProgressError()
            self._in_progress = True

        try:
            model = train_bpe(training_text, vocab_size)
        finally:
            with self._lock:
                self._in_progress = False

        with self._lock:
            self._model = model

        return self.snapshot()

    def tokenize(self, text: str) -> TokenizationOutcome:
        """Tokenizes `text` with the currently trained model, applying only its learned rules.

        Raises `NoTrainedBpeModelError` if no model has been trained yet (FR-055).
        """
        with self._lock:
            model = self._model

        if model is None:
            raise NoTrainedBpeModelError()

        return tokenize_with_model(text, model)

    def snapshot(self) -> BpeStateResponse:
        """Returns the current training status, vocabulary, and merge rules (FR-049, FR-053)."""
        with self._lock:
            model = self._model

        if model is None:
            return BpeStateResponse(trained=False, vocabulary=[], merge_rules=[])

        vocabulary = [
            BpeVocabularyEntry(id=vocab_id, symbol=symbol, is_base=symbol in model.base_symbols)
            for symbol, vocab_id in sorted(model.vocabulary.items(), key=lambda item: item[1])
        ]
        return BpeStateResponse(
            trained=True,
            vocabulary=vocabulary,
            merge_rules=list(model.merge_rules),
            target_vocab_size=model.target_vocab_size,
            achieved_vocab_size=model.achieved_vocab_size,
            target_reached=model.achieved_vocab_size == model.target_vocab_size,
        )

    def reset(self) -> None:
        """Clears the trained model back to its initial untrained state.

        Not exposed via any API route (the spec defines no BPE reset endpoint — retraining is the
        sub-mode's only state-clearing action); used only to isolate tests from each other, the
        same way `VocabularyStore.reset()` is used in `tests/conftest.py`.
        """
        with self._lock:
            self._model = None
            self._in_progress = False


default_bpe_model_store = BpeModelStore()
