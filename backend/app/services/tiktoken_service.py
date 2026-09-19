import tiktoken

from app.schemas.tokenize import TokenItem
from app.services.tokenizer_base import TokenizationOutcome

# Loaded once at import time and reused for every request: the encoding object is immutable and
# thread-safe, and this guarantees Tiktoken's vocabulary is never modified (FR-015).
_ENCODING = tiktoken.get_encoding("cl100k_base")


class TiktokenService:
    """Wraps the real `tiktoken` library for the `cl100k_base` encoding. Stateless (FR-016)."""

    def tokenize(self, text: str) -> TokenizationOutcome:
        ids = _ENCODING.encode(text)
        tokens = [
            TokenItem(
                index=index,
                id=token_id,
                text=_ENCODING.decode_single_token_bytes(token_id).decode("utf-8", errors="replace"),
                is_new=None,
            )
            for index, token_id in enumerate(ids)
        ]
        return TokenizationOutcome(tokens=tokens)
