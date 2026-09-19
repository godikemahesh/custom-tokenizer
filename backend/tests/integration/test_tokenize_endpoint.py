from pathlib import Path

from fastapi.testclient import TestClient

FIXTURES = Path(__file__).parent.parent / "fixtures"


def test_tokenize_text_with_tiktoken_returns_real_ids(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base", "text": "Hello, world!"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tokenizer_mode"] == "tiktoken"
    assert body["encoding"] == "cl100k_base"
    assert body["source_type"] == "text"
    assert [t["id"] for t in body["tokens"]] == [9906, 11, 1917, 0]
    assert all(t["is_new"] is None for t in body["tokens"])
    assert body["character_count"] == 13
    assert body["word_count"] == 2
    assert body["token_count"] == 4


def test_tokenize_text_with_custom_tokenizer_returns_deterministic_tokens(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "custom", "text": "Hello, world!"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tokenizer_mode"] == "custom"
    assert body["encoding"] is None
    assert [t["text"] for t in body["tokens"]] == ["Hello", ",", "world", "!"]
    assert all(t["is_new"] is True for t in body["tokens"])


def test_empty_text_returns_empty_input_error(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base", "text": "   "},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "EMPTY_INPUT"


def test_missing_text_returns_empty_input_error(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "EMPTY_INPUT"


def test_unsupported_encoding_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "p50k_base", "text": "Hello"},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "UNSUPPORTED_ENCODING"


def test_missing_encoding_for_tiktoken_mode_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "text": "Hello"},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "UNSUPPORTED_ENCODING"


def test_custom_tokenizer_reuses_ids_across_requests(client: TestClient) -> None:
    first = client.post("/api/tokenize", data={"tokenizer_mode": "custom", "text": "Hello world"})
    second = client.post("/api/tokenize", data={"tokenizer_mode": "custom", "text": "Hello there"})

    hello_first = next(t for t in first.json()["tokens"] if t["text"] == "Hello")
    hello_second = next(t for t in second.json()["tokens"] if t["text"] == "Hello")

    assert hello_second["id"] == hello_first["id"]
    assert hello_second["is_new"] is False


def test_tokenize_txt_upload_returns_extracted_text(client: TestClient) -> None:
    content = (FIXTURES / "sample.txt").read_bytes()
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
        files={"file": ("sample.txt", content, "text/plain")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "txt_file"
    assert "quick brown fox" in body["extracted_text"]
    assert body["token_count"] > 0


def test_tokenize_pdf_upload_returns_extracted_text(client: TestClient) -> None:
    content = (FIXTURES / "sample_valid.pdf").read_bytes()
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "custom"},
        files={"file": ("sample_valid.pdf", content, "application/pdf")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "pdf_file"
    assert "Hello, world!" in body["extracted_text"]


def test_unsupported_file_type_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
        files={"file": ("sample.docx", b"not a real docx", "application/msword")},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "UNSUPPORTED_FILE_TYPE"


def test_oversized_file_is_rejected(client: TestClient) -> None:
    content = (FIXTURES / "sample_oversized.txt").read_bytes()
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
        files={"file": ("sample_oversized.txt", content, "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "FILE_TOO_LARGE"


def test_corrupted_pdf_is_rejected(client: TestClient) -> None:
    content = (FIXTURES / "sample_corrupted.pdf").read_bytes()
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
        files={"file": ("sample_corrupted.pdf", content, "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "CORRUPTED_PDF"


def test_bpe_tokenize_without_a_trained_model_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "custom", "custom_sub_mode": "bpe", "text": "ab"},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "NO_TRAINED_BPE_MODEL"


def test_bpe_tokenize_uses_only_learned_merge_rules(client: TestClient) -> None:
    """Also confirms the BPE result reuses the exact same TokenizeResponse shape as every other
    tokenizer mode/sub-mode (FR-057)."""
    client.post("/api/bpe/train", json={"training_text": "ab ab ab abc", "vocab_size": 4})

    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "custom", "custom_sub_mode": "bpe", "text": "abz"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tokenizer_mode"] == "custom"
    assert body["custom_sub_mode"] == "bpe"
    assert body["encoding"] is None
    assert [(t["text"], t["id"], t["is_unknown"]) for t in body["tokens"]] == [
        ("ab", 3, False),
        ("z", None, True),
    ]
    assert all(t["is_new"] is None for t in body["tokens"])


def test_bpe_tokenize_is_deterministic_across_repeated_calls(client: TestClient) -> None:
    client.post("/api/bpe/train", json={"training_text": "the cat sat on the mat", "vocab_size": 20})

    first = client.post(
        "/api/tokenize", data={"tokenizer_mode": "custom", "custom_sub_mode": "bpe", "text": "the cat"}
    )
    second = client.post(
        "/api/tokenize", data={"tokenizer_mode": "custom", "custom_sub_mode": "bpe", "text": "the cat"}
    )

    assert first.json()["tokens"] == second.json()["tokens"]


def test_bpe_tokenize_never_mutates_the_trained_vocabulary(client: TestClient) -> None:
    client.post("/api/bpe/train", json={"training_text": "ab ab ab abc", "vocab_size": 4})
    before = client.get("/api/bpe/vocabulary").json()

    client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "custom", "custom_sub_mode": "bpe", "text": "abz"},
    )

    after = client.get("/api/bpe/vocabulary").json()
    assert after == before


def test_simple_sub_mode_is_the_default_when_custom_sub_mode_is_omitted(client: TestClient) -> None:
    response = client.post("/api/tokenize", data={"tokenizer_mode": "custom", "text": "Hello, world!"})

    assert response.status_code == 200
    assert response.json()["custom_sub_mode"] == "simple"


def test_textless_pdf_is_rejected(client: TestClient) -> None:
    content = (FIXTURES / "sample_textless.pdf").read_bytes()
    response = client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base"},
        files={"file": ("sample_textless.pdf", content, "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error_code"] == "NO_EXTRACTABLE_TEXT"
