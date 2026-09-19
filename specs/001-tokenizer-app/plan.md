# Implementation Plan: Tokenizer Application

**Branch**: `001-tokenizer-app` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tokenizer-app/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build a small React + FastAPI application that lets a user submit text (typed, or extracted from an
uploaded TXT/PDF), tokenize it with either the real Tiktoken library (`cl100k_base` encoding) or an
application-owned, regex-based Custom Tokenizer, and view the resulting tokens, statistics, and (for
the Custom Tokenizer) a live in-memory vocabulary with deterministic IDs and frequency counts. All
tokenization, validation, extraction, and vocabulary state live in FastAPI services behind thin
routes; React only renders state and calls the API. The interface uses a dark, neon-gradient
("cyberpunk") visual theme, built to remain accessible (WCAG AA contrast) and responsive.

**BPE enhancement (2026-09-18)**: The Custom Tokenizer gains a second sub-mode, BPE, alongside the
original (now called "Simple") sub-mode. In BPE sub-mode, a user submits training text and a target
vocabulary size to `POST /api/bpe/train`; the backend runs a word-level Byte Pair Encoding algorithm
entirely in a new `BpeService`/`BpeModelStore`, producing a deterministic vocabulary and an ordered
list of merge rules held as the single active trained model (in-memory, one model at a time, no
persistence). The user can then tokenize new text through the existing `POST /api/tokenize` endpoint
(extended with a `custom_sub_mode` field) using only those learned rules — no learning happens during
tokenization — and the result renders in the same tokenization result table used by every other mode.
This keeps the frontend/backend boundary, thin-routes rule, and no-database constraint unchanged; it
adds one new backend service pair and one new route module, no new frontend state paradigm, and no
new dependencies.

## Technical Context

**Language/Version**: Python 3.11+ (backend); TypeScript 5.x with React 18 (frontend, via Vite)

**Primary Dependencies**: FastAPI, `tiktoken`, PyMuPDF (`fitz`), Pydantic v2, `pydantic-settings`,
Uvicorn (backend); React, TypeScript, Vite (frontend build tool), native `fetch` for HTTP (no extra
HTTP client library needed)

**Storage**: N/A — no database or persistent storage. The Custom Tokenizer vocabulary lives in a
single in-memory Python object for the lifetime of the running backend process (constitution
Principle VI; spec FR-035). The BPE sub-mode's trained vocabulary and merge rules live in a second,
separate in-memory Python object (at most one trained model at a time), also for the lifetime of the
running backend process (spec FR-035, FR-048).

**Testing**: `pytest` + FastAPI `TestClient`/`httpx` (backend, constitution-mandated); Vitest +
React Testing Library (frontend automated tests)

**Target Platform**: Web — browser client (desktop + mobile viewport widths) talking to a
Linux/cross-platform-hosted FastAPI server over HTTP

**Project Type**: Web application (frontend + backend, per constitution Principle I)

**Performance Goals**: End-to-end tokenize-and-render under 3 seconds for typical inputs (a few
paragraphs of text or an equivalent document), per spec SC-001. No high-throughput/concurrent-load
target — this is a single-instance demonstration tool, not a scaled service.

**Constraints**:
- No database; vocabulary and all request state exist only in backend process memory.
- Uploads capped at 5MB (spec Clarifications, FR-006).
- Tiktoken mode supports exactly one encoding, `cl100k_base` (spec Clarifications, FR-010/FR-011);
  the Tiktoken vocabulary/encoding tables are never modified (FR-015).
- Custom Tokenizer splitting MUST be regex-based and deterministic: whitespace-separated word runs
  become tokens, and each punctuation character becomes its own token (spec Clarifications, FR-014).
- React MUST NOT contain any tokenization, splitting, or vocabulary logic (constitution Principle II).
- API routes MUST stay thin; all business logic lives in backend services (constitution Principle III).
- BPE training text is capped at 100,000 characters and target vocabulary size at 5,000 (spec
  Assumptions, FR-041/FR-042); both caps are enforced in the backend before training starts.
- BPE training and BPE tokenization MUST NOT modify each other's inputs: tokenizing with a trained
  BPE model MUST NOT add, remove, or reorder any vocabulary entry or merge rule (FR-056).
- The BPE sub-mode holds at most one trained model at a time; starting a new training run replaces it
  atomically (FR-048).

