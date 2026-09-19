from typing import Literal

from pydantic import BaseModel, Field

TokenizerMode = Literal["tiktoken", "custom"]
CustomSubMode = Literal["simple", "bpe"]
SourceType = Literal["text", "txt_file", "pdf_file"]
SupportedEncoding = Literal["cl100k_base"]


class TokenItem(BaseModel):
    """A single token within a Tokenization Result (spec: "Token")."""

    index: int = Field(..., ge=0, description="0-based position of this token within the result")
    id: int | None = Field(
        default=None,
        description=(
            "Real Tiktoken ID, a deterministic Custom Tokenizer (Simple) vocabulary ID, or a "
            "deterministic BPE vocabulary ID. Null only for a BPE token representing a character "
            "absent from the trained vocabulary (FR-058)."
        ),
    )
    text: str = Field(..., description="The token's text/string value")
    is_new: bool | None = Field(
        default=None,
        description="Custom Tokenizer Simple sub-mode only: whether this occurrence created a new vocabulary entry. Always null otherwise.",
    )
    is_unknown: bool | None = Field(
        default=None,
        description="Custom Tokenizer BPE sub-mode only: whether this token is a character absent from the trained vocabulary. Always null otherwise.",
    )


class TokenizeResponse(BaseModel):
    """The outcome of one tokenize action (spec: "Tokenization Result")."""

    original_text: str
    source_type: SourceType
    tokenizer_mode: TokenizerMode
    custom_sub_mode: CustomSubMode | None = None
    encoding: SupportedEncoding | None = None
    extracted_text: str | None = None
    character_count: int
    word_count: int
    token_count: int
    tokens_per_word: float
    tokens_per_character: float
    tokens: list[TokenItem]
