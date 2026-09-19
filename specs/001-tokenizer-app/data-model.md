# Phase 1 Data Model: Tokenizer Application

Entities derived from spec.md's Key Entities section, expanded with concrete fields/types needed for
the Pydantic schemas (backend) and mirrored TypeScript types (frontend). No entity is persisted —
all of these are either request/response payloads or in-memory runtime state (constitution
Principle VI; spec FR-035).

## TokenItem

A single unit within a Tokenization Result (spec: "Token").

| Field | Type | Notes |
|---|---|---|
| `index` | `int` | Position of this token within the result, 0-based (FR-027) |
| `id` | `int \| null` | Token ID — a real Tiktoken ID for `cl100k_base`, a deterministic Custom Tokenizer (Simple) vocabulary ID (FR-013, FR-020), or a deterministic BPE vocabulary ID (FR-052). `null` only for a BPE-mode token representing a character absent from the trained vocabulary (FR-058) |
| `text` | `str` | The token's text/string value (FR-027) |
| `is_new` | `bool \| null` | Custom Tokenizer **Simple** sub-mode only: whether this occurrence created a new vocabulary entry (FR-022, FR-024). Always `null` for Tiktoken mode and BPE sub-mode, since the concept does not apply there (keeps tokenizer/sub-mode output independent, FR-016, FR-061). |
| `is_unknown` | `bool \| null` | Custom Tokenizer **BPE** sub-mode only: `true` if this token is a character that never appeared in the training text's base vocabulary and so matched no merge rule (FR-058). Always `null` for Tiktoken mode and the Simple sub-mode. |

## TokenizeRequest (inbound form fields)

Not a JSON body — submitted as `multipart/form-data` (see [contracts/tokenize.md](./contracts/tokenize.md)).

| Field | Type | Notes |
|---|---|---|
| `tokenizer_mode` | `"tiktoken" \| "custom"` | Required (FR-009) |
| `custom_sub_mode` | `"simple" \| "bpe"` | Only meaningful when `tokenizer_mode == "custom"`; defaults to `"simple"` (FR-009, FR-061) |
| `encoding` | `"cl100k_base"` | Required when `tokenizer_mode == "tiktoken"`; ignored/rejected otherwise (FR-010, FR-011) |
| `text` | `str \| null` | Typed input; mutually exclusive with `file` (FR-001, FR-004) |
| `file` | `UploadFile \| null` | TXT or PDF upload; mutually exclusive with `text` (FR-002, FR-003, FR-004) |

**Validation rules**: exactly one of `text`/`file` must be present and non-empty after trimming;
`file` must be `.txt` or `.pdf` and ≤ 5MB (FR-005, FR-006); a PDF must be parseable and yield
non-empty extracted text (FR-007, FR-008); `encoding`, if provided, must equal `cl100k_base`
(FR-011); when `custom_sub_mode == "bpe"`, a trained BPE model must already exist, else
`NO_TRAINED_BPE_MODEL` (FR-055).

## TokenizationResult / TokenizeResponse

The outcome of one tokenize action (spec: "Tokenization Result"), returned as the API response body.

| Field | Type | Notes |
|---|---|---|
| `original_text` | `str` | The text that was actually tokenized (typed text, or text extracted from the upload) (FR-030) |
| `source_type` | `"text" \| "txt_file" \| "pdf_file"` | Where the input came from (FR-030) |
| `tokenizer_mode` | `"tiktoken" \| "custom"` | Which tokenizer produced this result |
| `custom_sub_mode` | `"simple" \| "bpe" \| null` | Set when `tokenizer_mode == "custom"`; `null` for `tiktoken` mode (FR-009, FR-030) |
| `encoding` | `"cl100k_base" \| null` | Set for `tiktoken` mode, `null` for `custom` mode (FR-030) |
| `extracted_text` | `str \| null` | Populated only when `source_type != "text"`, so the UI can show what was extracted (FR-029) |
| `character_count` | `int` | (FR-028) |
| `word_count` | `int` | (FR-028) |
| `token_count` | `int` | (FR-028) |
| `tokens_per_word` | `float` | `0` when `word_count == 0` (FR-028) |
| `tokens_per_character` | `float` | `0` when `character_count == 0` (FR-028) |
| `tokens` | `TokenItem[]` | Ordered list, one entry per produced token (FR-027, FR-030) |

