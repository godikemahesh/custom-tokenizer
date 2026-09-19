---

description: "Task list template for feature implementation"
---

# Tasks: Tokenizer Application

**Input**: Design documents from `/specs/001-tokenizer-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Included. The constitution mandates `pytest` for all backend tests and "appropriate automated tests" for frontend behavior (Principle VII) — these are not optional for this project.

**Organization**: Tasks are grouped by user story (from spec.md: US1 P1, US2 P2, US3 P3, US4 P2, US5 P2) to enable independent implementation and testing of each story.

**Update (2026-09-18)**: Phases 1–5 below (T001–T051) implement the original three user stories and
are already complete. This update adds Phase 6 (US4, T056–T074) and Phase 7 (US5, T075–T084) for the
Byte Pair Encoding (BPE) enhancement to the Custom Tokenizer (spec FR-037–FR-061), and renumbers the
trailing Polish phase from Phase 6 to Phase 8, adding cross-cutting tasks for the new stories (T085–T087).
US4/US5 are appended after the already-completed US3 (P3) rather than reordered ahead of it by
priority, since Phases 1–5 represent real, already-built work that this update does not disturb.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Every task includes its exact file path

## Path Conventions

Web application layout per plan.md: `backend/app/...`, `backend/tests/...` (backend); `frontend/src/...`, `frontend/tests/...` (frontend).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create backend directory skeleton (`app/api/routes/`, `app/schemas/`, `app/services/`, `app/core/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`) under `backend/` per plan.md Project Structure
- [X] T002 [P] Initialize backend Python project with dependencies `fastapi`, `uvicorn`, `tiktoken`, `pymupdf`, `pydantic`, `pydantic-settings`, `pytest`, `httpx` in `backend/pyproject.toml`
- [X] T003 Scaffold frontend with Vite's React + TypeScript template in `frontend/`, with TypeScript `strict` mode enabled in `frontend/tsconfig.json`
- [X] T004 [P] Add frontend dependencies `vitest`, `@testing-library/react`, `@testing-library/jest-dom` to `frontend/package.json`
- [X] T005 [P] Create backend test fixtures (`sample.txt`, `sample_valid.pdf`, `sample_corrupted.pdf`, `sample_textless.pdf`, `sample_oversized.txt`) in `backend/tests/fixtures/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement `Settings` (max upload size, allowed CORS origins, host/port) via `pydantic-settings` in `backend/app/core/config.py`
- [X] T007 Implement exception hierarchy (`TokenizerAppError`, `EmptyInputError`, `UnsupportedFileTypeError`, `FileTooLargeError`, `CorruptedPdfError`, `NoExtractableTextError`, `UnsupportedEncodingError`) and FastAPI exception handlers producing `{error_code, message}` JSON in `backend/app/core/errors.py`
- [X] T008 Create the FastAPI app instance with CORS middleware and router mounting in `backend/app/main.py`
- [X] T009 [P] Define `TokenItem` and `TokenizeResponse` Pydantic schemas (per data-model.md) in `backend/app/schemas/tokenize.py`
- [X] T010 [P] Define `CustomVocabularyEntry` and `VocabularyResetResponse` Pydantic schemas (per data-model.md) in `backend/app/schemas/vocabulary.py`
- [X] T011 [P] Define the `TokenizerService` protocol and shared `TokenItem`/`TokenizationOutcome` dataclasses in `backend/app/services/tokenizer_base.py`
- [X] T012 [P] Implement statistics functions (`character_count`, `word_count`, `token_count`, `tokens_per_word`, `tokens_per_character`, with zero-division guards) in `backend/app/services/stats_service.py`
- [X] T013 [P] Create app entry points `frontend/src/main.tsx` and `frontend/src/App.tsx` (empty shell)
- [X] T014 [P] Define neon-gradient/cyberpunk theme CSS custom properties (WCAG AA-compliant, per plan.md's design token table) in `frontend/src/styles/theme.css` and base resets in `frontend/src/styles/global.css`
- [X] T015 [P] Define TypeScript types mirroring backend schemas (`TokenItem`, `TokenizeResponse`, `CustomVocabularyEntry`, `VocabularyResetResponse`, `ValidationError`) in `frontend/src/types/tokenizer.ts`
- [X] T016 [P] Implement the API client (`postTokenize`, `getVocabulary`, `resetVocabulary`, with `{error_code, message}` error parsing) in `frontend/src/api/tokenizerClient.ts`
- [X] T017 Implement `AppLayout` and `AppHeader` (application title + description) in `frontend/src/components/layout/AppLayout.tsx` and `frontend/src/components/layout/AppHeader.tsx`
- [X] T018 [P] Implement `LoadingState`, `EmptyState`, and `ErrorBanner` components in `frontend/src/components/feedback/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Tokenize Typed Text (Priority: P1) 🎯 MVP

**Goal**: A user types text, selects a tokenizer mode (Tiktoken or Custom), tokenizes it, and sees the per-token breakdown and statistics.

**Independent Test**: Type a short sentence, select a tokenizer mode, click Tokenize, and verify the token list (index/id/text) and statistics (character/word/token counts, ratios) are displayed; verify empty input is rejected with a clear error.

### Tests for User Story 1

- [X] T019 [P] [US1] Unit tests for `TiktokenService` (known strings → expected `cl100k_base` IDs/text; encoding object never mutated) in `backend/tests/unit/test_tiktoken_service.py`
- [X] T020 [P] [US1] Unit tests for `CustomTokenizerService` (regex splitting determinism, ID reuse vs. new-entry creation, `is_new` flagging) in `backend/tests/unit/test_custom_tokenizer_service.py`
- [X] T021 [P] [US1] Unit tests for `VocabularyStore` (deterministic ID sequence, frequency increments, reset restarts counter, concurrent-call safety) in `backend/tests/unit/test_vocabulary_store.py`
- [X] T022 [P] [US1] Unit tests for `stats_service` (normal input; zero-word and zero-character guards) in `backend/tests/unit/test_stats_service.py`
- [X] T023 [US1] Integration tests for `POST /api/tokenize` text-input happy paths (both modes) plus `EMPTY_INPUT` and `UNSUPPORTED_ENCODING` error cases in `backend/tests/integration/test_tokenize_endpoint.py`

### Implementation for User Story 1

- [X] T024 [P] [US1] Implement `TiktokenService` (loads `cl100k_base` once, encodes, decodes per-token text) in `backend/app/services/tiktoken_service.py`
- [X] T025 [P] [US1] Implement `VocabularyStore` (`entries` dict, `next_id` counter, `threading.Lock`, `tokenize_and_update`, `snapshot`, `reset`) in `backend/app/services/vocabulary_store.py`
- [X] T026 [US1] Implement `CustomTokenizerService` (regex `\w+|[^\w\s]` splitting + `VocabularyStore` integration + `is_new` flagging) in `backend/app/services/custom_tokenizer_service.py` (depends on T025, T011)
- [X] T027 [US1] Implement `POST /api/tokenize` route for the `text` input path (validate, select tokenizer by mode, compute stats, assemble `TokenizeResponse`) in `backend/app/api/routes/tokenize.py` (depends on T009, T012, T024, T026, T007)
- [X] T028 [P] [US1] Implement `InputModeToggle` and `TextInputPanel` components in `frontend/src/components/input/`
- [X] T029 [P] [US1] Implement `TokenizerModeSelect`, `EncodingSelect` (fixed `cl100k_base` option), and `TokenizeButton` in `frontend/src/components/controls/`
- [X] T030 [US1] Implement the `tokenizerReducer` state machine (`idle`/`loading`/`success`/`error` + form fields) in `frontend/src/state/tokenizerReducer.ts`
- [X] T031 [US1] Implement the `useTokenizer` hook wiring the reducer to `tokenizerClient.postTokenize` in `frontend/src/hooks/useTokenizer.ts` (depends on T030, T016)
- [X] T032 [P] [US1] Implement `StatisticsPanel` in `frontend/src/components/results/StatisticsPanel.tsx`
- [X] T033 [P] [US1] Implement `TokenVisualizer` (index/id/text chips with `is_new` accent styling) in `frontend/src/components/results/TokenVisualizer.tsx`
- [X] T034 [US1] Wire `App.tsx` to compose layout, input/control, feedback, and result components via `useTokenizer` for the typed-text flow in `frontend/src/App.tsx` (depends on T031, T032, T033, T017, T018, T028, T029)
- [X] T035 [P] [US1] Component/hook tests: `useTokenizer` state transitions, `TokenizeButton` empty-input handling, `TokenVisualizer` `is_new` rendering in `frontend/tests/`

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - Tokenize an Uploaded Document (Priority: P2)

**Goal**: A user uploads a TXT or text-based PDF file, the app extracts its text, and the user tokenizes it the same way as typed text.

**Independent Test**: Upload a valid TXT file and a valid text-based PDF file, confirm the extracted text is shown, then tokenize and verify results; verify each invalid-file case produces the correct error.

### Tests for User Story 2

- [X] T036 [P] [US2] Unit tests for `file_service` (TXT decode; valid PDF extraction; corrupted PDF → `CorruptedPdfError`; textless PDF → `NoExtractableTextError`; oversized/unsupported-type rejection) in `backend/tests/unit/test_file_service.py`
- [X] T037 [US2] Integration tests for `POST /api/tokenize` file-upload paths plus `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `CORRUPTED_PDF`, and `NO_EXTRACTABLE_TEXT` cases in `backend/tests/integration/test_tokenize_endpoint.py`

### Implementation for User Story 2

- [X] T038 [P] [US2] Implement `file_service.validate_upload` and `extract_txt` in `backend/app/services/file_service.py`
- [X] T039 [US2] Implement `file_service.extract_pdf` using PyMuPDF with corrupted/no-extractable-text detection in `backend/app/services/file_service.py` (depends on T038)
- [X] T040 [US2] Extend the `POST /api/tokenize` route to accept file uploads, invoke `file_service`, and populate `extracted_text`/`source_type` in `backend/app/api/routes/tokenize.py` (depends on T027, T039)
- [X] T041 [P] [US2] Implement `FileUploadPanel` in `frontend/src/components/input/FileUploadPanel.tsx`
- [X] T042 [US2] Wire file-upload mode into `useTokenizer`'s submission logic and `App.tsx`'s input column in `frontend/src/hooks/useTokenizer.ts` and `frontend/src/App.tsx` (depends on T034, T041) — `useTokenizer.submit` already built the request generically from `state.file`/`state.text`, so only `App.tsx` needed wiring
- [X] T043 [P] [US2] Implement `ExtractedTextPanel` (shown for file-sourced results only) in `frontend/src/components/results/ExtractedTextPanel.tsx`
- [X] T044 [P] [US2] Component tests for `FileUploadPanel` and `ExtractedTextPanel` (valid upload and error feedback rendering) in `frontend/tests/`

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Explore and Manage the Custom Tokenizer Vocabulary (Priority: P3)

**Goal**: A user viewing Custom Tokenizer results can see the full vocabulary (ID, token, frequency, status), watch it grow across operations, and reset it.

**Independent Test**: Tokenize text twice with the Custom Tokenizer (observe reused IDs, growing frequency, and correct new-vs-existing status), then reset and confirm the vocabulary view returns to empty.

### Tests for User Story 3

- [X] T045 [US3] Integration tests for `GET /api/vocabulary` and `POST /api/vocabulary/reset` (including reset-then-verify-empty) in `backend/tests/integration/test_vocabulary_endpoint.py` (completed alongside T046/T047)

### Implementation for User Story 3

- [X] T046 [P] [US3] Implement `GET /api/vocabulary` route returning `VocabularyStore.snapshot()` in `backend/app/api/routes/vocabulary.py` (completed alongside T008/main.py, since `main.py` imports this router module unconditionally)
- [X] T047 [US3] Implement `POST /api/vocabulary/reset` route calling `VocabularyStore.reset()` in `backend/app/api/routes/vocabulary.py` (depends on T046; completed alongside T046 for the same reason)
- [X] T048 [P] [US3] Implement `VocabularyTable` (ID/token/frequency/status columns, new-row accent) in `frontend/src/components/vocabulary/VocabularyTable.tsx`
- [X] T049 [P] [US3] Implement `VocabularyResetButton` in `frontend/src/components/vocabulary/VocabularyResetButton.tsx`
- [X] T050 [US3] Wire vocabulary fetch-on-mount and refresh-after-successful-custom-tokenize into `useTokenizer`, and mount `VocabularyTable`/`VocabularyResetButton` for Custom Tokenizer mode in `frontend/src/hooks/useTokenizer.ts` and `frontend/src/App.tsx` (depends on T031, T046, T047, T048, T049)
- [X] T051 [P] [US3] Component tests for `VocabularyTable` status rendering and the reset flow in `frontend/tests/`

**Checkpoint**: All three original user stories are independently functional.

---

## Phase 6: User Story 4 - Train a Custom BPE Tokenizer (Priority: P2)

**Goal**: Within the Custom Tokenizer's new BPE sub-mode, a user enters training text and a target vocabulary size, starts training, and sees the learned vocabulary, ordered merge rules, and per-step training details.

**Independent Test**: Enter training text and a target vocabulary size, start training, and verify the vocabulary, ordered merge rules, and per-step training details are displayed — independent of tokenizing any new text afterward. Verify empty training text and an out-of-range vocabulary size are each rejected with a clear error, and that identical inputs retrain to an identical result.

### Tests for User Story 4

- [X] T056 [P] [US4] Unit tests for `bpe_service` (word splitting; sorted-codepoint base vocabulary ID determinism; merge-selection determinism including a constructed frequency tie; early stop when no pair recurs; repeat-training with identical inputs produces an identical vocabulary and merge-rule list) in `backend/tests/unit/test_bpe_service.py`
- [X] T057 [P] [US4] Unit tests for `bpe_store` (`train()` replaces the previous model atomically; `in_progress` flag rejects a concurrent `train()` call; `snapshot()` returns the untrained shape before any successful training) in `backend/tests/unit/test_bpe_store.py`
- [X] T058 [US4] Integration tests for `POST /api/bpe/train` and `GET /api/bpe/vocabulary` (happy path; repeat-call determinism; early-stop-target-not-reached case; `EMPTY_TRAINING_TEXT`, `TRAINING_TEXT_TOO_LONG`, `INVALID_VOCAB_SIZE`, `VOCAB_SIZE_TOO_LARGE`, `VOCAB_SIZE_TOO_SMALL`, `TRAINING_IN_PROGRESS`) in `backend/tests/integration/test_bpe_endpoint.py`

### Implementation for User Story 4

- [X] T059 [P] [US4] Define `BpeTrainRequest`, `BpeVocabularyEntry`, `BpeMergeRule`, `BpeStateResponse` Pydantic schemas (per data-model.md) in `backend/app/schemas/bpe.py`
- [X] T060 [P] [US4] Extend the exception hierarchy with `EmptyTrainingTextError`, `TrainingTextTooLongError`, `InvalidVocabSizeError`, `VocabSizeTooLargeError`, `VocabSizeTooSmallError`, `TrainingInProgressError`, `NoTrainedBpeModelError` and their `{error_code, message}` mappings in `backend/app/core/errors.py`
- [X] T061 [US4] Implement `BpeModelStore` (`vocabulary`, `merge_rules`, `target_vocab_size`, `achieved_vocab_size`, `trained`, `in_progress` flag, `threading.Lock`, `train()`, `snapshot()`) in `backend/app/services/bpe_store.py` (depends on T060) — also added a test-only `reset()` mirroring `VocabularyStore.reset()`, wired into `tests/conftest.py`
- [X] T062 [US4] Implement `BpeService.train` (whitespace word-splitting; base vocabulary sorted by codepoint; frequency-counted adjacent-pair merge loop with lexicographic tie-break; ordered merge-rule recording; early stop) in `backend/app/services/bpe_service.py` (depends on T061) — implemented as pure module-level functions (`train_bpe`, `tokenize_with_model`, `count_distinct_characters`) rather than a class, avoiding a circular import between `bpe_service.py` and `bpe_store.py` while keeping the algorithm independently unit-testable
- [X] T063 [US4] Implement `POST /api/bpe/train` route (validate `training_text`/`vocab_size` per contracts/bpe.md's validation order, invoke `BpeModelStore.train`, assemble `BpeStateResponse`) in `backend/app/api/routes/bpe.py` (depends on T059, T062)
- [X] T064 [US4] Implement `GET /api/bpe/vocabulary` route (call `BpeModelStore.snapshot()`) in `backend/app/api/routes/bpe.py` (depends on T061)
- [X] T065 [P] [US4] Implement `bpeClient.trainBpe` and `bpeClient.getBpeState` (with `{error_code, message}` error parsing) in `frontend/src/api/bpeClient.ts`
- [X] T066 [P] [US4] Define TypeScript types mirroring the backend BPE schemas in `frontend/src/types/bpe.ts`
- [X] T067 [US4] Implement the `bpeReducer` state machine (`trainStatus`: idle/training/trained/error; `tokenizeStatus`: idle/loading/success/error, kept independent) in `frontend/src/state/bpeReducer.ts`
- [X] T068 [US4] Implement the `useBpeTokenizer` hook's training half (`startTraining`, load current state on mount via `getBpeState`) wired to `bpeClient` in `frontend/src/hooks/useBpeTokenizer.ts` (depends on T067, T065)
- [X] T069 [P] [US4] Implement `CustomSubModeToggle` (Simple vs. BPE, shown only when Custom Tokenizer mode is selected) in `frontend/src/components/controls/CustomSubModeToggle.tsx`
- [X] T070 [P] [US4] Implement `BpeTrainingPanel` (training text input, target vocabulary size input, start-training control, validation messaging) in `frontend/src/components/bpe/BpeTrainingPanel.tsx`
- [X] T071 [P] [US4] Implement `BpeVocabularyTable` (id/symbol columns) in `frontend/src/components/bpe/BpeVocabularyTable.tsx`
- [X] T072 [P] [US4] Implement `BpeMergeRulesTable` (order/left/right/merged columns, achieved-vs-target vocabulary size note) in `frontend/src/components/bpe/BpeMergeRulesTable.tsx`
- [X] T073 [US4] Wire `CustomSubModeToggle`, `BpeTrainingPanel`, `BpeVocabularyTable`, and `BpeMergeRulesTable` into `App.tsx` behind the BPE sub-mode, with its own loading/empty/validation/success/error states in `frontend/src/App.tsx` (depends on T068, T069, T070, T071, T072, T018) — BPE sub-mode also hides the main typed-text/tokenize flow entirely (FR-059's separation), verified live in a browser
- [X] T074 [P] [US4] Component/hook tests: `useBpeTokenizer` training-state transitions, `BpeTrainingPanel` empty-text/invalid-vocab-size validation, `BpeVocabularyTable`/`BpeMergeRulesTable` rendering (including the "target not fully reached" note) in `frontend/tests/`

**Checkpoint**: User Story 4 (BPE training) is fully functional and independently testable.

---

## Phase 7: User Story 5 - Tokenize Text with a Trained BPE Tokenizer (Priority: P2)

**Goal**: After a BPE tokenizer has been trained, a user enters new text and tokenizes it using only the learned merge rules, with results shown in the existing tokenization result table.

**Independent Test**: Train a BPE tokenizer once (User Story 4), then enter new text not used in training, tokenize it, and verify the resulting tokens/IDs appear in the tokenization result table and remain identical across repeated runs; verify tokenizing before training produces a clear validation error.

### Tests for User Story 5

- [X] T075 [US5] Integration tests for `POST /api/tokenize` with `custom_sub_mode: "bpe"` (happy path including an unseen-character fallback; repeat-call determinism; `NO_TRAINED_BPE_MODEL` before any training) in `backend/tests/integration/test_tokenize_endpoint.py`

### Implementation for User Story 5

- [X] T076 [US5] Implement `BpeService.tokenize` (apply the trained model's merge rules, in learned order, to whitespace-delimited words; never select new pairs or mutate the model; an unmatched character yields `id: null, is_unknown: true`) in `backend/app/services/bpe_service.py` (depends on T062)
- [X] T077 [US5] Add `is_unknown: bool | null` to `TokenItem` and `custom_sub_mode: "simple" | "bpe"` to `TokenizeRequest`/`TokenizeResponse` in `backend/app/schemas/tokenize.py` (depends on T009)
- [X] T078 [US5] Extend the `POST /api/tokenize` route to dispatch `custom_sub_mode == "bpe"` to `BpeService.tokenize` via `BpeModelStore`, raising `NoTrainedBpeModelError` when untrained, in `backend/app/api/routes/tokenize.py` (depends on T040, T076, T077, T061)
- [X] T079 [P] [US5] Add `is_unknown`/`custom_sub_mode` fields to the mirrored TS types in `frontend/src/types/tokenizer.ts` (depends on T015) — added as optional fields (`is_unknown?`, `custom_sub_mode?`) and widened `id` to `number | null` so existing test fixtures without these fields still type-check
- [X] T080 [US5] Implement the `useBpeTokenizer` hook's tokenize half (`tokenizeWithBpe` → `postTokenize` with `customSubMode: 'bpe'`) in `frontend/src/hooks/useBpeTokenizer.ts` (depends on T067, T016)
- [X] T081 [P] [US5] Implement `BpeTokenizePanel` (new-text input + tokenize control, disabled with an explanatory empty state until a model is trained) in `frontend/src/components/bpe/BpeTokenizePanel.tsx`
- [X] T082 [US5] Extend `TokenVisualizer` to render an `is_unknown` accent/label distinct from the existing `is_new` accent in `frontend/src/components/results/TokenVisualizer.tsx` (depends on T033) — added `--accent-unknown`/`.badge-unknown`/`.neon-border-unknown` tokens to `theme.css` (contrast-checked ≥9:1)
- [X] T083 [US5] Wire `BpeTokenizePanel` into `App.tsx`'s BPE region, reusing `StatisticsPanel`/`TokenVisualizer` for its result, with loading/empty/validation/success/error states kept separate from the training flow's in `frontend/src/App.tsx` (depends on T073, T080, T081, T082)
- [X] T084 [P] [US5] Component/hook tests: `useBpeTokenizer` tokenize-state transitions, `BpeTokenizePanel` disabled-until-trained behavior, `TokenVisualizer` `is_unknown` rendering in `frontend/tests/`

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T052 [P] Responsive layout pass (single-column below ~640px, two-column input/results layout above) across `frontend/src/styles/theme.css` and layout components — implemented via `.app-columns`/`.app-shell` in `global.css`; token chips wrap and the vocabulary table scrolls on narrow viewports
- [X] T053 [P] Accessibility pass: keyboard navigation, visible focus rings, WCAG AA contrast verification, and non-color status labeling across `frontend/src/components/` — all interactive elements are native/focusable with `:focus-visible` outlines; contrast ratios computed and verified ≥4.5:1 for every text/background pairing in the theme (including the translucent error banner); status is always paired with a text label, never color alone
- [X] T054 Run the full `quickstart.md` walkthrough (all 3 user stories, every validation error path, cross-mode independence check) end-to-end — ran against a live server; all scenarios matched the documented contract exactly
- [X] T055 [P] Review backend and frontend test coverage to confirm every functional requirement (FR-001–FR-036) maps to at least one `pytest` or Vitest test, per constitution Principle VII — found and closed 3 frontend gaps: added `StatisticsPanel.test.tsx` (FR-028), `ErrorBanner.test.tsx` (FR-032), and `App.test.tsx` (FR-031, FR-033 full-app smoke test)
- [X] T085 [P] Extend the responsive/accessibility pass to the BPE training and BPE tokenization regions (reflow, keyboard navigation, focus rings, WCAG AA contrast, non-color status labeling for "new"/"existing"/"unknown") across `frontend/src/components/bpe/` and `frontend/src/App.tsx` — verified live with Playwright at desktop (1280px) and mobile (375px) viewports: single-column reflow with no horizontal overflow, visible focus outline on the training textarea, and the new amber "unknown" badge computed at ~9.4:1 contrast (both `--accent-unknown` background/dark text and light text on the neon border variant), always paired with a text label
- [X] T086 Run `quickstart.md` Scenarios 4 and 5 end-to-end (BPE training happy path and determinism, early-stop-target-not-reached case, every BPE validation error, BPE tokenize happy path and determinism, unseen-character fallback, tokenize-before-training rejection, flow-separation check) — ran against a live server via curl (matched contracts/bpe.md's examples exactly, including the target-not-reached case) and via a full Playwright browser walkthrough of both flows end-to-end; zero console/page errors
- [X] T087 [P] Review backend and frontend test coverage to confirm every BPE functional requirement (FR-037–FR-061) maps to at least one `pytest` or Vitest test, per constitution Principle VII — found and closed 3 gaps: added an explicit "typing alone never starts training" assertion (FR-043) to `BpeTrainingPanel.test.tsx`, and added FR-050/FR-057 references to `BpeMergeRulesTable.test.tsx` and `test_tokenize_endpoint.py` respectively for traceability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 has no dependency on US2/US3
  - US2 extends the `POST /api/tokenize` route and `App.tsx` that US1 creates (T027, T034) — build US1 first
  - US3 depends only on the `VocabularyStore` built in US1 (T025) plus Foundational, not on US2
  - US4 (BPE training) depends only on Foundational (schemas/errors pattern, app shell) — independent of US1/US2/US3's runtime state, though it shares `App.tsx`/`errors.py`/`main.py` as files
  - US5 (BPE tokenize) extends the `POST /api/tokenize` route and `App.tsx` that US1/US2 build (T040), and depends on US4's `BpeService.train`/`BpeModelStore` (T061, T062) actually having a model to tokenize against — build US4 first
- **Polish (Phase 8)**: Depends on all five user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational; its route/App.tsx tasks (T040, T042) build on US1's T027/T034, but the story remains independently *testable* once those tasks land
- **User Story 3 (P3)**: Can start after Foundational + US1's `VocabularyStore` (T025); independent of US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2); independent of US1/US2/US3 at the service/store level, though its frontend wiring (T073) shares `App.tsx` with US1/US2/US3's wiring
- **User Story 5 (P2)**: Can start after Foundational; needs US4's `BpeService`/`BpeModelStore` (T061, T062) and US1/US2's `POST /api/tokenize` route (T040) to extend

### Within Each User Story

- Tests are written before their corresponding implementation tasks and MUST fail first
- Services before routes; routes before frontend wiring that calls them
- Story complete and checkpoint-verified before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T004, T005)
- All Foundational tasks marked [P] can run in parallel (T009–T016, T018)
- Within US1: T019–T022 (unit tests) in parallel; T024–T025 in parallel; T028–T029, T032–T033 in parallel
- Within US2: T036 alone; T038 before T039 (same file); T041, T043 in parallel
- Within US3: T046 before T047 (same file); T048–T049 in parallel
- US2 and US3 backend work (file_service vs. vocabulary routes) can proceed in parallel once US1 is checkpointed, since they touch disjoint files aside from the shared `tokenize.py` route (US2 only)
- Within US4: T056–T057 (unit tests) in parallel; T059–T060 in parallel; T065–T066, T069–T072 in parallel
- Within US5: T079 can run in parallel with T076–T078 (different files); T081 in parallel with T076–T080
- US4's backend work (T059–T064) can proceed in parallel with US2/US3's remaining work once Foundational is checkpointed, since none of them share files with `bpe_service.py`/`bpe_store.py`/`routes/bpe.py`; US5 must wait for US4's T061/T062 and US1/US2's T040

---

## Parallel Example: User Story 1

```bash
# Launch all US1 unit tests together:
Task: "Unit tests for TiktokenService in backend/tests/unit/test_tiktoken_service.py"
Task: "Unit tests for CustomTokenizerService in backend/tests/unit/test_custom_tokenizer_service.py"
Task: "Unit tests for VocabularyStore in backend/tests/unit/test_vocabulary_store.py"
Task: "Unit tests for stats_service in backend/tests/unit/test_stats_service.py"

# Launch independent US1 services together:
Task: "Implement TiktokenService in backend/app/services/tiktoken_service.py"
Task: "Implement VocabularyStore in backend/app/services/vocabulary_store.py"

# Launch independent US1 frontend components together:
Task: "Implement InputModeToggle and TextInputPanel in frontend/src/components/input/"
Task: "Implement TokenizerModeSelect, EncodingSelect, TokenizeButton in frontend/src/components/controls/"
```

---

## Parallel Example: User Story 4

```bash
# Launch all US4 unit tests together:
Task: "Unit tests for bpe_service in backend/tests/unit/test_bpe_service.py"
Task: "Unit tests for bpe_store in backend/tests/unit/test_bpe_store.py"

# Launch independent US4 schema/error tasks together:
Task: "Define Bpe* Pydantic schemas in backend/app/schemas/bpe.py"
Task: "Extend exception hierarchy with BPE errors in backend/app/core/errors.py"

# Launch independent US4 frontend components together:
Task: "Implement CustomSubModeToggle in frontend/src/components/controls/CustomSubModeToggle.tsx"
Task: "Implement BpeTrainingPanel in frontend/src/components/bpe/BpeTrainingPanel.tsx"
Task: "Implement BpeVocabularyTable in frontend/src/components/bpe/BpeVocabularyTable.tsx"
Task: "Implement BpeMergeRulesTable in frontend/src/components/bpe/BpeMergeRulesTable.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `quickstart.md` Scenario 1 independently
5. Demo if ready — a user can already tokenize typed text with either tokenizer

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Validate via quickstart Scenario 1 → Demo (MVP!)
3. Add User Story 2 → Validate via quickstart Scenario 2 → Demo
4. Add User Story 3 → Validate via quickstart Scenario 3 → Demo
5. Add User Story 4 (BPE training) → Validate via quickstart Scenario 4 → Demo
6. Add User Story 5 (BPE tokenize) → Validate via quickstart Scenario 5 → Demo
7. Finish with Phase 8 Polish, then the full `quickstart.md` walkthrough

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational and US1's `VocabularyStore`/route are checkpointed:
   - Developer A: User Story 2 (file handling)
   - Developer B: User Story 3 (vocabulary endpoints/UI)
   - Developer C: User Story 4 (BPE training service/store/UI) — independent of A and B
3. Once User Story 4's `BpeService`/`BpeModelStore` (T061, T062) and User Story 2's `POST /api/tokenize`
   extension (T040) are checkpointed, a developer can pick up User Story 5 (BPE tokenize)
4. All integrate independently against the US1 baseline

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing against them
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