**Scale/Scope**: 5 prioritized user stories, 5 REST endpoints, ~7 backend services, ~20 frontend
components/hooks. Single shared, application-wide Custom Tokenizer (Simple) vocabulary and a single
shared BPE trained model (no per-user isolation, no accounts).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Simple Modular Architecture | React (UI) and FastAPI (logic) are separate projects (`frontend/`, `backend/`) with no shared runtime code | PASS |
| II. Frontend Scope Boundary | React limited to UI, interaction, API calls, loading/error states, visualization; no tokenizer/vocabulary logic in `frontend/src` | PASS |
| III. Backend Authority & Thin Routes | All validation, extraction, tokenization, stats, and vocabulary logic in `backend/app/services/*`; `backend/app/api/routes/*` only parse input, call a service, return a schema | PASS |
| IV. File Input Handling | TXT/PDF validation and extraction happen only in `FileService` (backend); frontend treats upload as an opaque blob | PASS |
| V. Dual Independent Tokenizer Services | `TiktokenService` and `CustomTokenizerService` implement a shared `TokenizerService` protocol, have no shared mutable state, and are selected by a mode flag the frontend passes through unchanged. The new `BpeService`/`BpeModelStore` is a self-contained addition inside the Custom Tokenizer's domain (a `custom_sub_mode`), with its own state, fully independent of both `TiktokenService` and the Simple sub-mode's `VocabularyStore` | PASS |
| VI. Simplicity & No Unnecessary Infrastructure | No database, no state-management library beyond React's built-in `useReducer`, no extra HTTP client library, no health/metrics endpoints not required by the spec. BPE training runs synchronously in the request/response cycle (no job queue/polling infrastructure), since it must complete within the spec's 5-second target (SC-013) | PASS |
| VII. Testability & Traceability | Every FR maps to a pytest unit/integration test (backend) or a Vitest/RTL test (frontend); see Testing Strategy | PASS |

No violations identified. Complexity Tracking table is not applicable (see bottom of this document).

## Project Structure

### Documentation (this feature)

```text
specs/001-tokenizer-app/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── tokenize.md
│   ├── vocabulary.md
│   └── bpe.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py                       # FastAPI app instance, router mounting, CORS setup
│   ├── api/
│   │   └── routes/
│   │       ├── tokenize.py           # POST /api/tokenize (thin controller)
│   │       ├── vocabulary.py         # GET /api/vocabulary, POST /api/vocabulary/reset
│   │       └── bpe.py                # POST /api/bpe/train, GET /api/bpe/vocabulary (thin controllers)
│   ├── schemas/                      # Pydantic request/response contracts
│   │   ├── tokenize.py               # TokenizeRequest (form fields), TokenizeResponse, TokenItem
│   │   ├── vocabulary.py             # VocabularyEntry, VocabularyResetResponse
│   │   └── bpe.py                    # BpeTrainRequest, BpeVocabularyEntry, BpeMergeRule, BpeStateResponse
│   ├── services/
│   │   ├── tokenizer_base.py         # TokenizerService protocol + shared TokenItem/TokenizationOutcome
│   │   ├── tiktoken_service.py       # Wraps `tiktoken` (cl100k_base only), read-only
│   │   ├── custom_tokenizer_service.py  # Regex splitting + vocabulary read/write (Simple sub-mode)
│   │   ├── vocabulary_store.py       # In-memory Simple-mode vocabulary state, lock, reset lifecycle
│   │   ├── bpe_service.py            # BPE training algorithm + rule-only tokenization (BPE sub-mode)
│   │   ├── bpe_store.py              # In-memory single trained BPE model, lock, in-progress flag
│   │   ├── file_service.py           # TXT/PDF validation + text extraction (PyMuPDF)
│   │   └── stats_service.py          # char/word/token counts and ratios (shared by all modes)
│   ├── core/
│   │   ├── config.py                 # Settings (max upload size, allowed origins) via pydantic-settings
│   │   └── errors.py                 # Exception hierarchy + FastAPI exception handlers
│   └── __init__.py
└── tests/
    ├── unit/
    │   ├── test_tiktoken_service.py
    │   ├── test_custom_tokenizer_service.py
    │   ├── test_vocabulary_store.py
    │   ├── test_bpe_service.py
    │   ├── test_bpe_store.py
    │   ├── test_file_service.py
    │   └── test_stats_service.py
    ├── integration/
    │   ├── test_tokenize_endpoint.py
    │   ├── test_vocabulary_endpoint.py
    │   └── test_bpe_endpoint.py
    └── fixtures/
        ├── sample.txt
        ├── sample_valid.pdf
        ├── sample_corrupted.pdf
        ├── sample_textless.pdf
        └── bpe_training_sample.txt

frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── tokenizerClient.ts        # fetch wrapper: postTokenize, getVocabulary, resetVocabulary
│   │   └── bpeClient.ts              # fetch wrapper: trainBpe, getBpeState
│   ├── types/
│   │   ├── tokenizer.ts              # TS types mirroring backend schemas
│   │   └── bpe.ts                    # TS types mirroring backend BPE schemas
│   ├── state/
│   │   ├── tokenizerReducer.ts       # useReducer state machine (idle/loading/success/error)
│   │   └── bpeReducer.ts             # useReducer state machine for training + BPE-tokenize flows
│   ├── hooks/
│   │   ├── useTokenizer.ts           # Encapsulates request lifecycle + vocabulary refresh
│   │   └── useBpeTokenizer.ts        # Encapsulates train lifecycle + BPE-tokenize lifecycle
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx         # Title + description
│   │   │   └── AppLayout.tsx
│   │   ├── input/
│   │   │   ├── InputModeToggle.tsx   # Typed text vs. file upload
│   │   │   ├── TextInputPanel.tsx
│   │   │   └── FileUploadPanel.tsx
│   │   ├── controls/
│   │   │   ├── TokenizerModeSelect.tsx  # Tiktoken vs. Custom Tokenizer
│   │   │   ├── CustomSubModeToggle.tsx  # Simple vs. BPE (Custom Tokenizer mode only)
│   │   │   ├── EncodingSelect.tsx       # cl100k_base (fixed option, Tiktoken mode only)
│   │   │   └── TokenizeButton.tsx
│   │   ├── results/
│   │   │   ├── StatisticsPanel.tsx
│   │   │   ├── TokenVisualizer.tsx      # Per-token chips (index/id/text, new/unknown-token accent)
│   │   │   └── ExtractedTextPanel.tsx   # Shown for file-sourced input only
│   │   ├── vocabulary/
│   │   │   ├── VocabularyTable.tsx
│   │   │   └── VocabularyResetButton.tsx
│   │   ├── bpe/
│   │   │   ├── BpeTrainingPanel.tsx     # Training text input + target vocab size + start-training control
│   │   │   ├── BpeVocabularyTable.tsx   # Learned vocabulary (id, symbol)
│   │   │   ├── BpeMergeRulesTable.tsx   # Ordered merge rules / per-step training details
│   │   │   └── BpeTokenizePanel.tsx     # New-text input + tokenize control for the trained BPE model
│   │   └── feedback/
│   │       ├── LoadingState.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBanner.tsx
│   └── styles/
│       ├── theme.css                 # Neon-gradient/cyberpunk design tokens
│       └── global.css
└── tests/
    ├── components/
    └── hooks/
```

