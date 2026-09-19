import threading
from dataclasses import dataclass

from app.schemas.vocabulary import VocabularyEntry


@dataclass
class _EntryState:
    id: int
    frequency: int


@dataclass(frozen=True)
class CustomTokenResult:
    """Per-token outcome of a single VocabularyStore update, used by CustomTokenizerService."""

    text: str
    id: int
    is_new: bool


class VocabularyStore:
    """The application-owned, in-memory Custom Tokenizer vocabulary (spec FR-017).

    A single instance is shared by every request (see the module-level `default_vocabulary_store`
    below), so all read-modify-write sequences are guarded by one lock: FastAPI can run
    synchronous route handlers on multiple worker threads, and without the lock two concurrent
    requests could race on `next_id` and assign duplicate IDs (see research.md #2).
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._entries: dict[str, _EntryState] = {}
        self._next_id = 0
        self._last_operation_new_tokens: set[str] = set()

    def tokenize_and_update(self, tokens: list[str]) -> list[CustomTokenResult]:
        """Looks up/creates each token in order, updating frequency and 'new' status atomically."""
        with self._lock:
            new_tokens_this_operation: set[str] = set()
            results: list[CustomTokenResult] = []

            for text in tokens:
                entry = self._entries.get(text)
                if entry is None:
                    entry = _EntryState(id=self._next_id, frequency=0)
                    self._entries[text] = entry
                    self._next_id += 1
                    new_tokens_this_operation.add(text)

                entry.frequency += 1
                results.append(
                    CustomTokenResult(text=text, id=entry.id, is_new=text in new_tokens_this_operation)
                )

            self._last_operation_new_tokens = new_tokens_this_operation
            return results

    def snapshot(self) -> list[VocabularyEntry]:
        """Returns the full vocabulary, independent of any specific tokenize call (FR-023)."""
        with self._lock:
            return [
                VocabularyEntry(
                    id=entry.id,
                    token=text,
                    frequency=entry.frequency,
                    status="new" if text in self._last_operation_new_tokens else "existing",
                )
                for text, entry in sorted(self._entries.items(), key=lambda item: item[1].id)
            ]

    def reset(self) -> None:
        """Clears the vocabulary back to its initial empty state (FR-026)."""
        with self._lock:
            self._entries.clear()
            self._next_id = 0
            self._last_operation_new_tokens = set()


default_vocabulary_store = VocabularyStore()