## CustomVocabularyEntry (spec: "Custom Vocabulary Entry") — Simple sub-mode

Runtime state held by `VocabularyStore`, and the shape returned by `GET /api/vocabulary`. This entity
belongs only to the Custom Tokenizer's **Simple** sub-mode; the BPE sub-mode has its own separate
entities below (FR-061).

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | Deterministic ID, assigned once at creation (FR-020) |
| `token` | `str` | The token text this entry represents |
| `frequency` | `int` | Number of times this token has been produced across all Custom Tokenizer operations since the last reset (FR-021) |
| `status` | `"new" \| "existing"` | `"new"` if this token was *created* (not merely reused) by the most recently completed Custom Tokenizer operation, else `"existing"` (FR-022, FR-023, FR-024) |

**Identity rule**: `token` (the string) is the natural key within `VocabularyStore.entries`; `id` is
a separate surrogate value exposed to clients and is never reassigned to a different token string.

**Lifecycle / state transitions**:

```text
[does not exist] --(token produced by Custom Tokenizer, first time)--> [exists: frequency=1, status=new]
[exists: status=new|existing] --(same token produced again by a *later* operation)--> [exists: frequency+=1, status=existing]
[any state] --(POST /api/vocabulary/reset)--> [does not exist] (entries cleared, id counter restarts at 0)
```

`status` is therefore always computed relative to the *most recently completed* operation, not a
permanent per-token flag — after a new operation runs, only the tokens it *created for the first
time* are `"new"`; every reused token (including ones this same operation just incremented the
frequency of) is `"existing"`, and any previously-`"new"` entry reverts to `"existing"` once a
different operation completes.

## VocabularyResetResponse

| Field | Type | Notes |
|---|---|---|
| `message` | `str` | Plain-language confirmation (FR-026) |
| `vocabulary` | `CustomVocabularyEntry[]` | Always `[]` immediately after a reset |

## BpeVocabularyEntry (spec: "BPE Vocabulary Entry") — BPE sub-mode

A single symbol known to the currently trained BPE model.

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | Deterministic ID: base characters sorted by codepoint get the lowest IDs, merge-created symbols get sequential IDs in merge order (FR-052) |
| `symbol` | `str` | The symbol's text (a single training-text character, or the concatenation produced by a merge) |
| `is_base` | `bool` | `true` if this symbol is one of the original training-text characters, `false` if it was created by a merge |

## BpeMergeRule (spec: "BPE Merge Rule") — BPE sub-mode

One ordered rule learned during training; this list also serves as the per-step training-detail view
required by FR-051 (each rule IS one training step).

| Field | Type | Notes |
|---|---|---|
| `order` | `int` | 0-based position in the sequence merges were learned (FR-050, FR-051) |
| `left` | `str` | The left symbol of the pair selected at this step |
| `right` | `str` | The right symbol of the pair selected at this step |
| `merged` | `str` | The resulting merged symbol (`left + right`) |
| `id` | `int` | The vocabulary ID assigned to `merged` (matches its `BpeVocabularyEntry.id`) |

## BpeTrainRequest (inbound JSON body for `POST /api/bpe/train`)

| Field | Type | Notes |
|---|---|---|
| `training_text` | `str` | User-provided text to train on (FR-037) |
| `vocab_size` | `int` | Target vocabulary size (FR-038) |

**Validation rules**: `training_text` must be non-empty after trimming (else `EMPTY_TRAINING_TEXT`,
FR-039) and no longer than 100,000 characters (else `TRAINING_TEXT_TOO_LONG`, FR-041); `vocab_size`
must be a positive integer (else `INVALID_VOCAB_SIZE`, FR-040), no greater than 5,000 (else
`VOCAB_SIZE_TOO_LARGE`, FR-042), and strictly greater than the number of distinct characters in
`training_text` (else `VOCAB_SIZE_TOO_SMALL`, FR-040); a training run already in progress rejects a
new request with `TRAINING_IN_PROGRESS` (FR-044).

