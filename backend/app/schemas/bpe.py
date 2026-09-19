from pydantic import BaseModel


class BpeTrainRequest(BaseModel):
    """Inbound JSON body for POST /api/bpe/train (FR-037, FR-038)."""

    training_text: str
    vocab_size: int


class BpeVocabularyEntry(BaseModel):
    """A single symbol known to the currently trained BPE model (spec: "BPE Vocabulary Entry")."""

    id: int
    symbol: str
    is_base: bool


class BpeMergeRule(BaseModel):
    """One ordered rule learned during training (spec: "BPE Merge Rule").

    This list also serves as the per-step training-detail view required by FR-051 — each rule IS
    one training step.
    """

    order: int
    left: str
    right: str
    merged: str
    id: int


class BpeStateResponse(BaseModel):
    """Represents the one currently trained (or untrained) BPE model.

    Returned by both POST /api/bpe/train and GET /api/bpe/vocabulary (spec: "BPE Training Session").
    """

    trained: bool
    vocabulary: list[BpeVocabularyEntry]
    merge_rules: list[BpeMergeRule]
    target_vocab_size: int | None = None
    achieved_vocab_size: int | None = None
    target_reached: bool | None = None
