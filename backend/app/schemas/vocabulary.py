from typing import Literal

from pydantic import BaseModel

VocabularyStatus = Literal["new", "existing"]


class VocabularyEntry(BaseModel):
    """An application-owned record mapping a token string to a deterministic ID (spec: "Custom Vocabulary Entry")."""

    id: int
    token: str
    frequency: int
    status: VocabularyStatus


class VocabularyResetResponse(BaseModel):
    message: str
    vocabulary: list[VocabularyEntry]