**Structure Decision**: Web application layout (`backend/` + `frontend/` as independent projects),
matching constitution Principle I. This is the standard "Option 2" shape — no `src/` monorepo root,
no shared package between frontend and backend (their only contract is the REST API in `contracts/`).

## Architecture & Component Boundaries

```text
┌─────────────────────────────┐        HTTP/JSON+multipart        ┌──────────────────────────────────────┐
│           frontend/          │ ─────────────────────────────────▶ │                backend/                │
│  React components (UI only)  │ ◀───────────────────────────────── │  api/routes (thin) → services (logic) │
└─────────────────────────────┘                                     └──────────────────────────────────────┘
                                                                              │                │
                                                                     TiktokenService   CustomTokenizerService
                                                                     (wraps `tiktoken`,        │
                                                                      cl100k_base, stateless)   ▼
                                                                                        VocabularyStore (in-memory,
                                                                                         locked, resettable)
```

- **Frontend** owns: input capture, mode/encoding selection, calling the API, loading/empty/error/
  success states, rendering tokens/statistics/vocabulary. It never decides how a token boundary is
  computed — it only displays what the backend returns (constitution Principle II).
- **Backend routes** own: parsing the incoming form, calling exactly one service chain, and shaping
  the HTTP response. No branching on tokenizer internals happens in a route (constitution Principle III).
- **Backend services** own: validation, extraction, tokenization, statistics, and vocabulary state.
  `TiktokenService` and `CustomTokenizerService` both implement the same `TokenizerService` protocol
  (`tokenize(text: str) -> TokenizationOutcome`) so a route can select either without knowing their
  internals — this is what lets either be replaced/extended independently (constitution Principle V).
  `BpeService` sits behind `CustomTokenizerService`'s `custom_sub_mode == "bpe"` branch: it exposes
  `train(text, vocab_size) -> BpeModelState` and `tokenize(text) -> TokenizationOutcome` (using only
  the currently stored model), and owns no state itself — all trained-model state lives in
  `BpeModelStore`, mirroring how `VocabularyStore` backs the Simple sub-mode.

## Backend Service Design

### Tiktoken Service (`tiktoken_service.py`)

- Loads `tiktoken.get_encoding("cl100k_base")` **once** at module import time and reuses that
  encoding object for every request (it is immutable and thread-safe; this also guarantees the
  encoding/vocabulary is never mutated, satisfying FR-015).
- `tokenize(text)`: calls `encoding.encode(text)` for the list of integer IDs, then decodes each ID
  individually (`encoding.decode_single_token_bytes(id)`, decoded as UTF-8 with `errors="replace"`
  for display) to produce the human-readable token text for each position.
- Stateless: holds no per-request or cross-request mutable state, which is what makes independence
  from the Custom Tokenizer trivial to guarantee (FR-016).

