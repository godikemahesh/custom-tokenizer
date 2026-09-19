import re

from app.schemas.tokenize import TokenItem
from app.services.tokenizer_base import TokenizationOutcome
from app.services.vocabulary_store import VocabularyStore

# Whitespace-separated word runs become one token each; each punctuation character becomes its
# own token; plain whitespace is the separator and is never emitted as a token (spec
# Clarifications; research.md #1). Scanning left-to-right with `finditer` over the same pattern
# always yields the same ordered token list for the same input (FR-014).
_TOKEN_PATTERN = re.compile(r"\w+|[^\w\s]")


class CustomTokenizerService:
    """Application-owned tokenizer with its own deterministic, regex-based vocabulary (FR-014)."""

    def __init__(self, vocabulary_store: VocabularyStore) -> None:
        self._vocabulary_store = vocabulary_store

    def tokenize(self, text: str) -> TokenizationOutcome:
        token_strings = _TOKEN_PATTERN.findall(text)
        vocabulary_results = self._vocabulary_store.tokenize_and_update(token_strings)

        tokens = [
            TokenItem(index=index, id=result.id, text=result.text, is_new=result.is_new)
            for index, result in enumerate(vocabulary_results)
        ]
        return TokenizationOutcome(tokens=tokens)
