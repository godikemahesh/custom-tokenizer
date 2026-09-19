# Phase 0 Research: Tokenizer Application

All Technical Context fields in [plan.md](./plan.md) were resolvable directly from the approved
spec (spec.md, including its Clarifications session) and the constraints given in the plan request —
no `NEEDS CLARIFICATION` markers remain. This document instead records the design decisions made
while translating those fixed constraints into a concrete architecture, so the rationale is not lost
before implementation.

Items 10–15 were added for the 2026-09-18 BPE enhancement (spec User Stories 4–5, FR-037–FR-061); all
Technical Context additions for that enhancement were likewise resolvable directly from the updated
spec, so no `NEEDS CLARIFICATION` markers were introduced.

## 1. Custom Tokenizer splitting & deterministic ID assignment

- **Decision**: Use `re.compile(r"\w+|[^\w\s]")` with `finditer` to scan text left-to-right; each
  match is either a run of word characters or a single punctuation character. Assign new vocabulary
  IDs from a monotonic counter starting at 0, incremented in the order tokens are first encountered.
- **Rationale**: Matches the spec's clarified rule exactly ("whitespace + punctuation splitting —
  words become tokens, punctuation marks become their own tokens") with a single, easy-to-audit
  regex, and satisfies "use regex for custom tokenizer." A monotonic counter is the simplest way to
  guarantee determinism (same first-seen order → same ID) without any external ID source.
- **Alternatives considered**: Character-level splitting and fixed-length chunking were both offered
  during clarification and rejected in favor of the whitespace/punctuation rule, since it best
  illustrates "how text becomes tokens" without being too fine-grained (character-level) or arbitrary
  (fixed-length chunking).

## 2. Concurrency safety for the shared in-memory vocabulary

- **Decision**: Guard all vocabulary reads/writes (lookup-or-create, frequency increment, reset)
  inside a single `threading.Lock` owned by the `VocabularyStore` singleton.
- **Rationale**: FastAPI/Starlette runs synchronous route handlers in a thread pool, so two
  tokenize requests can execute concurrently. Without a lock, two threads could both see a token as
  "new" and assign it the same `next_id`, violating determinism and uniqueness. A single coarse lock
  is sufficient because vocabulary operations are fast, in-memory, and not a throughput bottleneck for
  this tool's scale.
- **Alternatives considered**: An `asyncio.Lock` was rejected because the store is accessed from sync
  service code, not native coroutines; a lock-free structure (e.g., `dict` assumed atomic under the
  GIL) was rejected because compound operations (check-then-create) are not atomic even under the GIL.

## 3. Tiktoken per-token decoding

- **Decision**: Encode with `encoding.encode(text)` for IDs, then decode each ID individually via
  `encoding.decode_single_token_bytes(id)` (UTF-8, `errors="replace"`) to get a display string per
  token.
- **Rationale**: `tiktoken` operates on byte-pair token IDs; decoding one ID at a time is the
  standard way to get a human-readable string per token position for visualization, and never touches
  or rebuilds the library's internal vocabulary (FR-015).
- **Alternatives considered**: Decoding the whole sequence at once and diffing substrings was
  rejected — it is more complex and can misattribute characters when tokens split multi-byte UTF-8
  sequences.

## 4. PDF validation & "no extractable text" detection

- **Decision**: Open uploads with `fitz.open(stream=raw_bytes, filetype="pdf")` inside a
  `try/except` that maps any PyMuPDF exception to `CorruptedPdfError`; concatenate `page.get_text()`
  across all pages; treat an empty/whitespace-only result as `NoExtractableTextError`.
- **Rationale**: PyMuPDF is the constitution/plan-mandated PDF library; catching its exceptions at
  the boundary keeps corrupted-file handling in one place, and checking the extracted text (rather
  than trying to detect "is this scanned") is the simplest reliable proxy for "no extractable text",
  which is exactly the spec's stated scope boundary (OCR is out of scope).
- **Alternatives considered**: Inspecting PDF metadata/page image ratios to detect scanned documents
  was rejected as unnecessary complexity — the spec only requires detecting the *absence* of
  extractable text, not classifying *why* it's absent.

## 5. Upload size/type enforcement

- **Decision**: Reject before parsing based on declared content-type/extension and declared size,
  and additionally cap actual bytes read during upload streaming at 5MB regardless of headers.
- **Rationale**: Declared headers can be missing or wrong; capping actual bytes read is a cheap,
  reliable backstop that prevents a mislabeled or malicious upload from being fully parsed before
  rejection.
- **Alternatives considered**: Relying solely on `Content-Length` was rejected as insufficient on its
  own for a hard guarantee.

## 6. Frontend state management

- **Decision**: A single `useReducer` state machine (`idle/loading/success/error` plus form fields),
  no external state library.
