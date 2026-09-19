<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: none (first concrete definition; template placeholders replaced)
- Added sections:
  - Core Principles I–VII (Simple Modular Architecture; Frontend Scope Boundary;
    Backend Authority & Thin Routes; File Input Handling; Dual Independent
    Tokenizer Services; Simplicity & No Unnecessary Infrastructure; Testability
    & Traceability)
  - Technology Stack (Section 2)
  - Development Workflow (Section 3)
  - Governance
- Removed sections: none
- Follow-up TODOs: none — all placeholders resolved from user-supplied input
-->

# Tokenizer Application Constitution

## Core Principles

### I. Simple Modular Architecture
The system MUST be built as a simple, modular React (frontend) + FastAPI
(backend) application with clear separation of responsibilities between the
two layers. Each layer owns a distinct set of concerns and MUST NOT reach
into the other's responsibilities. New functionality MUST be placed in the
layer that owns that concern rather than split across both.
**Rationale**: A clean frontend/backend boundary keeps the system easy to
reason about, test, and evolve, and prevents logic drift between layers.

### II. Frontend Scope Boundary
React owns UI rendering, user interactions, API calls to the backend,
loading states, error display, and visualization of results only. React
MUST NOT implement, embed, or duplicate any tokenizer logic, vocabulary
handling, or statistics computation — all such behavior MUST be requested
from the backend via API calls and rendered as received.
**Rationale**: Tokenization is a business-critical, stateful concern; letting
it leak into the frontend risks divergence from backend behavior and breaks
the single source of truth for tokenization results.

### III. Backend Authority & Thin Routes
FastAPI owns request validation, file processing, text extraction,
tokenization, statistics computation, vocabulary management, and shaping API
responses. All authoritative tokenization MUST happen in the backend. API
route handlers MUST remain thin: they validate input, invoke the appropriate
service, and return a response — they MUST NOT contain business logic, which
belongs in dedicated service modules.
**Rationale**: Thin routes with logic isolated in services keep endpoints
readable, testable in isolation, and safe to extend without regressions.

### IV. File Input Handling
The backend MUST support TXT and PDF as input formats. All file validation
(type, size, integrity) and text extraction MUST occur in the backend before
any tokenization step. The frontend MUST treat file handling as an opaque
upload operation and MUST NOT attempt client-side parsing or extraction of
file contents.
**Rationale**: Centralizing validation and extraction in the backend
guarantees consistent, secure handling regardless of client behavior.

### V. Dual Independent Tokenizer Services
The system MUST maintain two independent tokenizer services: Tiktoken and
Custom Tokenizer.
- Tiktoken's behavior and vocabulary MUST remain unchanged and externally
  authoritative (i.e., sourced from the official library, never modified or
  reimplemented).
- The Custom Tokenizer MUST maintain its own in-memory vocabulary, assign
  deterministic token IDs, and support dynamic creation of new tokens as
  input is processed.
- Both tokenizer implementations MUST be independently replaceable or
  extendable behind a common service interface, without requiring major
  changes to the frontend.
**Rationale**: Keeping the two tokenizers isolated and swappable lets the
system evolve or add tokenizers later without destabilizing the UI or the
other tokenizer's behavior.

### VI. Simplicity & No Unnecessary Infrastructure
No database is required; the Custom Tokenizer's vocabulary MUST remain
in-memory for the lifetime of the running backend process. Unnecessary
abstractions, dependencies, infrastructure, and duplicated logic MUST be
avoided. A new abstraction or dependency MUST NOT be introduced unless it is
required to satisfy a stated requirement.
**Rationale**: The application's scope does not warrant persistence or
architectural complexity; simplicity keeps the system easy to run, test, and
maintain.

### VII. Testability & Traceability
All requirements and behavior MUST be stated clearly enough to be testable
and traceable to specific implementation and test artifacts. Backend
behavior MUST be verified with pytest. Frontend behavior MUST have
appropriate automated tests covering user interactions, API integration, and
error/loading states.
**Rationale**: Traceable, tested requirements ensure that both tokenizer
services and the API contract behave predictably as the system changes.

## Technology Stack

- Frontend: React, responsible only for UI, interaction, API calls, and
  visualization (Principle II).
- Backend: FastAPI (Python), responsible for validation, processing,
  tokenization, statistics, and vocabulary management (Principle III).
- Tokenizer libraries: `tiktoken` for the Tiktoken service (used as-is,
  unmodified); a custom in-house implementation for the Custom Tokenizer
  service (Principle V).
- Persistence: none. The Custom Tokenizer vocabulary lives in backend
  process memory only (Principle VI).
- Testing: `pytest` for all backend tests; an automated frontend test
  framework appropriate to the chosen React tooling for all frontend tests
  (Principle VII).

## Development Workflow

- New tokenizer behavior, statistics, or vocabulary logic is added to
  backend services, never to frontend components (Principles II, III).
- API routes are reviewed for thinness: a route that contains conditional
  business logic, tokenization steps, or file parsing MUST be refactored to
  delegate that logic to a service module before merge.
- Every new backend requirement MUST include or update a corresponding
  pytest test; every new frontend-observable behavior MUST include or update
  a corresponding automated frontend test (Principle VII).
- Adding or changing a tokenizer service MUST NOT require restructuring the
  frontend beyond updating the API call/response handling already in place
  (Principle V).

## Governance

This constitution supersedes any other project practice or convention where
a conflict exists. All plans, specs, and implementation work for the
Tokenizer Application MUST comply with the principles above.

- **Amendment procedure**: Amendments are proposed by editing this file,
  describing the change and its rationale, and updating the Sync Impact
  Report at the top of the file. Amendments take effect once committed.
- **Versioning policy**: This constitution follows semantic versioning:
  - MAJOR: Backward-incompatible removal or redefinition of a principle or
    governance rule.
  - MINOR: A new principle or materially expanded guidance is added.
  - PATCH: Clarifications, wording, or non-semantic refinements.
- **Compliance review**: Every feature plan and code review MUST verify
  alignment with these principles before implementation is considered
  complete. Any deviation MUST be explicitly justified in the relevant
  spec/plan and, if it reveals a gap in this document, MUST be followed by
  an amendment.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