### Custom Tokenizer Service (`custom_tokenizer_service.py`)

- **Splitting rule** (regex, per spec Clarifications): `re.compile(r"\w+|[^\w\s]")` scanned
  left-to-right over the input with `finditer`. Each match is either a run of word characters
  (letters/digits/underscore) or a single non-whitespace, non-word character (punctuation); plain
  whitespace is the separator and never becomes a token itself. Applying the same compiled pattern to
  the same string always yields the same ordered token list (FR-014).
- For each matched token string, in left-to-right order:
  1. Ask `VocabularyStore` whether the token exists.
  2. If it exists: reuse its ID, increment its frequency, mark it "existing" for this operation (FR-018).
  3. If not: `VocabularyStore` assigns the next deterministic ID, creates the entry at frequency 1,
     and marks it "new" for this operation (FR-019, FR-020).
- Returns a `TokenizationOutcome` whose `TokenItem`s carry `is_new: bool` per token, so the frontend
  can highlight newly created tokens in the same result view without a second request (FR-022, FR-024).

### Custom Vocabulary Store (`vocabulary_store.py`)

- A single process-wide instance (constructed once, e.g. as a FastAPI dependency returning a module-
  level singleton) holding:
  - `entries: dict[str, VocabularyEntryState]` — token text → `{id, frequency}`.
  - `next_id: int` — monotonic counter, starts at `0`, incremented on every new entry. IDs are never
    reused after a reset produces new entries with the same text (reset restarts the counter at `0`,
    per spec Assumptions: "initial state" = empty).
  - `last_operation_new_tokens: set[str]` — the token strings created by the most recently completed
    Custom Tokenizer operation; used to compute each entry's display `status` ("new" vs "existing")
    for FR-023/FR-024 without permanently tagging history.
- **Concurrency**: all read-modify-write sequences (lookup-or-create, frequency increment, reset) run
  inside a single `threading.Lock`, because FastAPI can execute synchronous request handlers on
  multiple worker threads concurrently; without the lock, two simultaneous requests could race on
  `next_id` and assign duplicate IDs.
- **Lifecycle**: `tokenize_and_update(tokens) -> outcome`; `snapshot() -> list[VocabularyEntry]` (for
  `GET /api/vocabulary`, independent of any specific tokenize call — FR-023); `reset()` clears
  `entries`, `next_id`, and `last_operation_new_tokens` atomically (FR-026).

### BPE Service (`bpe_service.py`) and BPE Model Store (`bpe_store.py`)

- **Training input shape**: `training_text` is split into whitespace-delimited words via `.split()`
  (the same word-boundary concept as the Simple sub-mode's splitting rule); each *distinct* word is
  tracked once with a frequency count (how many times it occurs in `training_text`), and represented
  internally as a tuple of single-character symbols. Whitespace itself is never a symbol and is never
  merged across word boundaries — consistent with FR-014's "whitespace is the separator, never a
  token" convention, and with the standard (Sennrich et al.) BPE formulation of merging within words.
- **Base vocabulary**: the set of distinct characters across all words, assigned deterministic IDs in
  sorted (codepoint) order starting at `0`, so iteration-order differences in Python sets/dicts never
  affect the resulting IDs (FR-052).
- **Training loop** (`train(text, vocab_size)`):
  1. Count the frequency of every adjacent symbol pair across all words (each word's internal pairs
     counted `word_frequency` times).
  2. If no pair occurs more than once, stop (nothing left worth merging) — this is the early-stop
     condition for FR-047/US4 Scenario 5.
  3. Otherwise select the pair with the highest total frequency; on a tie, select the pair that is
     lexicographically smallest when comparing `(left_symbol, right_symbol)` as a tuple of strings —
     a fixed, auditable tie-break that makes step 3 fully deterministic regardless of dict/set
     iteration order (FR-046).
  4. Merge every occurrence of that pair, in every word, into one new symbol; assign it the next
     sequential ID after the current highest assigned ID; append a `BpeMergeRule(order, left, right,
     merged, id)` to the ordered merge-rule list (FR-045, FR-049–FR-052).
  5. Repeat from step 1 until the vocabulary reaches `vocab_size` or step 2's stop condition triggers.
  6. Return the final vocabulary, ordered merge rules, and `achieved_vocab_size` (may be less than the
     requested `vocab_size` — FR-047).
- **Tokenization** (`tokenize(text)`, used only after a model exists): split `text` into whitespace-
  delimited words the same way; for each word, apply the trained merge rules **in the order they were
  learned** (never recomputing frequencies or selecting new pairs) until no further learned rule
  applies to that word — this is what guarantees "no learning during tokenization" (FR-056). A
  character in `text` that never appeared in the training text's base vocabulary cannot match any
  merge rule, so it naturally remains an unmerged, single-character symbol with no vocabulary ID;
  such symbols are returned with `id: null` and `is_unknown: true` on their `TokenItem` (FR-058).
- **`BpeModelStore`**: a single process-wide instance holding at most one trained model — `vocabulary:
  dict[str, int]`, `merge_rules: list[BpeMergeRule]`, `target_vocab_size: int | None`,
  `achieved_vocab_size: int | None`, `trained: bool`, and an `in_progress: bool` flag. All reads/
  writes (train, snapshot, in-progress check) run inside one `threading.Lock`, mirroring
  `VocabularyStore`'s concurrency approach (same rationale: FastAPI's sync thread pool). A `train()`
  call that finds `in_progress == True` raises a `TrainingInProgressError` immediately rather than
  queuing (FR-044); a successful `train()` call atomically replaces the previous vocabulary/merge
  rules (FR-048). `snapshot() -> BpeModelState` backs `GET /api/bpe/vocabulary`, returning an
  "untrained" shape (`trained: false`, empty vocabulary/merge rules) before the first successful
  training run (FR-053).

