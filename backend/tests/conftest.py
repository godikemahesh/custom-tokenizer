import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.bpe_store import default_bpe_model_store
from app.services.vocabulary_store import default_vocabulary_store


@pytest.fixture(autouse=True)
def _reset_shared_vocabulary() -> None:
    """The Custom Tokenizer vocabulary is a process-wide singleton; reset it between tests
    so integration tests don't leak state into each other."""
    default_vocabulary_store.reset()


@pytest.fixture(autouse=True)
def _reset_shared_bpe_model() -> None:
    """The trained BPE model is likewise a process-wide singleton; reset it between tests
    so integration tests don't leak a trained model into each other."""
    default_bpe_model_store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
