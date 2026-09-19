# Quickstart: Tokenizer Application

Validates the five user stories in [spec.md](./spec.md) end-to-end. Field/endpoint details are in
[contracts/](./contracts/) and [data-model.md](./data-model.md) — not repeated here.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Backend dependencies installed (`fastapi`, `uvicorn`, `tiktoken`, `pymupdf`, `pydantic`,
  `pydantic-settings`, `pytest`, `httpx`) in `backend/`
- Frontend dependencies installed (`npm install`) in `frontend/`

## Run the backend

```bash
cd backend
uvicorn app.main:app --reload
```

Server starts on `http://localhost:8000`.

## Run the frontend

```bash
cd frontend
npm run dev
```

App opens on `http://localhost:5173` (or the port Vite reports), pointed at the backend above.

## Scenario 1 — Tokenize typed text (User Story 1, P1)

In the browser: type `Hello, world!` into the text input, select **Tiktoken** mode, and click
**Tokenize**. Expect: a success state showing 4 tokens (index/id/text each) and statistics
(`character_count: 13`, `word_count: 2`, `token_count: 4`).

Equivalent API check:

```bash
curl -X POST http://localhost:8000/api/tokenize \
  -F "tokenizer_mode=tiktoken" \
  -F "encoding=cl100k_base" \
  -F "text=Hello, world!"
```

Expected: `200 OK`, body matching the Tiktoken example in
[contracts/tokenize.md](./contracts/tokenize.md).

Repeat with **Custom Tokenizer** mode selected (omit `encoding`):

```bash
curl -X POST http://localhost:8000/api/tokenize \
  -F "tokenizer_mode=custom" \
  -F "text=Hello, world!"
```

Expected: `200 OK`, 4 tokens each with `"is_new": true` on first run (fresh vocabulary).

Then submit with no text and no file, and confirm `EMPTY_INPUT` (400) — validates FR-004.

## Scenario 2 — Tokenize an uploaded document (User Story 2, P2)

In the browser: switch to file upload mode, upload a small `.txt` file, confirm the extracted text
section shows its contents, then tokenize it. Repeat with a text-based `.pdf`.

Equivalent API checks:

```bash
curl -X POST http://localhost:8000/api/tokenize \
  -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample.txt;type=text/plain"

curl -X POST http://localhost:8000/api/tokenize \
  -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample_valid.pdf;type=application/pdf"
```

Then confirm each error path:

```bash
# Unsupported type
curl -X POST http://localhost:8000/api/tokenize -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample.docx;type=application/msword"
# → 400 UNSUPPORTED_FILE_TYPE

# Corrupted PDF
curl -X POST http://localhost:8000/api/tokenize -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample_corrupted.pdf;type=application/pdf"
# → 400 CORRUPTED_PDF

# Textless PDF
curl -X POST http://localhost:8000/api/tokenize -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample_textless.pdf;type=application/pdf"
# → 400 NO_EXTRACTABLE_TEXT

# Oversized file (>5MB fixture)
curl -X POST http://localhost:8000/api/tokenize -F "tokenizer_mode=tiktoken" -F "encoding=cl100k_base" \
  -F "file=@backend/tests/fixtures/sample_oversized.txt;type=text/plain"
# → 400 FILE_TOO_LARGE
```

## Scenario 3 — Explore and manage the Custom Tokenizer vocabulary (User Story 3, P3)

1. Reset first to start from a known state:

   ```bash
   curl -X POST http://localhost:8000/api/vocabulary/reset
   # → { "message": "...", "vocabulary": [] }
   ```

2. Tokenize `Hello, world!` in Custom mode (see Scenario 1), then fetch the vocabulary:

   ```bash
   curl http://localhost:8000/api/vocabulary
   ```

   Expected: 4 entries (`Hello`, `,`, `world`, `!`), each `frequency: 1`, `status: "new"`.

3. Tokenize `Hello, world! Hello!` in Custom mode again, then re-fetch the vocabulary. Expected:
   `Hello`/`,`/`world`/`!` now have higher `frequency` and `status: "existing"` (already known before
   this operation) except any token this exact call introduced for the first time, which is `"new"`.
   Verify IDs for `Hello`, `,`, `world`, `!` are unchanged from step 2 (deterministic reuse, FR-018).

