# Contract: Custom Tokenizer BPE Endpoints

See [data-model.md](../data-model.md) for full field definitions of the types referenced below.
These endpoints only concern the Custom Tokenizer's **BPE** sub-mode; the Simple sub-mode's
vocabulary is served by [contracts/vocabulary.md](./vocabulary.md), and BPE *tokenization* itself is
served by the extended `POST /api/tokenize` (see [contracts/tokenize.md](./tokenize.md)), not by an
endpoint here.

## POST /api/bpe/train

Trains a BPE tokenizer on user-provided text, replacing any previously trained model (FR-037–FR-048).

- **Method / Path**: `POST /api/bpe/train`
- **Content-Type**: `application/json`

| Field | Type | Required | Notes |
|---|---|---|---|
| `training_text` | `string` | Yes | Text to train on (FR-037) |
| `vocab_size` | `integer` | Yes | Target vocabulary size (FR-038) |

### Validation order (first failure wins)

1. `training_text` non-empty after trim → else `EMPTY_TRAINING_TEXT` (FR-039).
2. `training_text` length ≤ 100,000 characters → else `TRAINING_TEXT_TOO_LONG` (FR-041).
3. `vocab_size` is a positive integer → else `INVALID_VOCAB_SIZE` (FR-040).
4. `vocab_size` ≤ 5,000 → else `VOCAB_SIZE_TOO_LARGE` (FR-042).
5. `vocab_size` > number of distinct characters in `training_text` → else `VOCAB_SIZE_TOO_SMALL` (FR-040).
6. No training run already in progress → else `TRAINING_IN_PROGRESS` (FR-044).

### Response — 200 OK

Body: `BpeStateResponse` (see data-model.md § BpeStateResponse), always with `trained: true`.

```json
{
  "trained": true,
  "vocabulary": [
    { "id": 0, "symbol": "a", "is_base": true },
    { "id": 1, "symbol": "b", "is_base": true },
    { "id": 2, "symbol": "ab", "is_base": false }
  ],
  "merge_rules": [
    { "order": 0, "left": "a", "right": "b", "merged": "ab", "id": 2 }
  ],
  "target_vocab_size": 3,
  "achieved_vocab_size": 3,
  "target_reached": true
}
```

Example where the target could not be fully reached (FR-047, US4 Scenario 5):

```json
{
  "trained": true,
  "vocabulary": [
    { "id": 0, "symbol": "a", "is_base": true },
    { "id": 1, "symbol": "b", "is_base": true },
    { "id": 2, "symbol": "ab", "is_base": false }
  ],
  "merge_rules": [
    { "order": 0, "left": "a", "right": "b", "merged": "ab", "id": 2 }
  ],
  "target_vocab_size": 50,
  "achieved_vocab_size": 3,
  "target_reached": false
}
```

### Response — 4xx (validation error)

Body: `ValidationError` (see data-model.md § ValidationError).

```json
{ "error_code": "VOCAB_SIZE_TOO_SMALL", "message": "The target vocabulary size must be larger than the number of distinct characters in the training text." }
```

| `error_code` | HTTP status | Triggered by |
|---|---|---|
| `EMPTY_TRAINING_TEXT` | 400 | `training_text` missing or blank after trimming |
| `TRAINING_TEXT_TOO_LONG` | 400 | `training_text` exceeds 100,000 characters |
| `INVALID_VOCAB_SIZE` | 400 | `vocab_size` is not a positive integer |
| `VOCAB_SIZE_TOO_LARGE` | 400 | `vocab_size` exceeds 5,000 |
| `VOCAB_SIZE_TOO_SMALL` | 400 | `vocab_size` ≤ number of distinct characters in `training_text` |
| `TRAINING_IN_PROGRESS` | 409 | Another training run is currently in progress |

## GET /api/bpe/vocabulary

Returns the current BPE training status, vocabulary, and merge rules, independent of any specific
tokenize call (FR-049, FR-053) — this is what lets the UI render the correct empty/trained state,
including immediately after a page refresh.

- **Method / Path**: `GET /api/bpe/vocabulary`
- **Request body**: none

### Response — 200 OK

Body: `BpeStateResponse`. Before any successful training run:

```json
{
  "trained": false,
  "vocabulary": [],
  "merge_rules": [],
  "target_vocab_size": null,
  "achieved_vocab_size": null,
  "target_reached": null
}
```

After a successful training run, the shape matches `POST /api/bpe/train`'s response above.

## Error responses

This endpoint is read-only with no user-supplied input to validate, so no `ValidationError` cases
apply. An unexpected server-side failure surfaces as a generic 500 with
`{ "error_code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." }`, handled
by the same central exception handler described in plan.md's Error Handling section.