- **Rationale**: The entire UI is one screen with a handful of interdependent fields; constitution
  Principle VI explicitly calls for avoiding unnecessary dependencies, and `useReducer` already gives
  predictable, testable state transitions.
- **Alternatives considered**: Redux/Zustand/Jotai were rejected as unjustified overhead for this
  scope.

## 7. Frontend testing framework

- **Decision**: Vitest + React Testing Library.
- **Rationale**: Vitest integrates natively with a Vite-built React/TS project (no separate
  transform/config layer like Jest+Babel would need), and React Testing Library is the standard for
  behavior-focused component tests, satisfying the constitution's "frontend behavior MUST have
  appropriate automated tests" without adding a heavier E2E framework.
- **Alternatives considered**: Jest was rejected only because it requires extra configuration to work
  smoothly with Vite; Playwright/Cypress E2E were rejected as unnecessary for this scope beyond the
  manual `quickstart.md` walkthrough.

## 8. Balancing the neon-gradient/cyberpunk theme with accessibility

- **Decision**: Define theme colors as CSS custom properties chosen to meet WCAG AA contrast for all
  text/background pairs, and always pair color-coded meaning (e.g., "new token") with a text label,
  reserving glow/gradient effects for decoration (borders, shadows) rather than the sole carrier of
  information.
- **Rationale**: Spec FR-034 mandates an accessible, responsive interface; the plan request separately
  mandates a neon-gradient/cyberpunk look. These are compatible as long as contrast and non-color
  signaling are treated as hard constraints the visual theme must satisfy, not optional polish.
- **Alternatives considered**: A pure "glow-heavy" dark theme with low-contrast muted text was
  rejected for failing accessibility.

## 9. API transport shape for combined text/file input

- **Decision**: A single `POST /api/tokenize` endpoint accepting `multipart/form-data` with optional
  `text` and `file` fields (exactly one required), plus `tokenizer_mode` and optional `encoding`.
- **Rationale**: One endpoint keeps the frontend's request logic and the backend's route count
  minimal (constitution Principle VI), and multipart form data is the standard way to mix a file
  upload with other scalar fields in one request.
- **Alternatives considered**: Separate `/tokenize/text` and `/tokenize/file` endpoints were rejected
  as unnecessary duplication — both paths converge on the same tokenizer/stats services immediately
  after input resolution.

## 10. BPE algorithm shape (word-level, character-based)

- **Decision**: Split training text into whitespace-delimited words; represent each distinct word as
  a tuple of single-character symbols with a frequency count; count adjacent-pair frequency across all
  words (weighted by word frequency); repeatedly merge the single most frequent pair into all words
  containing it, recording an ordered merge rule each time, until the target vocabulary size is
  reached or no pair recurs.
- **Rationale**: Matches the spec's description almost verbatim ("learn frequent adjacent pairs,
  merge them repeatedly, create a vocabulary and ordered merge rules") and mirrors the well-known
  Sennrich et al. word-level BPE formulation, which keeps merges within word boundaries so whitespace
  itself never becomes part of the vocabulary — consistent with FR-014's existing convention that
  whitespace is a separator, not a token.
- **Alternatives considered**: Byte-level BPE (à la GPT-2/tiktoken) was rejected because it produces
  vocabulary/merge entries that are raw byte sequences, often not printable text — this would conflict
  with FR-049–FR-051's requirement to *display* the vocabulary and merge steps in a human-readable way,
  and would duplicate what Tiktoken mode already demonstrates. Merging across word boundaries
  (whole-text as one sequence) was rejected because it would make "space" a mergeable symbol, breaking
  the established whitespace-as-separator convention and making merge rules harder to read.

## 11. Deterministic ID assignment and tie-breaking for BPE

- **Decision**: Assign base-vocabulary IDs in sorted (codepoint) order over the distinct characters
  found in the training text, starting at `0`. Each merge-created symbol then receives the next
  sequential ID, in the order merges are performed. When two or more pairs tie for the highest
  frequency at a given step, select the lexicographically smallest pair, comparing `(left, right)` as
  a tuple of strings.
- **Rationale**: Directly satisfies FR-052 ("BPE vocabulary IDs MUST be assigned deterministically")
  and FR-046 (deterministic tie-breaking). Sorting the base alphabet removes any dependency on Python
  `set`/`dict` iteration order (which is insertion-order-dependent but easy to get wrong across code
  paths); a fixed lexicographic tie-break for merges is simple to state, simple to test with a
  constructed tie, and requires no additional configuration.
