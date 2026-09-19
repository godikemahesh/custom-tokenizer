# Feature Specification: Tokenizer Application

**Feature Branch**: `001-tokenizer-app`

**Created**: 2026-09-18

**Last Updated**: 2026-09-18 — Added Byte Pair Encoding (BPE) training and tokenization to the Custom Tokenizer

**Status**: Draft

**Input**: User description: "Define the functional requirements for the Tokenizer Application. The application must allow users to enter text directly or upload TXT/PDF files, select between Tiktoken and Custom Tokenizer modes with a chosen encoding, tokenize the input, display per-token details and text statistics, maintain and display an application-owned Custom Tokenizer vocabulary with deterministic IDs and frequency tracking, allow resetting that vocabulary, validate inputs and files with clear errors, and provide loading/empty/error/success states in a responsive, accessible interface — all without authentication, databases, OCR, cloud storage, LLM inference, billing, or tokenizer training."

**Update Input**: "Update the existing specification to enhance the Custom Tokenizer with Byte Pair Encoding (BPE). Keep all existing functionality unchanged, especially Tiktoken and the current Custom Tokenizer. The Custom Tokenizer should support BPE training using user-provided training text, with a user-set target vocabulary size. After training, show the learned vocabulary, merge rules, and per-step training details (pair selected and merged). Users then tokenize new text using the trained BPE tokenizer and see results in the existing tokenization result table. The UI must clearly separate the BPE training flow from the BPE tokenization flow, with appropriate loading, empty, validation, success, and error states. BPE must learn frequent adjacent pairs, merge them repeatedly, build a vocabulary and ordered merge rules, and use only those learned rules when tokenizing new text (no learning during tokenization). BPE vocabulary IDs must be deterministic. All BPE logic lives in the backend; the frontend only handles input, API calls, UI state, and visualization."

## Clarifications

### Session 2026-09-18

- Q: What is the maximum file size the application should accept for TXT/PDF uploads? → A: 5MB — typical document size, good balance.
- Q: What splitting rule should the Custom Tokenizer use to break text into tokens? → A: Whitespace + punctuation splitting — words become tokens, punctuation marks become their own tokens.
- Q: Which Tiktoken encodings should the encoding selector offer to users? → A: cl100k_base only — the application supports a single Tiktoken encoding.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tokenize Typed Text (Priority: P1)

A user wants to understand how a piece of text is broken into tokens. They type or paste text directly into the application, choose a tokenizer (Tiktoken with an encoding, or the Custom Tokenizer), and tokenize it to see the resulting tokens and statistics.

**Why this priority**: This is the core value of the application — converting text into tokens and making the result understandable. Without this, there is no product.

**Independent Test**: Can be fully tested by typing a short sentence, selecting a tokenizer mode, clicking tokenize, and verifying the token list and statistics are displayed. Delivers value entirely on its own.

**Acceptance Scenarios**:

1. **Given** the application is loaded with no prior input, **When** the user types text and selects Tiktoken mode with a supported encoding, then triggers tokenization, **Then** the system displays each token's index, ID, and text, along with character count, word count, token count, tokens-per-word, and tokens-per-character.
2. **Given** the application is loaded, **When** the user types text and selects Custom Tokenizer mode, then triggers tokenization, **Then** the system displays each token's index, ID, and text using the Custom Tokenizer's own vocabulary and deterministic splitting.
3. **Given** the user has not entered any text and no file is uploaded, **When** the user triggers tokenization, **Then** the system shows a clear validation error and does not attempt to tokenize.
4. **Given** a successful tokenization has completed, **When** the user views the result, **Then** the system clearly indicates a success state (as opposed to loading or error).

---

### User Story 2 - Tokenize an Uploaded Document (Priority: P2)

A user has a TXT or PDF file and wants to tokenize its contents without retyping it. They upload the file, the application extracts the text, and the user tokenizes it the same way as typed text.

**Why this priority**: Extends the core tokenization value to real documents, which is a common practical use case, but the application is still fully usable via typed text without it.