4. In the browser, confirm the vocabulary table updates immediately after each Custom Tokenizer run
   without a manual refresh (FR-025), and that "new" rows/chips are visually distinguished (FR-024).

5. Reset again and confirm the browser's vocabulary view immediately shows empty (FR-026).

## Cross-mode independence check (FR-016)

Tokenize the same text in both modes back-to-back and confirm: the Tiktoken response never contains
`is_new` values, and running Tiktoken mode never changes `GET /api/vocabulary`'s contents or the
Custom Tokenizer's next assigned ID.

## Scenario 4 — Train a Custom BPE Tokenizer (User Story 4, P2)

1. Confirm the empty state first:

   ```bash
   curl http://localhost:8000/api/bpe/vocabulary
   # → { "trained": false, "vocabulary": [], "merge_rules": [], "target_vocab_size": null, "achieved_vocab_size": null, "target_reached": null }
   ```

2. In the browser: switch Custom Tokenizer mode to the **BPE** sub-mode, paste a few paragraphs of
   repetitive training text (e.g. `"ab ab ab abc abc"` for a minimal, quick-to-verify case), set a
   target vocabulary size, and start training. Expect a loading/in-progress state, then the learned
   vocabulary, ordered merge rules, and per-step training details (pair selected and merged at each
   step).

   Equivalent API check:

   ```bash
   curl -X POST http://localhost:8000/api/bpe/train \
     -H "Content-Type: application/json" \
     -d '{"training_text": "ab ab ab abc abc", "vocab_size": 6}'
   ```

   Expected: `200 OK`, body matching [contracts/bpe.md](./contracts/bpe.md), with `trained: true` and
   a non-empty `merge_rules` list.

3. Repeat the exact same request and confirm the response is byte-for-byte identical — validates
   FR-052/SC-009 (deterministic vocabulary and merge rules for identical inputs).

4. Attempt training with an empty `training_text` → confirm `EMPTY_TRAINING_TEXT` (400). Attempt with
   `vocab_size` less than or equal to the number of distinct characters in the training text → confirm
   `VOCAB_SIZE_TOO_SMALL` (400) — validates FR-039/FR-040.

5. Train again with a `vocab_size` far larger than the training text can support (e.g. `500` for the
   two-word example above) and confirm `target_reached: false` with `achieved_vocab_size` less than
   `target_vocab_size` — validates FR-047/US4 Scenario 5.

## Scenario 5 — Tokenize text with a trained BPE tokenizer (User Story 5, P2)

1. Before any training in this session, attempt to tokenize with the BPE sub-mode and confirm
   `NO_TRAINED_BPE_MODEL` (400) — validates FR-055/US5 Scenario 1:

   ```bash
   curl -X POST http://localhost:8000/api/tokenize \
     -F "tokenizer_mode=custom" -F "custom_sub_mode=bpe" -F "text=ab"
   ```

2. Train a BPE tokenizer (Scenario 4, step 2), then tokenize new text not used in training:

   ```bash
   curl -X POST http://localhost:8000/api/tokenize \
     -F "tokenizer_mode=custom" -F "custom_sub_mode=bpe" -F "text=abz"
   ```

   Expected: `200 OK`, tokens rendered in the same tokenization result table used by every other
   mode; a character absent from training (e.g. `z`) appears with `"id": null, "is_unknown": true`.

3. Repeat the same tokenize call and confirm the token sequence and IDs are identical every time
   (FR-056/SC-010), and that `GET /api/bpe/vocabulary` is unchanged before and after (tokenizing never
   mutates the trained model).

4. In the browser, confirm the BPE training flow and BPE tokenization flow are visually and
   functionally separate regions, each with its own loading/empty/validation/success/error states
   (FR-059, FR-060, SC-011).

## Automated tests

```bash
cd backend && pytest
cd frontend && npm test
```

All backend and frontend automated tests (see plan.md's Testing Strategy) should pass before this
feature is considered complete.
