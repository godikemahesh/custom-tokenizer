# Contract: POST /api/tokenize

Tokenizes typed text or an uploaded file using the selected tokenizer mode. See
[data-model.md](../data-model.md) for full field definitions of the types referenced below.

## Request

- **Method / Path**: `POST /api/tokenize`
- **Content-Type**: `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `tokenizer_mode` | `string` (`"tiktoken"` \| `"custom"`) | Yes | Selects `TiktokenService` or `CustomTokenizerService` (FR-009) |
| `custom_sub_mode` | `string` (`"simple"` \| `"bpe"`) | Only if `tokenizer_mode == "custom"`; defaults to `"simple"` | Selects the Simple splitting behavior or the trained BPE model (FR-009, FR-054) |
| `encoding` | `string` (`"cl100k_base"`) | Only if `tokenizer_mode == "tiktoken"` | Must be exactly `cl100k_base` (FR-010, FR-011) |
| `text` | `string` | Exactly one of `text`/`file` | Typed input (FR-001) |
| `file` | file (`.txt` or `.pdf`, ≤ 5MB) | Exactly one of `text`/`file` | Upload (FR-002, FR-003, FR-006) |

### Validation order (first failure wins)

1. Exactly one of `text` (non-empty after trim) / `file` present → else `EMPTY_INPUT` (FR-004).
2. If `file` present: type is `.txt` or `.pdf` → else `UNSUPPORTED_FILE_TYPE` (FR-005).
3. If `file` present: size ≤ 5MB → else `FILE_TOO_LARGE` (FR-006).
4. If `file` is `.pdf`: parseable → else `CORRUPTED_PDF` (FR-007).
5. If `file` is `.pdf`: extracted text non-empty → else `NO_EXTRACTABLE_TEXT` (FR-008).
6. If `tokenizer_mode == "tiktoken"`: `encoding == "cl100k_base"` → else `UNSUPPORTED_ENCODING` (FR-011).
7. If `tokenizer_mode == "custom"` and `custom_sub_mode == "bpe"`: a BPE model must already be trained
   (see [contracts/bpe.md](./bpe.md)) → else `NO_TRAINED_BPE_MODEL` (FR-055).

## Response — 200 OK

Body: `TokenizeResponse` (see data-model.md § TokenizationResult / TokenizeResponse).

```json
{
  "original_text": "Hello, world!",
  "source_type": "text",
  "tokenizer_mode": "tiktoken",
  "custom_sub_mode": null,
  "encoding": "cl100k_base",
  "extracted_text": null,
  "character_count": 13,
  "word_count": 2,
  "token_count": 4,
  "tokens_per_word": 2.0,
  "tokens_per_character": 0.31,
  "tokens": [
    { "index": 0, "id": 9906, "text": "Hello", "is_new": null, "is_unknown": null },
    { "index": 1, "id": 11, "text": ",", "is_new": null, "is_unknown": null },
    { "index": 2, "id": 1917, "text": " world", "is_new": null, "is_unknown": null },
    { "index": 3, "id": 0, "text": "!", "is_new": null, "is_unknown": null }
  ]
}
```

Example for `tokenizer_mode: "custom"`, `custom_sub_mode: "simple"` (note `encoding: null` and
populated `is_new`; `is_unknown` is always `null` here):

```json
{
  "original_text": "Hello, world!",
  "source_type": "text",
  "tokenizer_mode": "custom",
  "custom_sub_mode": "simple",
  "encoding": null,
  "extracted_text": null,
  "character_count": 13,
  "word_count": 2,
  "token_count": 4,
  "tokens_per_word": 2.0,
  "tokens_per_character": 0.31,
  "tokens": [
    { "index": 0, "id": 0, "text": "Hello", "is_new": true, "is_unknown": null },
    { "index": 1, "id": 1, "text": ",", "is_new": true, "is_unknown": null },
    { "index": 2, "id": 2, "text": "world", "is_new": true, "is_unknown": null },
    { "index": 3, "id": 3, "text": "!", "is_new": true, "is_unknown": null }
  ]
}
```

Example for `tokenizer_mode: "custom"`, `custom_sub_mode: "bpe"` (note `is_new` is always `null`;
`is_unknown: true` marks a character absent from the trained vocabulary, per FR-058):

```json
{
  "original_text": "abz",
  "source_type": "text",
  "tokenizer_mode": "custom",
  "custom_sub_mode": "bpe",
  "encoding": null,
  "extracted_text": null,
  "character_count": 3,
  "word_count": 1,
  "token_count": 2,
  "tokens_per_word": 2.0,
  "tokens_per_character": 0.67,
  "tokens": [
    { "index": 0, "id": 2, "text": "ab", "is_new": null, "is_unknown": false },
    { "index": 1, "id": null, "text": "z", "is_new": null, "is_unknown": true }
  ]
}
```

## Response — 4xx (validation/processing error)

Body: `ValidationError` (see data-model.md § ValidationError).

```json
{ "error_code": "FILE_TOO_LARGE", "message": "This file is larger than the 5MB limit. Please upload a smaller file." }
```

| `error_code` | HTTP status | Triggered by |
|---|---|---|
| `EMPTY_INPUT` | 400 | Neither `text` nor `file` provided (or both blank) |
| `UNSUPPORTED_FILE_TYPE` | 400 | `file` is not `.txt` or `.pdf` |
| `FILE_TOO_LARGE` | 400 | `file` exceeds 5MB |
| `CORRUPTED_PDF` | 400 | `file` is a `.pdf` that cannot be parsed |
| `NO_EXTRACTABLE_TEXT` | 400 | `file` is a `.pdf` that parses but yields no text |
| `UNSUPPORTED_ENCODING` | 400 | `encoding` present and not `cl100k_base` |
| `NO_TRAINED_BPE_MODEL` | 400 | `custom_sub_mode == "bpe"` but no BPE model has been trained yet (see [contracts/bpe.md](./bpe.md)) |