**Independent Test**: Can be fully tested by uploading a valid TXT file and a valid text-based PDF file, confirming extracted text is shown, then tokenizing and verifying results — independent of the typed-text flow.

**Acceptance Scenarios**:

1. **Given** the user selects file upload as the input mode, **When** they upload a valid TXT file, **Then** the system shows the extracted text and allows tokenization of it.
2. **Given** the user uploads a valid, text-based PDF, **When** extraction completes, **Then** the system displays the extracted text in a dedicated section and allows tokenization.
3. **Given** the user uploads a file that is not TXT or PDF, **When** the upload is processed, **Then** the system rejects it with a clear, user-friendly error naming the supported file types.
4. **Given** the user uploads a file larger than 5MB, **When** the upload is processed, **Then** the system rejects it with a clear error stating the 5MB limit.
5. **Given** the user uploads a corrupted or invalid PDF, **When** the system attempts to process it, **Then** it shows a clear error indicating the file could not be read.
6. **Given** the user uploads a PDF with no extractable text (e.g., a scanned image with no embedded text), **When** the system attempts extraction, **Then** it shows a clear error indicating no text could be found in the document.

---

### User Story 3 - Explore and Manage the Custom Tokenizer Vocabulary (Priority: P3)

A user working in Custom Tokenizer mode wants to see how the application's vocabulary grows over repeated use, which tokens are new versus previously known, and wants the option to start over with a clean vocabulary.

**Why this priority**: Adds transparency and control over the Custom Tokenizer's learning behavior. Valuable for understanding the tokenizer's mechanics, but not required for a single one-off tokenization.

**Independent Test**: Can be fully tested by tokenizing text twice with the Custom Tokenizer (observing new vs. reused tokens and frequency growth), then resetting the vocabulary and confirming it returns to its initial empty state — independent of file upload or Tiktoken flows.

**Acceptance Scenarios**:

1. **Given** the user has tokenized text at least once with the Custom Tokenizer, **When** they view the vocabulary section, **Then** it lists every known token with its ID, token text, frequency count, and status.
2. **Given** the user tokenizes new text containing both previously-seen and brand-new tokens, **When** the operation completes, **Then** the vocabulary display updates immediately and visually distinguishes the tokens newly created by that operation from pre-existing ones.
3. **Given** the user tokenizes the same text a second time, **When** the operation completes, **Then** previously created tokens are reused with the same IDs and their frequency counts increase, rather than new entries being created.
4. **Given** the user has an established Custom Tokenizer vocabulary, **When** they choose to reset it, **Then** the vocabulary returns to its initial empty state and the display reflects this immediately.

---

### User Story 4 - Train a Custom BPE Tokenizer (Priority: P2)

A user wants to see how Byte Pair Encoding builds a vocabulary from scratch. Within Custom Tokenizer mode, they switch to the BPE sub-mode, paste or type training text, set a target vocabulary size, and start training. Once training finishes, they review the learned vocabulary, the ordered merge rules, and a step-by-step record of which pair was selected and merged at each step.

**Why this priority**: This is the new, distinct value this enhancement adds — turning the Custom Tokenizer from a fixed-rule splitter into something that learns from user-provided text. It is independent of, and does not replace, the existing Simple Custom Tokenizer behavior.

**Independent Test**: Can be fully tested by entering training text and a target vocabulary size, starting training, and verifying that a vocabulary, ordered merge rules, and per-step training details are displayed — independent of tokenizing any new text afterward.

**Acceptance Scenarios**:

1. **Given** the user is in the Custom Tokenizer's BPE sub-mode with no training performed yet, **When** they view the training results area, **Then** the system shows a clear empty state indicating no BPE tokenizer has been trained.
2. **Given** the user enters non-empty training text and a valid target vocabulary size, **When** they start training, **Then** the system shows a loading/in-progress state and, on completion, displays the learned vocabulary, the ordered list of merge rules, and the pair selected and merged at each training step.
3. **Given** the user starts training without entering any training text, **When** they attempt to start training, **Then** the system shows a clear validation error and does not start training.
4. **Given** the user sets a target vocabulary size that is not a positive integer greater than the number of distinct characters in the training text, **When** they attempt to start training, **Then** the system shows a clear validation error explaining the requirement.
5. **Given** the training text does not contain enough distinct repeated pairs to reach the requested target vocabulary size, **When** training completes, **Then** the system stops early, displays the vocabulary size it actually achieved, and clearly indicates the target was not fully reached.
6. **Given** the user has already trained a BPE tokenizer once, **When** they change the training text or target vocabulary size and start training again, **Then** the system replaces the previous vocabulary and merge rules with the newly trained ones.
7. **Given** training is repeated with identical training text and identical target vocabulary size, **When** both runs complete, **Then** the resulting vocabulary and ordered merge rules are identical between runs.

---

### User Story 5 - Tokenize Text with a Trained BPE Tokenizer (Priority: P2)

Having trained a BPE tokenizer, a user wants to see how it tokenizes new text they didn't use for training. They enter new text and tokenize it, and the application applies only the previously learned merge rules — without learning anything new — to produce a token sequence, which appears in the same tokenization result table used elsewhere in the application.

**Why this priority**: This is the payoff of training — seeing the trained model applied to new input. It depends on User Story 4 having produced a trained model, but is itself a distinct, independently verifiable flow.

**Independent Test**: Can be fully tested by training a BPE tokenizer once, then entering new text (not used in training) in the BPE tokenization flow, tokenizing it, and verifying the resulting tokens and IDs appear in the tokenization result table and remain unchanged across repeated runs.

**Acceptance Scenarios**:

1. **Given** no BPE tokenizer has been trained yet, **When** the user attempts to tokenize text in the BPE tokenization flow, **Then** the system shows a clear validation error instructing them to train a BPE tokenizer first, and does not attempt to tokenize.
2. **Given** a BPE tokenizer has been trained, **When** the user enters new text and tokenizes it, **Then** the system displays the resulting tokens and token IDs in the existing tokenization result table, using only the rules learned during training.
3. **Given** a BPE tokenizer has been trained, **When** the user tokenizes the same new text more than once without retraining, **Then** the resulting token sequence and IDs are identical every time.
4. **Given** new text contains a character that never appeared in the training text, **When** the user tokenizes it, **Then** the system represents that character with a clearly labeled fallback rather than failing the request or inventing a new vocabulary entry.
5. **Given** the user tokenizes text with the BPE tokenizer, **When** the operation completes, **Then** no entry is added to, or removed from, the trained vocabulary or merge rules as a result of that tokenization.

---

### Edge Cases

