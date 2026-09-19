from fastapi.testclient import TestClient


def test_vocabulary_starts_empty(client: TestClient) -> None:
    response = client.get("/api/vocabulary")

    assert response.status_code == 200
    assert response.json() == []


def test_vocabulary_reflects_custom_tokenizer_usage(client: TestClient) -> None:
    client.post("/api/tokenize", data={"tokenizer_mode": "custom", "text": "Hello, world!"})

    response = client.get("/api/vocabulary")

    assert response.status_code == 200
    body = response.json()
    tokens = {entry["token"]: entry for entry in body}
    assert set(tokens) == {"Hello", ",", "world", "!"}
    assert all(entry["frequency"] == 1 for entry in tokens.values())
    assert all(entry["status"] == "new" for entry in tokens.values())


def test_reset_clears_vocabulary(client: TestClient) -> None:
    client.post("/api/tokenize", data={"tokenizer_mode": "custom", "text": "Hello, world!"})

    response = client.post("/api/vocabulary/reset")

    assert response.status_code == 200
    body = response.json()
    assert body["vocabulary"] == []
    assert client.get("/api/vocabulary").json() == []


def test_tiktoken_usage_never_affects_custom_vocabulary(client: TestClient) -> None:
    client.post(
        "/api/tokenize",
        data={"tokenizer_mode": "tiktoken", "encoding": "cl100k_base", "text": "Hello, world!"},
    )

    response = client.get("/api/vocabulary")

    assert response.status_code == 200
    assert response.json() == []