- **Alternatives considered**: Assigning IDs by first-encounter order while scanning the raw text
  (mirroring the Simple sub-mode's approach) was considered, but rejected for the *base* vocabulary
  specifically because "first encounter" depends on where in the (possibly reordered-by-frequency)
  word list the scan starts, which is a less obviously deterministic rule to a reader than "sorted
  order"; first-encounter-by-merge-order is kept for merge-created symbols since merges are already a
  strictly ordered sequence.

## 12. Single in-memory BPE model with training-in-progress guard

- **Decision**: `BpeModelStore` holds at most one trained model at a time (vocabulary, merge rules,
  achieved/target size), replaced atomically on each successful training run, guarded by the same
  `threading.Lock` pattern as `VocabularyStore`, plus an `in_progress` boolean that causes a second
  concurrent `train()` call to fail immediately with a dedicated error rather than queuing or racing.
- **Rationale**: Directly satisfies FR-044 (no concurrent training) and FR-048 (new training replaces
  the old model); a single lock is sufficient because, like `VocabularyStore`, all operations are
  in-process and not a throughput bottleneck for this tool's scale (research item 2's reasoning
  applies identically here).
- **Alternatives considered**: A background job queue with polling/status endpoints was rejected as
  unnecessary infrastructure (constitution Principle VI) given the 5-second training-time target
  (spec SC-013) — training runs synchronously within the HTTP request/response cycle, and the
  frontend's existing loading-state pattern already covers the wait.

## 13. Unseen-character fallback during BPE tokenization

- **Decision**: A character in new text that never appeared in the trained base vocabulary cannot
  match any merge rule (rules are keyed on specific learned symbol strings), so it is naturally
  emitted as its own unmerged, single-character token. Its `TokenItem` carries `id: null` and
  `is_unknown: true`, rather than a magic sentinel integer ID or a failed request.
- **Rationale**: Satisfies FR-058 (clearly labeled fallback, no failure, no fabricated vocabulary
  entry) and US5 Scenario 4. Using `null` for "no vocabulary entry exists" is more explicit than
  reserving a specific integer (e.g. `-1`), which could be mistaken for a real ID by a careless
  consumer of the API.
- **Alternatives considered**: Rejecting the tokenize request outright when an unseen character is
  present was rejected as directly contradicting FR-058 ("rather than failing the request"); silently
  adding the character as a new vocabulary entry was rejected as directly contradicting FR-056 ("MUST
  NOT ... modify any merge rule or vocabulary entry as a result of tokenizing").

## 14. Extending `POST /api/tokenize` instead of adding a BPE-tokenize endpoint

- **Decision**: Add a `custom_sub_mode: "simple" | "bpe"` field to the existing `POST /api/tokenize`
  request (defaulting to `"simple"` for backward compatibility with the original Custom Tokenizer
  behavior), rather than introducing a separate `POST /api/bpe/tokenize` endpoint.
- **Rationale**: Reuses the exact same validation pipeline, response schema, and result-table
  rendering already built for Tiktoken/Simple modes (directly satisfying FR-057, "same tokenization
  result table"), and keeps the endpoint count minimal (constitution Principle VI), consistent with
  research item 9's earlier decision to avoid duplicating tokenize endpoints per input source.
- **Alternatives considered**: A dedicated `POST /api/bpe/tokenize` endpoint was considered for
  symmetry with `POST /api/bpe/train`, but rejected because it would need to duplicate the same
  text/file input validation already implemented for `POST /api/tokenize`, purely to reach a
  different service branch — an unnecessary duplication the constitution advises against.

## 15. BPE training-text and vocabulary-size upper bounds

- **Decision**: Reject BPE training requests where `training_text` exceeds 100,000 characters or
  `vocab_size` exceeds 5,000, with dedicated validation errors, checked before the training loop runs.
- **Rationale**: Keeps a single training request bounded in CPU time on the shared backend process
  (no per-user isolation or queueing exists to absorb an outsized request) and keeps the 5-second
  typical-case target (spec SC-013) achievable; both figures are documented as reasonable defaults in
  the spec's Assumptions section, not values with special product significance.
- **Alternatives considered**: No upper bound was rejected as an availability risk (a single very
  large paste could block a worker thread for an unbounded time); a dynamic bound based on server load
  was rejected as unnecessary complexity for a single-instance demonstration tool.

## 16. Configuration management

- **Decision**: A small `pydantic-settings` `Settings` class for the handful of runtime values (max
  upload size, allowed CORS origins, host/port).
- **Rationale**: Consistent with the rest of the stack (Pydantic is already a mandated dependency),
  avoids introducing a separate config library, and gives typed/validated environment variable
  loading with minimal code.
- **Alternatives considered**: Plain `os.environ` access was rejected as slightly less safe (no
  validation/defaults in one place); a dedicated config framework (e.g., Dynaconf) was rejected as
  unnecessary for ~3 settings.