- What happens when the user submits empty text with no file uploaded? (System MUST reject with a clear validation error and take no further action.)
- What happens when a user uploads a file that is not TXT or PDF (e.g., DOCX, image)? (System MUST reject with a clear, specific error before any processing.)
- What happens when an uploaded file exceeds 5MB?
- What happens when an uploaded PDF is corrupted or otherwise unreadable?
- What happens when an uploaded PDF contains no extractable text (e.g., scanned/image-only content, since OCR is out of scope)?
- What happens when a request specifies an encoding other than cl100k_base (e.g., via a manipulated request bypassing the UI's single-option selector)?
- What happens when the user switches tokenizer mode (Tiktoken ↔ Custom Tokenizer) after already viewing a result? (Prior results MUST NOT be misattributed to the newly selected mode; the interface MUST make clear which mode produced the currently displayed result.)
- What happens when the user resets the Custom Tokenizer vocabulary while a previous tokenization result derived from that vocabulary is still on screen? (The displayed vocabulary MUST reflect the reset; historical result data already shown MUST NOT silently change its already-displayed token IDs.)
- What happens when the user starts BPE training with empty training text? (System MUST reject with a clear validation error and take no further action.)
- What happens when the user sets a target vocabulary size that is zero, negative, non-numeric, or not larger than the number of distinct characters in the training text? (System MUST reject with a clear validation error before training starts.)
- What happens when the training text is too small or too repetitive-free to reach the requested target vocabulary size? (System MUST stop early, report the achieved vocabulary size, and clearly indicate the target was not fully reached, rather than failing or hanging.)
- What happens when two or more adjacent pairs are tied for the highest frequency during a BPE training step? (System MUST apply a consistent, deterministic tie-breaking rule so identical inputs always produce identical results.)
- What happens when the user attempts to tokenize text in the BPE tokenization flow before any BPE tokenizer has been trained? (System MUST reject with a clear message instructing the user to train first, and MUST NOT attempt to tokenize.)
- What happens when the user starts a new BPE training run after already using a trained BPE tokenizer to tokenize text? (The new training run MUST replace the prior vocabulary and merge rules; previously displayed tokenization results MUST NOT silently change their already-displayed token IDs.)
- What happens when text submitted to the trained BPE tokenizer contains a character absent from the training text's vocabulary? (System MUST represent it via a clearly labeled fallback rather than failing the request, crashing, or silently learning a new merge rule.)
- What happens when the user switches the Custom Tokenizer sub-mode between Simple and BPE after viewing a result? (Prior results MUST NOT be misattributed to the newly selected sub-mode; the interface MUST make clear which sub-mode produced the currently displayed result, and vocabularies of the two sub-modes MUST remain independent.)

## Requirements *(mandatory)*

### Functional Requirements

**Input & Validation**

- **FR-001**: Users MUST be able to enter text directly into the interface for tokenization.
- **FR-002**: Users MUST be able to upload a TXT file as an alternative input source.
- **FR-003**: Users MUST be able to upload a PDF file as an alternative input source; the system MUST extract text from PDFs whose content is text-based (directly extractable, not scanned images).
- **FR-004**: The system MUST reject a tokenization request when no non-empty input (typed text or uploaded file) is provided, showing a clear validation error.
- **FR-005**: The system MUST reject uploaded files whose type is not TXT or PDF, with a clear error identifying the supported types.
- **FR-006**: The system MUST reject uploaded files that exceed 5MB, with a clear error stating the limit.
- **FR-007**: The system MUST detect and reject invalid or corrupted PDF files, with a clear error.
- **FR-008**: The system MUST detect PDFs from which no text can be extracted and show a clear error explaining that the document contains no extractable text.

**Tokenizer Mode & Encoding Selection**

- **FR-009**: Users MUST be able to select between two tokenizer modes: Tiktoken and Custom Tokenizer. When Custom Tokenizer mode is selected, users MUST further choose between two sub-modes: Simple (the original whitespace/punctuation behavior) and BPE (the trained, merge-rule-based behavior defined below).
- **FR-010**: When Tiktoken mode is selected, the interface MUST present cl100k_base as the supported Tiktoken encoding, which the application uses for tokenization.
- **FR-011**: The system MUST validate that the selected encoding is cl100k_base and reject any other or invalid encoding value with a clear error.

**Tokenization Behavior**

- **FR-012**: The system MUST tokenize the provided input using the selected tokenizer mode (and, for Tiktoken, the selected encoding) when the user initiates tokenization.
- **FR-013**: When Tiktoken mode is used, the system MUST use the actual selected encoding to produce real token IDs and token text exactly as that encoding produces them.
- **FR-014**: When Custom Tokenizer mode is used with the Simple sub-mode, the system MUST deterministically split input on whitespace, treating each punctuation mark as its own separate token, such that identical input always splits into the identical sequence of tokens.
- **FR-015**: The Tiktoken vocabulary/encoding tables MUST never be modified by the application.
- **FR-016**: Tiktoken and Custom Tokenizer behavior MUST remain fully independent — using one MUST have no effect on the vocabulary, state, or output of the other.

**Custom Vocabulary Management**

- **FR-017**: The system MUST maintain an application-owned Custom Tokenizer vocabulary that persists in memory for the lifetime of the running application.
- **FR-018**: When a token produced by the Custom Tokenizer already exists in the vocabulary, the system MUST reuse its existing ID rather than creating a duplicate entry.
- **FR-019**: When a token produced by the Custom Tokenizer has not been seen before, the system MUST create a new vocabulary entry for it.
- **FR-020**: The system MUST assign a deterministic ID to each newly created custom vocabulary entry.
- **FR-021**: The system MUST track how many times each custom vocabulary token has been produced, incrementing its frequency count each time it recurs.
- **FR-022**: The system MUST identify which tokens, among those produced by a given tokenization operation, were newly created by that specific operation.
- **FR-023**: Users MUST be able to view the current Custom Tokenizer vocabulary, showing for each entry: its ID, token text, frequency count, and status (new vs. existing).
- **FR-024**: The vocabulary display MUST visually distinguish tokens newly created in the most recent tokenization operation from previously existing tokens.
- **FR-025**: The vocabulary display MUST update immediately after a successful Custom Tokenizer operation, without requiring a manual refresh.
- **FR-026**: Users MUST be able to reset the Custom Tokenizer vocabulary to its initial empty state, clearing all learned tokens and frequency data.

**BPE Training**

- **FR-037**: Users MUST be able to enter training text within the Custom Tokenizer's BPE sub-mode.
- **FR-038**: Users MUST be able to specify a target vocabulary size before starting BPE training.
- **FR-039**: The system MUST reject a BPE training request when the training text is empty, showing a clear validation error.
- **FR-040**: The system MUST reject a BPE training request when the target vocabulary size is not a positive integer, or is not greater than the number of distinct base characters present in the training text, showing a clear validation error that explains the requirement.
- **FR-041**: The system MUST reject a BPE training request when the training text exceeds a defined maximum length, showing a clear error stating the limit.
- **FR-042**: The system MUST reject a BPE training request when the target vocabulary size exceeds a defined maximum, showing a clear error stating the limit.
- **FR-043**: BPE training MUST only start when the user explicitly triggers it; entering training text or a target vocabulary size alone MUST NOT start training.
- **FR-044**: While BPE training is in progress, the interface MUST show a clear loading/in-progress state and MUST prevent starting a duplicate concurrent training run or tokenizing with the BPE tokenizer until training completes.
- **FR-045**: The system MUST derive an initial base vocabulary from the distinct characters present in the training text, then repeatedly identify the most frequent adjacent pair of symbols in the training data and merge it into a new symbol, adding that symbol to the vocabulary and recording an ordered merge rule for it, continuing until either the target vocabulary size is reached or no further pairs remain to merge.
- **FR-046**: When two or more adjacent pairs share the highest frequency at a given training step, the system MUST apply a consistent, deterministic tie-breaking rule to select exactly one pair, such that repeating training with identical inputs always makes the same selection.
- **FR-047**: If the training text does not contain enough distinct mergeable pairs to reach the requested target vocabulary size, the system MUST stop training early, report the vocabulary size actually achieved, and clearly indicate that the target size was not fully reached.
- **FR-048**: Starting a new BPE training run MUST replace any previously trained BPE vocabulary and merge rules; the BPE tokenizer MUST hold at most one trained model at a time.

**BPE Vocabulary & Merge Rules**

- **FR-049**: After training completes, the interface MUST display the learned vocabulary, listing each entry's ID and symbol.
- **FR-050**: After training completes, the interface MUST display the ordered merge rules, showing for each rule the pair of symbols merged and its position in the merge order.
- **FR-051**: After training completes, the interface MUST display per-step training details showing which pair was selected and merged at each training step, in the order the merges were performed.
- **FR-052**: BPE vocabulary IDs MUST be assigned deterministically, such that training on identical input (same training text and same target vocabulary size) always produces the same ID for the same symbol.
- **FR-053**: Before any BPE training has completed, or after a failed training attempt, the vocabulary, merge rule, and training-detail displays MUST show a clear empty state rather than blank or stale data.

**BPE Tokenization**

- **FR-054**: After a BPE tokenizer has been successfully trained, users MUST be able to enter new text and tokenize it using that trained tokenizer's vocabulary and merge rules.
- **FR-055**: The system MUST reject a BPE tokenize request when no BPE tokenizer has been trained yet, with a clear message instructing the user to train one first.
- **FR-056**: BPE tokenization MUST apply only the merge rules learned during training, in the order they were learned, and MUST NOT create, learn, or modify any merge rule or vocabulary entry as a result of tokenizing.
- **FR-057**: BPE tokenization results MUST be displayed using the same tokenization result table used by the other tokenizer modes, showing each resulting token's index, ID, and text.
- **FR-058**: When text submitted for BPE tokenization contains a character that was not present in the training text's base vocabulary, the system MUST represent it using a clearly labeled fallback in the result rather than failing the request or fabricating a new vocabulary entry.

**BPE UI Flow & Validation**

- **FR-059**: The interface MUST visually and functionally separate the BPE training flow (training text, target vocabulary size, start-training control, vocabulary/merge-rule/training-detail results) from the BPE tokenization flow (new text entry, tokenize control, tokenization result), so the user always knows which flow they are using.
- **FR-060**: The interface MUST provide distinct loading, empty, validation-error, processing-error, and success states for both the BPE training flow and the BPE tokenization flow, independent of the states shown for Tiktoken or Simple Custom Tokenizer results.
- **FR-061**: The Custom Tokenizer's Simple sub-mode and BPE sub-mode MUST remain fully independent — vocabulary, training data, and results belonging to one MUST NOT affect the other.

**Result Display**

- **FR-027**: For each tokenization result, the system MUST display, for every token, its index (position in sequence), its ID, and its token text.
- **FR-028**: For each tokenization result, the system MUST display character count, word count, token count, tokens-per-word ratio, and tokens-per-character ratio.
- **FR-029**: For uploaded documents, the system MUST display the extracted text in a dedicated section so users can see what was tokenized.
- **FR-030**: For each tokenization result, the system MUST make available the original input text, the total token count, the ordered list of token IDs, the ordered list of decoded token texts, the character count, the word count, the tokens-per-word ratio, the tokens-per-character ratio, the tokenizer/encoding used, and the source type of the input (typed text, TXT upload, or PDF upload).

**Interface & Feedback**

- **FR-031**: The interface MUST include: an application title, a description of the application's purpose, input mode selection, controls for typing text or uploading a file, an encoding selector for Tiktoken mode, a control to trigger tokenization, a statistics section, a token visualization section, an extracted-text section for uploaded documents, and an area for error messages.
- **FR-032**: The system MUST present clear, non-technical messages for all validation and processing errors.
- **FR-033**: The interface MUST provide distinct loading, empty, error, and success states so users always understand the current status of their request.
- **FR-034**: The interface MUST remain usable and legible across common desktop and mobile screen sizes and MUST be operable using accessible interaction patterns (keyboard navigation, sufficient contrast, labeled controls).

**Scope Constraints**

- **FR-035**: The system MUST NOT persist vocabulary data, trained BPE vocabulary/merge rules, or user/session data in a database; all state MUST exist only in memory for the lifetime of the running application.
- **FR-036**: The system MUST NOT include authentication, user accounts, OCR, cloud storage, LLM inference, or billing functionality. Tokenizer training is in scope only in the specific, bounded form defined above for the Custom Tokenizer's BPE sub-mode.

### Key Entities

- **Tokenization Result**: The outcome of one tokenize action. Attributes: original input text, source type (typed text, TXT upload, PDF upload), tokenizer mode and encoding used, ordered list of tokens, character count, word count, token count, tokens-per-word ratio, tokens-per-character ratio.
- **Token**: A single unit within a Tokenization Result. Attributes: index (position within the result), ID, token text.
- **Custom Vocabulary Entry**: An application-owned record mapping a token string to a deterministic ID for the Custom Tokenizer. Attributes: ID, token text, frequency count, status (newly created in the most recent operation vs. pre-existing).
- **BPE Training Session**: Represents the one currently trained (or in-progress) BPE model within the Custom Tokenizer's BPE sub-mode. Attributes: training text, requested target vocabulary size, achieved vocabulary size, status (idle, training, trained, failed).
- **BPE Vocabulary Entry**: A symbol known to the trained BPE tokenizer. Attributes: deterministic ID, symbol text, origin (base character vs. result of a merge).
- **BPE Merge Rule**: An ordered rule learned during BPE training. Attributes: order/step number, the pair of symbols merged, the resulting merged symbol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from entering text to viewing a complete token breakdown and statistics in under 3 seconds for typical inputs (a few paragraphs of text).
- **SC-002**: A user can successfully tokenize the contents of a valid TXT or text-based PDF file without manually retyping any content, for 100% of files that meet the supported type and size requirements.
- **SC-003**: 100% of invalid actions (empty input, unsupported file type, oversized file, corrupted/textless PDF, unsupported encoding) result in a clear, understandable error message rather than a silent failure or an unexplained technical message.
- **SC-004**: After every successful Custom Tokenizer operation, the vocabulary view reflects new tokens and updated frequency counts without the user needing to refresh or navigate away.
- **SC-005**: A user can reset the Custom Tokenizer vocabulary at any time and see the vocabulary view confirm the empty state immediately, with no leftover entries from before the reset.
- **SC-006**: Switching between Tiktoken and Custom Tokenizer modes never alters the other mode's vocabulary or output — verified by tokenizing the same text in both modes repeatedly with no cross-influence on results.
- **SC-007**: All core controls (input, mode selection, encoding selection, tokenize action, results, vocabulary, errors) remain visible and operable on both a typical desktop screen and a typical mobile-sized screen.
- **SC-008**: A user can train a BPE tokenizer end-to-end — entering training text, setting a target vocabulary size, starting training, and viewing the resulting vocabulary, merge rules, and per-step training details — without needing to understand the underlying algorithm beforehand.
- **SC-009**: Repeating BPE training with identical training text and an identical target vocabulary size produces an identical vocabulary and an identical ordered list of merge rules 100% of the time.
- **SC-010**: Tokenizing the same new text multiple times with the same trained BPE tokenizer produces an identical token sequence and identical token IDs 100% of the time, with no change to the trained vocabulary or merge rules as a side effect.
- **SC-011**: Users can tell, at all times, whether they are working in the BPE training flow or the BPE tokenization flow, without needing to guess.
- **SC-012**: 100% of invalid BPE actions (empty training text, invalid or out-of-range target vocabulary size, tokenizing before training) result in a clear, understandable message rather than a silent failure or an unexplained technical error.
- **SC-013**: For typical training inputs (a few paragraphs of text with a target vocabulary size under 500), BPE training completes and displays results within 5 seconds.

## Assumptions

- The Custom Tokenizer vocabulary is a single, application-wide store shared across all users of a running instance (no per-user or per-session isolation), consistent with the absence of accounts and a database.
- "Initial state" for the Custom Tokenizer vocabulary means empty (no pre-seeded tokens) until tokenization operations populate it.
- PDF text extraction supports only PDFs with embedded/selectable text; scanned or image-only PDFs are treated as containing no extractable text, since OCR is explicitly out of scope.
- This specification covers the complete initial product as a single feature, since the provided description defines the whole application rather than an incremental slice of an existing one.
- The BPE enhancement is an additive capability of the existing Custom Tokenizer (accessed via a new BPE sub-mode alongside the original, unchanged Simple sub-mode), not a replacement for it or for Tiktoken mode.
- BPE's base vocabulary is built from individual characters of the training text (not raw bytes), so that each merge step and resulting symbol remains human-readable in the UI, consistent with this tool's educational purpose.
- The BPE tokenizer holds exactly one trained model at a time, in memory only, for the lifetime of the running application; starting a new training run discards the previous model, and no history of prior training runs is retained.
- The deterministic tie-breaking rule used when multiple pairs share the same highest frequency during training is a fixed, consistent rule (e.g., preferring the lexicographically smallest pair), so identical inputs always yield identical results.
- Reasonable upper bounds are applied to keep BPE training responsive: training text is capped at 100,000 characters and target vocabulary size is capped at 5,000, each enforced with a clear error when exceeded.
- Characters encountered during BPE tokenization that never appeared in the training text are shown via a clearly labeled fallback (e.g., an "unknown symbol" placeholder) rather than being rejected outright or silently added to the vocabulary.
