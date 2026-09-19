# Contract: Custom Tokenizer Vocabulary Endpoints

See [data-model.md](../data-model.md) for full field definitions of the types referenced below.
These endpoints only ever concern the Custom Tokenizer's vocabulary; Tiktoken has no vocabulary
endpoint, since its vocabulary is external/unmodifiable (FR-015).

## GET /api/vocabulary

Returns the current Custom Tokenizer vocabulary, independent of any specific tokenize call (FR-023).

- **Method / Path**: `GET /api/vocabulary`
- **Request body**: none

### Response — 200 OK

Body: `CustomVocabularyEntry[]`.

```json
[
  { "id": 0, "token": "Hello", "frequency": 3, "status": "existing" },
  { "id": 1, "token": ",", "frequency": 3, "status": "existing" },
  { "id": 2, "token": "world", "frequency": 1, "status": "new" },
  { "id": 3, "token": "!", "frequency": 2, "status": "existing" }
]
```

An empty vocabulary (initial state, or immediately after a reset) returns `[]`.

## POST /api/vocabulary/reset

Clears the Custom Tokenizer vocabulary back to its initial empty state (FR-026).

- **Method / Path**: `POST /api/vocabulary/reset`
- **Request body**: none

### Response — 200 OK

Body: `VocabularyResetResponse`.

```json
{
  "message": "The Custom Tokenizer vocabulary has been reset.",
  "vocabulary": []
}
```

## Error responses

Both endpoints are read/reset-only operations with no user-supplied input to validate, so no
`ValidationError` cases apply. An unexpected server-side failure (not covered by the spec's defined
validation errors) surfaces as a generic 500 with `{ "error_code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." }`,
handled by the same central exception handler described in plan.md's Error Handling section — this
is a defensive fallback, not a spec-required behavior.
