import threading

from app.services.vocabulary_store import VocabularyStore


def test_new_tokens_get_sequential_deterministic_ids() -> None:
    store = VocabularyStore()

    ids = store.tokenize_and_update(["Hello", ",", "world"])

    assert [item.id for item in ids] == [0, 1, 2]
    assert all(item.is_new for item in ids)


def test_repeated_token_reuses_existing_id_and_increments_frequency() -> None:
    store = VocabularyStore()

    store.tokenize_and_update(["Hello", "world"])
    second = store.tokenize_and_update(["Hello"])

    assert second[0].id == 0
    assert second[0].is_new is False

    snapshot = {entry.token: entry for entry in store.snapshot()}
    assert snapshot["Hello"].frequency == 2
    assert snapshot["world"].frequency == 1


def test_snapshot_status_reflects_only_tokens_newly_created_by_the_last_operation() -> None:
    """Reused tokens are not "new" even if produced again by the latest operation (FR-022, FR-024:
    "new" means newly *created*, not merely touched)."""
    store = VocabularyStore()

    store.tokenize_and_update(["Hello", "world"])
    store.tokenize_and_update(["Hello", "there"])

    snapshot = {entry.token: entry for entry in store.snapshot()}
    assert snapshot["Hello"].status == "existing"
    assert snapshot["world"].status == "existing"
    assert snapshot["there"].status == "new"


def test_reset_clears_entries_and_restarts_id_counter() -> None:
    store = VocabularyStore()
    store.tokenize_and_update(["Hello", "world"])

    store.reset()

    assert store.snapshot() == []
    ids = store.tokenize_and_update(["fresh"])
    assert ids[0].id == 0


def test_concurrent_updates_never_assign_duplicate_ids() -> None:
    store = VocabularyStore()
    errors: list[Exception] = []

    def worker(n: int) -> None:
        try:
            store.tokenize_and_update([f"token-{n}-{i}" for i in range(20)])
        except Exception as exc:  # pragma: no cover - defensive
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(n,)) for n in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    all_ids = [entry.id for entry in store.snapshot()]
    assert len(all_ids) == len(set(all_ids)), "duplicate IDs assigned under concurrency"