### File Service (`file_service.py`)

- `validate_upload(filename, content_type, size)`: rejects unsupported types (anything other than
  `text/plain`/`.txt` or `application/pdf`/`.pdf`) and rejects size over 5MB **before** any parsing
  is attempted (FR-005, FR-006). Size is checked against the upload's declared size and enforced again
  by capping actual bytes read, so a missing/incorrect `Content-Length` cannot bypass the limit.
- `extract_txt(raw_bytes) -> str`: decodes as UTF-8; a decode failure or an all-whitespace result is
  treated as invalid/empty input (FR-004 applies uniformly once text is extracted).
- `extract_pdf(raw_bytes) -> str`: opens with `fitz.open(stream=raw_bytes, filetype="pdf")` inside a
  `try/except` that converts any PyMuPDF-level failure into a "corrupted PDF" error (FR-007);
  concatenates `page.get_text()` across all pages; if the stripped result is empty, raises a
  "no extractable text" error (FR-008) — this is also how scanned/image-only PDFs are detected, since
  OCR is out of scope.

### Statistics Service (`stats_service.py`)

- Pure functions, no dependency on which tokenizer produced the tokens, so both modes report
  statistics identically (FR-028), avoiding duplicated logic (constitution Principle VI):
  - `character_count = len(original_text)`
  - `word_count = len(original_text.split())`
  - `token_count = len(tokens)`
  - `tokens_per_word = token_count / word_count if word_count else 0`
  - `tokens_per_character = token_count / character_count if character_count else 0`

### Error Handling (`core/errors.py`)

- Exception hierarchy rooted at `TokenizerAppError`, with one subclass per validation failure named
  in the spec: `EmptyInputError`, `UnsupportedFileTypeError`, `FileTooLargeError`, `CorruptedPdfError`,
  `NoExtractableTextError`, `UnsupportedEncodingError`, and, for the BPE sub-mode: `EmptyTrainingTextError`,
  `TrainingTextTooLongError`, `InvalidVocabSizeError`, `VocabSizeTooLargeError`, `VocabSizeTooSmallError`,
  `TrainingInProgressError`, `NoTrainedBpeModelError`.
- A single FastAPI exception handler maps each subclass to an HTTP 400/422 response with the shape
  `{ "error_code": "<SCREAMING_SNAKE_CASE>", "message": "<plain-language sentence>" }` (FR-031, FR-032).
  Routes never construct error JSON by hand — they only raise, and the handler formats it.

## API Contracts

Full request/response shapes are in [contracts/tokenize.md](./contracts/tokenize.md),
[contracts/vocabulary.md](./contracts/vocabulary.md), and [contracts/bpe.md](./contracts/bpe.md).
Summary:

| Method & Path | Purpose | Request | Response |
|---|---|---|---|
| `POST /api/tokenize` | Tokenize typed text or an uploaded file with the selected mode/encoding/sub-mode | `multipart/form-data`: `tokenizer_mode`, `custom_sub_mode?`, `encoding?`, `text?`, `file?` (exactly one of `text`/`file`) | `TokenizeResponse` (200) or error (4xx) |
| `GET /api/vocabulary` | Read the current Simple sub-mode Custom Tokenizer vocabulary | — | `VocabularyEntry[]` (200) |
| `POST /api/vocabulary/reset` | Reset the Simple sub-mode Custom Tokenizer vocabulary to empty | — | `VocabularyResetResponse` (200) |
| `POST /api/bpe/train` | Train the BPE sub-mode on user-provided text, replacing any prior model | JSON: `{ training_text, vocab_size }` | `BpeStateResponse` (200) or error (4xx/409) |
| `GET /api/bpe/vocabulary` | Read the current trained BPE vocabulary, merge rules, and training status | — | `BpeStateResponse` (200) |

