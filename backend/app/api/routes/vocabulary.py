from fastapi import APIRouter

from app.schemas.vocabulary import VocabularyEntry, VocabularyResetResponse
from app.services.vocabulary_store import default_vocabulary_store

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("", response_model=list[VocabularyEntry])
async def get_vocabulary() -> list[VocabularyEntry]:
    """Returns the current Custom Tokenizer vocabulary, independent of any tokenize call (FR-023)."""
    return default_vocabulary_store.snapshot()


@router.post("/reset", response_model=VocabularyResetResponse)
async def reset_vocabulary() -> VocabularyResetResponse:
    """Resets the Custom Tokenizer vocabulary to its initial empty state (FR-026)."""
    default_vocabulary_store.reset()
    return VocabularyResetResponse(
        message="The Custom Tokenizer vocabulary has been reset.",
        vocabulary=default_vocabulary_store.snapshot(),
    )
