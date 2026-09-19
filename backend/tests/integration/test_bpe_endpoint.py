from fastapi.testclient import TestClient


def test_bpe_vocabulary_starts_untrained(client: TestClient) -> None:
    response = client.get("/api/bpe/vocabulary")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "trained": False,
        "vocabulary": [],
        "merge_rules": [],
        "target_vocab_size": None,
        "achieved_vocab_size": None,
        "target_reached": None,
    }


def test_train_returns_vocabulary_and_merge_rules(client: TestClient) -> None:
    response = client.post(
        "/api/bpe/train",
        json={"training_text": "ab ab ab abc", "vocab_size": 4},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["trained"] is True
    assert body["achieved_vocab_size"] == 4
    assert body["target_vocab_size"] == 4
    assert body["target_reached"] is True
    assert body["merge_rules"] == [{"order": 0, "left": "a", "right": "b", "merged": "ab", "id": 3}]

    # GET reflects the just-trained model independent of the train call itself (FR-049, FR-053).
    follow_up = client.get("/api/bpe/vocabulary")
    assert follow_up.json() == body


def test_repeated_training_with_identical_input_is_deterministic(client: TestClient) -> None:
    first = client.post("/api/bpe/train", json={"training_text": "the cat sat on the mat", "vocab_size": 15})
    second = client.post("/api/bpe/train", json={"training_text": "the cat sat on the mat", "vocab_size": 15})

    assert first.json() == second.json()


def test_training_reports_target_not_reached_when_text_is_too_small(client: TestClient) -> None:
    response = client.post("/api/bpe/train", json={"training_text": "a b c d e", "vocab_size": 100})

    assert response.status_code == 200
    body = response.json()
    assert body["achieved_vocab_size"] == 5
    assert body["target_reached"] is False


def test_empty_training_text_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bpe/train", json={"training_text": "   ", "vocab_size": 10})

    assert response.status_code == 400
    assert response.json()["error_code"] == "EMPTY_TRAINING_TEXT"


def test_training_text_over_the_length_limit_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/bpe/train",
        json={"training_text": "ab " * 60_000, "vocab_size": 10},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "TRAINING_TEXT_TOO_LONG"


def test_non_positive_vocab_size_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bpe/train", json={"training_text": "ab ab", "vocab_size": 0})

    assert response.status_code == 400
    assert response.json()["error_code"] == "INVALID_VOCAB_SIZE"


def test_vocab_size_over_the_upper_bound_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bpe/train", json={"training_text": "ab ab", "vocab_size": 5001})

    assert response.status_code == 400
    assert response.json()["error_code"] == "VOCAB_SIZE_TOO_LARGE"


def test_vocab_size_not_larger_than_base_alphabet_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bpe/train", json={"training_text": "cab", "vocab_size": 3})

    assert response.status_code == 400
    assert response.json()["error_code"] == "VOCAB_SIZE_TOO_SMALL"


def test_concurrent_training_is_rejected(client: TestClient, monkeypatch) -> None:
    import threading

    import app.services.bpe_store as bpe_store_module

    started = threading.Event()
    release = threading.Event()
    original_train_bpe = bpe_store_module.train_bpe

    def slow_train_bpe(training_text: str, vocab_size: int):
        started.set()
        release.wait(timeout=2)
        return original_train_bpe(training_text, vocab_size)

    monkeypatch.setattr(bpe_store_module, "train_bpe", slow_train_bpe)

    thread = threading.Thread(
        target=client.post, args=("/api/bpe/train",), kwargs={"json": {"training_text": "ab ab ab abc", "vocab_size": 4}}
    )
    thread.start()
    started.wait(timeout=2)

    response = client.post("/api/bpe/train", json={"training_text": "xy xy xy xyz", "vocab_size": 4})
    assert response.status_code == 409
    assert response.json()["error_code"] == "TRAINING_IN_PROGRESS"

    release.set()
    thread.join(timeout=2)