Only two new endpoints are introduced, both required directly by FR-037–FR-061 (constitution
Principle VI — no unnecessary infrastructure such as health/metrics endpoints the spec does not
require); BPE tokenization itself reuses `POST /api/tokenize` rather than adding a third.

## Frontend Design

### State & Component Structure

A single `useReducer`-based state machine (`state/tokenizerReducer.ts`) is sufficient — no external
state library is introduced (constitution Principle VI):

```text
status: 'idle' | 'loading' | 'success' | 'error'
inputMode: 'text' | 'file'
tokenizerMode: 'tiktoken' | 'custom'
customSubMode: 'simple' | 'bpe'
encoding: 'cl100k_base'
text, file, result (TokenizeResponse | null), error (string | null), vocabulary (VocabularyEntry[])
```

A second, independent `useReducer` state machine (`state/bpeReducer.ts`) covers the BPE training and
BPE-tokenize flows, kept separate from the state above so the two flows' loading/empty/error/success
states never collide (FR-059, FR-060):

```text
trainStatus: 'idle' | 'training' | 'trained' | 'error'
trainingText, targetVocabSize, trainError (string | null)
model: BpeStateResponse | null   // vocabulary, merge_rules, achieved/target size, trained flag
tokenizeStatus: 'idle' | 'loading' | 'success' | 'error'
bpeText, bpeResult (TokenizeResponse | null), bpeError (string | null)
```

