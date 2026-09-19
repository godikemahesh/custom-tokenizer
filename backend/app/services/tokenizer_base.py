from dataclasses import dataclass
from typing import Protocol

from app.schemas.tokenize import TokenItem


@dataclass(frozen=True)
class TokenizationOutcome:
    """The raw output of a tokenizer service, before statistics are attached."""

    tokens: list[TokenItem]

    @property
    def token_count(self) -> int:
        return len(self.tokens)


class TokenizerService(Protocol):
    """Shared contract implemented independently by TiktokenService and CustomTokenizerService.

    Keeping both tokenizers behind this protocol is what lets either be replaced or extended
    without touching the frontend or the other tokenizer (constitution Principle V).
    """

    def tokenize(self, text: str) -> TokenizationOutcome: ...
