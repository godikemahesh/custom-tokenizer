from fastapi import APIRouter

from app.core.config import settings
from app.core.errors import (
    EmptyTrainingTextError,
    InvalidVocabSizeError,
    TrainingTextTooLongError,
    VocabSizeTooLargeError,
    VocabSizeTooSmallError,
)
from app.schemas.bpe import BpeStateResponse, BpeTrainRequest
from app.services.bpe_service import count_distinct_characters
from app.services.bpe_store import default_bpe_model_store

router = APIRouter(prefix="/bpe", tags=["bpe"])


def _validate_train_request(training_text: str, vocab_size: int) -> None:
    """Validates a BPE train request before any training work starts, in contract order
    (contracts/bpe.md): empty text, text length, vocab size type/positivity, vocab size upper
    bound, then vocab size vs. the training text's base alphabet (FR-039–FR-042)."""
    if not training_text.strip():
        raise EmptyTrainingTextError()
    if len(training_text) > settings.max_bpe_training_text_length:
        raise TrainingTextTooLongError()
    if vocab_size <= 0:
        raise InvalidVocabSizeError()
    if vocab_size > settings.max_bpe_vocab_size:
        raise VocabSizeTooLargeError()
    if vocab_size <= count_distinct_characters(training_text):
        raise VocabSizeTooSmallError()


@router.post("/train", response_model=BpeStateResponse)
async def train_bpe(request: BpeTrainRequest) -> BpeStateResponse:
    """Trains the BPE sub-mode on user-provided text, replacing any prior model (FR-037–FR-048)."""
    _validate_train_request(request.training_text, request.vocab_size)
    return default_bpe_model_store.train(request.training_text, request.vocab_size)


@router.get("/vocabulary", response_model=BpeStateResponse)
async def get_bpe_vocabulary() -> BpeStateResponse:
    """Returns the current BPE training status, vocabulary, and merge rules (FR-049, FR-053)."""
    return default_bpe_model_store.snapshot()