`useTokenizer.ts` wraps dispatch + `tokenizerClient` calls so components stay presentational:
submitting text/file → `TOKENIZE_START` → `postTokenize()` → `TOKENIZE_SUCCESS`/`TOKENIZE_ERROR`; a
successful Simple-sub-mode result also triggers a `getVocabulary()` refresh (FR-025).
`useBpeTokenizer.ts` mirrors this for the BPE flows: `startTraining()` → `TRAIN_START` →
`trainBpe()` → `TRAIN_SUCCESS`/`TRAIN_ERROR`, and, independently, `tokenizeWithBpe()` →
`BPE_TOKENIZE_START` → `postTokenize({..., customSubMode: 'bpe'})` →
`BPE_TOKENIZE_SUCCESS`/`BPE_TOKENIZE_ERROR`; it also loads `getBpeState()` once on mount so a page
refresh can restore whether a model is already trained (backing FR-053's empty state).

Component tree: `AppLayout` → `AppHeader` (title + description) + input column (`InputModeToggle`,
`TextInputPanel`/`FileUploadPanel`, `TokenizerModeSelect`, `CustomSubModeToggle` (shown only when
`tokenizerMode === 'custom'`), `EncodingSelect`, `TokenizeButton`) + a status-driven region rendering
exactly one of `LoadingState` / `EmptyState` / `ErrorBanner` / results, where results =
`ExtractedTextPanel` (file sources only) + `StatisticsPanel` + `TokenVisualizer`, and, in Custom
Tokenizer mode: Simple sub-mode renders `VocabularyTable` + `VocabularyResetButton`; BPE sub-mode
renders two clearly separated regions instead — a training region (`BpeTrainingPanel` +, once
trained, `BpeVocabularyTable` + `BpeMergeRulesTable`) and, below it, a tokenization region
(`BpeTokenizePanel`, disabled with an explanatory empty state until a model is trained, then reusing
`StatisticsPanel` + `TokenVisualizer` for its result) — satisfying FR-059's flow separation.

### Frontend/Backend Communication

`api/tokenizerClient.ts` is the only module that calls `fetch` for tokenize/vocabulary: `postTokenize
(FormData)` (now also accepting `customSubMode`), `getVocabulary()`, `resetVocabulary()`.
`api/bpeClient.ts` adds `trainBpe({trainingText, vocabSize})` (JSON body) and `getBpeState()`. Both
modules parse JSON responses and, on a non-2xx response, read the `{error_code, message}` body and
throw an error carrying `message` for direct display (FR-032) — no other component talks to the
network directly.

### Token & Vocabulary Visualization

- `TokenVisualizer` renders each token as a small chip: `index`, `id`, and `text`. In Custom
  Tokenizer Simple sub-mode, chips where `is_new === true` get a distinct neon accent (brighter
  border/glow) versus a muted style for reused tokens (FR-024). In BPE sub-mode, chips where
  `is_unknown === true` instead get a dedicated "unknown symbol" label and accent, distinct from both
  the new-token and reused-token styling (FR-058).
- `VocabularyTable` lists every Simple-sub-mode entry (`id`, `token`, `frequency`, `status`) and
  applies the same accent used for "new" chips to rows whose `status === "new"`.
- `BpeVocabularyTable` lists every learned BPE symbol (`id`, `symbol`); `BpeMergeRulesTable` lists the
  ordered merge rules (`order`, `left`, `right`, `merged`), doubling as the per-step training-detail
  view required by FR-051, and shows `achieved_vocab_size` vs. `target_vocab_size` with a clear
  "target not fully reached" note when they differ (FR-047, US4 Scenario 5).

### Visual Design System (Neon-Gradient / Cyberpunk Dark Theme)

Defined as CSS custom properties in `styles/theme.css` so every component consumes the same tokens:

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0a0118` → `#0d021f` gradient | App background |
| `--surface` | `#150a2e` | Cards/panels |
| `--accent-primary` | `#b026ff` → `#ff2ee6` gradient | Primary buttons, active states, focus rings |
| `--accent-secondary` | `#00f0ff` | Secondary highlights, links |
| `--accent-new` | `#39ff14` | "New token" chip/row accent |
| `--accent-error` | `#ff2965` | Error banner, invalid states |
| `--text-primary` | `#eaf2ff` | Body text on `--surface`/`--bg-base` |
| `--text-muted` | `#9aa0c3` | Secondary/help text |

**Accessibility is not sacrificed for aesthetics** (FR-034 still applies on top of the cyberpunk
look): all foreground/background pairs above are chosen to meet WCAG AA contrast (≥4.5:1 for body
text); "new vs. existing" status is conveyed by a text label *and* the accent color, never color
alone; focus outlines use `--accent-secondary` at full opacity (glow effects are decorative
`box-shadow` additions, not a replacement for a visible focus ring). Layout uses CSS Grid/Flexbox
with a single-column stacked layout below ~640px and a two-column (input | results) layout above it.

## Testing Strategy

**Backend (pytest)** — one test module per service, plus integration tests per route:

- `test_tiktoken_service.py`: known strings → expected `cl100k_base` IDs/token text (real library
  output, not mocked); confirms the shared encoding object is never mutated across calls.
- `test_custom_tokenizer_service.py`: regex splitting determinism (same input → same tokens across
  repeated calls); reuse of existing IDs; new-entry creation and `is_new` flagging; frequency
  increments on repeats.
- `test_vocabulary_store.py`: deterministic ID sequence; `reset()` clears state and restarts the
  counter; concurrent-call safety (spawn multiple threads calling the store, assert no duplicate IDs).
- `test_file_service.py`: valid TXT; valid text-based PDF; corrupted PDF → `CorruptedPdfError`;
  textless/scanned PDF fixture → `NoExtractableTextError`; oversized/unsupported-type upload rejected.
- `test_stats_service.py`: normal input; empty-word-count and empty-character-count guards (no
  division by zero).
- `test_bpe_service.py`: word-splitting and base-vocabulary derivation; deterministic base-ID
  assignment (sorted codepoint order); merge-selection determinism including a constructed tie
  (two pairs with equal frequency resolve to the same pair every run); early stop when no pair
  recurs; repeating training with identical inputs produces an identical vocabulary and merge-rule
  list (FR-045–FR-052); tokenizing with a trained model never mutates the model's vocabulary/merge
  rules (FR-056); a character absent from the trained base vocabulary yields `id: null, is_unknown:
  true` (FR-058).
- `test_bpe_store.py`: `train()` replaces any prior model atomically; `in_progress` flag rejects a
  concurrent `train()` call; `snapshot()` returns the untrained shape before any successful training.
- `test_tokenize_endpoint.py` / `test_vocabulary_endpoint.py` / `test_bpe_endpoint.py`: full request/
  response cycles for every acceptance scenario in spec.md (both tokenizer modes, both Custom
  Tokenizer sub-modes, both input sources, every validation error including the new BPE ones,
  vocabulary read/reset, BPE train/state), asserting on HTTP status and response schema.

**Frontend (Vitest + React Testing Library)**:

- `useTokenizer` hook: idle → loading → success/error transitions; vocabulary refresh triggered only
  after a successful Simple-sub-mode Custom Tokenizer request.
- `useBpeTokenizer` hook: idle → training → trained/error transitions for the training flow;
  independent idle → loading → success/error transitions for the BPE-tokenize flow; confirms the two
  flows' states never cross-update each other.
- `TokenizeButton`/input components: disabled/validation behavior on empty input, including the BPE
  training text and target-vocab-size fields, and the BPE tokenize control disabled until a model is
  trained.
- `TokenVisualizer` / `VocabularyTable`: correct rendering of the "new" accent and status text.
- `BpeVocabularyTable` / `BpeMergeRulesTable`: correct rendering of learned symbols, ordered merge
  rules, and the achieved-vs-target vocabulary size note.
- `ErrorBanner`: renders the message from a failed request, including BPE-specific error messages.

No end-to-end browser test suite is introduced (constitution Principle VI); `quickstart.md` provides
the full-stack manual acceptance pass across all three user stories.

## Security & Configuration

- **CORS**: `CORSMiddleware` restricted to configured frontend origin(s) (`core/config.py`,
  `ALLOWED_ORIGINS` env var, safe localhost default for development).
- **Upload safety**: size/type validated before parsing; PyMuPDF calls wrapped so any parser-level
  failure becomes a controlled 4xx response, never an unhandled exception or 500.
- **No authentication/authorization** — explicitly out of scope (spec FR-036); no user data or
  secrets are ever persisted (FR-035), so there is no data-at-rest exposure to protect.
- **Configuration** centralized in a small `pydantic-settings` `Settings` class (max upload size,
  allowed origins, host/port), avoiding a heavier configuration framework.
- **Concurrency safety**: `VocabularyStore` and `BpeModelStore` (see Backend Service Design) each hold
  their own `threading.Lock`; these are the only two pieces of shared mutable state in the system and
  the only places synchronization is needed. `BpeModelStore`'s lock additionally guards the
  `in_progress` flag used to reject a concurrent training request (FR-044).
- **Resource bounds**: BPE training text is capped at 100,000 characters and target vocabulary size
  at 5,000 (spec Assumptions), both rejected before the training loop starts, so a single request
  cannot run unbounded CPU work on the shared backend process.

## Implementation Sequence & Dependencies

1. **Backend foundations** — FastAPI skeleton, config, error hierarchy/handlers, CORS. *(no
   dependencies)*
2. **Pydantic schemas** — `schemas/tokenize.py`, `schemas/vocabulary.py`. *(depends on 1)*
3. **Stats service** — pure functions + unit tests. *(depends on 2)*
4. **Tiktoken service** + unit tests. *(depends on 2)*
5. **Vocabulary store** + unit tests. *(depends on 2)*
6. **Custom tokenizer service** + unit tests. *(depends on 5)*
7. **File service** (TXT + PDF) + unit tests. *(depends on 2, parallel with 4–6)*
8. **BPE service + BPE model store** + unit tests. *(depends on 2, parallel with 4–7)*
9. **`POST /api/tokenize` route** wiring services 3, 4/6/8, 7 (adds `custom_sub_mode` dispatch to
   `BpeService` when set). *(depends on 3, 4, 6, 7, 8)*
10. **`GET/POST /api/vocabulary` routes**. *(depends on 5)*
11. **`POST /api/bpe/train`, `GET /api/bpe/vocabulary` routes**. *(depends on 8)*
12. **Backend integration tests** across all routes. *(depends on 9, 10, 11)*
13. **Frontend foundations** — Vite/React/TS scaffold, theme tokens, layout shell. *(parallel with
    2–12, once contracts below are fixed)*
14. **API clients + TS types** mirroring the contracts (`tokenizerClient`, `bpeClient`). *(depends on
    contracts, 13)*
15. **Input/control components + reducers/hooks** (including `CustomSubModeToggle`,
    `tokenizerReducer`/`useTokenizer`, `bpeReducer`/`useBpeTokenizer`). *(depends on 13, 14)*
16. **Results components** (statistics, token visualizer, extracted text). *(depends on 9, 14, 15)*
17. **Vocabulary UI** (table + reset), wired to 10. *(depends on 10, 14, 15)*
18. **BPE UI** (`BpeTrainingPanel`, `BpeVocabularyTable`, `BpeMergeRulesTable`, `BpeTokenizePanel`),
    wired to 11 and reusing 16's result components for BPE-tokenize output. *(depends on 11, 14, 15, 16)*
19. **Loading/empty/error state wiring + responsive/accessibility pass** (both the Tiktoken/Simple
    flow and the two BPE flows). *(depends on 15–18)*
20. **Frontend component/hook tests**. *(depends on 15–19)*
21. **Full quickstart.md walkthrough** (all 5 user stories, manual acceptance). *(depends on 12, 20)*

Steps 4–8 (backend tokenizer/file/BPE services) can proceed in parallel with each other; step 13
(frontend scaffold) can start as soon as the contracts in `contracts/` are fixed, in parallel with
backend steps 3–12.

## Constitution Check (post-design re-check)

Re-evaluated after Phase 1 design: the `TokenizerService` protocol, thin routes, single in-memory
`VocabularyStore`, and absence of any new frameworks/state libraries/database confirm all seven
principles still PASS with no new violations introduced by the design above.

Re-evaluated again after the BPE enhancement: `BpeService`/`BpeModelStore` follow the exact same
patterns already validated above (protocol-shaped service, thin routes, single in-memory store with
a lock, no new frameworks or dependencies), and BPE logic is 100% backend — the frontend only adds
UI/state for calling the two new endpoints and rendering their responses. All seven principles still
PASS with no new violations.

## Complexity Tracking

> No violations — this table is not applicable. The design introduces no additional projects,
> services, or infrastructure beyond the two mandated by the constitution (`frontend/`, `backend/`).
> The BPE enhancement adds one backend service pair and one route module inside the existing
> `backend/` project, and component/hook additions inside the existing `frontend/` project — no new
> project, database, or third-party dependency.