## BpeStateResponse (spec: "BPE Training Session") — response body for both `POST /api/bpe/train` and `GET /api/bpe/vocabulary`

Represents the one currently trained (or untrained) BPE model.

| Field | Type | Notes |
|---|---|---|
| `trained` | `bool` | `false` before any successful training run (FR-053) |
| `vocabulary` | `BpeVocabularyEntry[]` | `[]` when `trained == false` (FR-049) |
| `merge_rules` | `BpeMergeRule[]` | `[]` when `trained == false` (FR-050, FR-051) |
| `target_vocab_size` | `int \| null` | The most recently requested target; `null` when `trained == false` |
| `achieved_vocab_size` | `int \| null` | The vocabulary size actually reached; `null` when `trained == false` |
| `target_reached` | `bool \| null` | `achieved_vocab_size == target_vocab_size`; `null` when `trained == false` (FR-047) |

**Lifecycle / state transitions**:

```text
[untrained: trained=false] --(POST /api/bpe/train succeeds)--> [trained: vocabulary + merge_rules populated]
[trained] --(POST /api/bpe/train succeeds again)--> [trained: previous vocabulary + merge_rules fully replaced] (FR-048)
[any state] --(POST /api/bpe/train while in_progress)--> rejected with TRAINING_IN_PROGRESS, no state change (FR-044)
```

There is no reset endpoint for the BPE sub-mode (unlike the Simple sub-mode's `VocabularyResetResponse`)
— starting a new training run is the sub-mode's only state-clearing action, matching spec Assumptions.

## ValidationError (error response shape)

Not a spec "entity" but a shared contract needed by every error path (FR-031, FR-032).

| Field | Type | Notes |
|---|---|---|
| `error_code` | `"EMPTY_INPUT" \| "UNSUPPORTED_FILE_TYPE" \| "FILE_TOO_LARGE" \| "CORRUPTED_PDF" \| "NO_EXTRACTABLE_TEXT" \| "UNSUPPORTED_ENCODING" \| "EMPTY_TRAINING_TEXT" \| "TRAINING_TEXT_TOO_LONG" \| "INVALID_VOCAB_SIZE" \| "VOCAB_SIZE_TOO_LARGE" \| "VOCAB_SIZE_TOO_SMALL" \| "TRAINING_IN_PROGRESS" \| "NO_TRAINED_BPE_MODEL"` | Machine-readable, one per validation rule in FR-004–FR-008, FR-011, FR-039–FR-042, FR-044, FR-055 |
| `message` | `str` | Plain-language, user-facing sentence describing the problem |

## Entity Relationship Summary

```text
TokenizeRequest ──(processed by tokenizer_mode + custom_sub_mode)──▶ TokenizationResult (TokenizeResponse)
                                                        │
                                                        └── contains ──▶ TokenItem[]

CustomTokenizerService ──(reads/writes, Simple sub-mode)──▶ VocabularyStore ──(holds)──▶ CustomVocabularyEntry[]
BpeService ──(reads for tokenize, writes only via train, BPE sub-mode)──▶ BpeModelStore ──(holds)──▶ BpeVocabularyEntry[] + BpeMergeRule[]
TiktokenService ──(stateless, no relationship to VocabularyStore or BpeModelStore)

BpeTrainRequest ──(processed by BpeService.train)──▶ BpeStateResponse (also GET /api/bpe/vocabulary's shape)
```

`TiktokenService` never touches `VocabularyStore` or `BpeModelStore`; `CustomVocabularyEntry` only
exists for the Simple sub-mode and `BpeVocabularyEntry`/`BpeMergeRule` only exist for the BPE
sub-mode — this three-way separation is what keeps Tiktoken, Simple, and BPE independent (FR-016,
FR-061). BPE tokenization reads `BpeModelStore` but never writes to it (FR-056); only
`POST /api/bpe/train` writes.
