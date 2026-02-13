# Tasks: Twitter-First Note Sharing Enhancements

**Input**: Design documents from `/specs/001-twitter-note-sharing/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Included because the design package defines explicit test guidance and measurable success criteria for formatter behavior and random-suggestion sharing.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare folders and baseline files required by all user stories.

- [ ] T001 Create sharing utility barrel in src/lib/export/index.ts
- [ ] T002 [P] Create sharing component folder placeholder in src/components/sharing/.gitkeep
- [ ] T003 [P] Create unit test scaffold for sharing in tests/unit/share-format.test.js
- [ ] T004 [P] Create E2E test scaffold for suggestion sharing in tests/e2e/random-suggestion-share.spec.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core reusable logic that all user stories depend on.

**⚠️ CRITICAL**: Complete this phase before starting user stories.

- [ ] T005 Implement canonical quote/attribution formatter in src/lib/export/share-format.ts
- [ ] T006 [P] Add shared payload type definitions for formatter output in src/lib/types.ts
- [ ] T007 [P] Implement Twitter-oriented truncation and metadata helpers in src/lib/export/twitter-exporter.ts
- [ ] T008 Implement shared note+book lookup helper for share formatting in src/lib/export/share-format.ts
- [ ] T009 Document formatter edge-case behavior (empty highlight, missing author) in specs/001-twitter-note-sharing/quickstart.md

**Checkpoint**: Shared formatting pipeline is ready for story-specific integration.

---

## Phase 3: User Story 1 - Share Notes with Linked Highlight Context (Priority: P1) 🎯 MVP

**Goal**: Share a note in Twitter-friendly format with automatic associated-highlight inclusion and attribution.

**Independent Test**: From a note card, trigger share and verify output includes quoted note text, quoted linked highlight (if non-empty), and source book attribution.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add unit tests for note-plus-highlight share formatting in tests/unit/share-format.test.js
- [ ] T011 [US1] Add integration coverage for share output payload generation in tests/integration/share-flow.test.js

### Implementation for User Story 1

- [ ] T012 [US1] Wire note share action to canonical formatter in src/components/notes/NoteCard.astro
- [ ] T013 [US1] Implement associated-highlight auto-inclusion resolution in src/lib/export/share-format.ts
- [ ] T014 [US1] Add API-compatible share preview handler for notes in src/pages/api/share-preview.ts
- [ ] T015 [US1] Update note share fallback copy text to use canonical payload in src/components/notes/NoteCard.astro
- [ ] T016 [US1] Add explicit success/failure toast messaging for share generation outcomes in src/components/notes/NoteCard.astro

**Checkpoint**: User Story 1 is independently functional and can be demoed as MVP.

---

## Phase 4: User Story 2 - Copy Share-Ready Quotes for Highlights and Notes (Priority: P2)

**Goal**: Ensure copy actions for notes and highlights always produce quote-formatted text with attribution.

**Independent Test**: Copy one highlight and one note; verify clipboard payload for both follows quote + attribution template.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add unit tests for note/highlight copy payload formatting in tests/unit/share-format.test.js
- [ ] T018 [US2] Add integration tests for clipboard payload parity with share payload in tests/integration/share-flow.test.js

### Implementation for User Story 2

- [ ] T019 [US2] Route note copy action through canonical formatter in src/components/notes/NoteCard.astro
- [ ] T020 [US2] Route book-page copy action through canonical formatter in src/pages/book.astro
- [ ] T021 [US2] Apply consistent attribution ordering and quote wrapping for copy mode in src/lib/export/share-format.ts
- [ ] T022 [US2] Standardize copy success/error feedback messaging in src/components/notes/NoteCard.astro

**Checkpoint**: User Stories 1 and 2 both work independently with consistent formatting behavior.

---

## Phase 5: User Story 3 - Share Random Daily Suggestion from Home (Priority: P3)

**Goal**: Show a random highlight/note at top of index and allow direct sharing with the same canonical rules.

**Independent Test**: Open index page with data, verify top suggestion appears, and successfully share directly from that card.

### Tests for User Story 3

- [ ] T023 [P] [US3] Add unit tests for random suggestion selection and anti-repeat behavior in tests/unit/random-suggestion.test.js
- [ ] T024 [US3] Add E2E coverage for top-of-index quick share and fallback behavior in tests/e2e/random-suggestion-share.spec.js

### Implementation for User Story 3

- [ ] T025 [US3] Implement random suggestion selector utility in src/lib/export/random-suggestion.ts
- [ ] T026 [US3] Create random suggestion card component with direct share action in src/components/sharing/RandomSuggestionCard.astro
- [ ] T027 [US3] Render suggestion card at top of index page in src/pages/index.astro
- [ ] T028 [US3] Add stale/deleted suggestion re-roll handling in src/components/sharing/RandomSuggestionCard.astro
- [ ] T029 [US3] Add optional random suggestion API endpoint aligned to contract in src/pages/api/suggestions.ts

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, accessibility, and release-readiness checks.

- [ ] T030 [P] Run and fix Astro/type checks for touched sharing files in src/components/notes/NoteCard.astro
- [ ] T031 [P] Validate quickstart scenario outcomes and update verification notes in specs/001-twitter-note-sharing/quickstart.md
- [ ] T032 Finalize feature documentation and task traceability notes in specs/001-twitter-note-sharing/plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; defines MVP.
- **Phase 4 (US2)**: Depends on Phase 2; can proceed after or in parallel with US1 once shared formatter is stable.
- **Phase 5 (US3)**: Depends on Phase 2; can proceed independently of US2.
- **Phase 6 (Polish)**: Depends on completion of selected user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after Foundational phase.
- **US2 (P2)**: Depends on shared formatter from Foundational; independent from US3.
- **US3 (P3)**: Depends on shared formatter from Foundational; independent from US2.

### Within Each User Story

- Tests first (must fail before implementation).
- Utility/model updates before UI wiring.
- UI wiring before endpoint/edge-case completion.

---

## Parallel Opportunities

### US1

- T010 and T011 can run in parallel.
- T013 can run in parallel with T012, then merge in T014/T015.

### US2

- T017 and T018 can run in parallel.
- T019 and T020 can run in parallel once T021 behavior is agreed.

### US3

- T023 and T024 can run in parallel.
- T025 and T026 can run in parallel, then integrate via T027.

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently via quickstart and integration tests.
4. Demo/deploy MVP.

### Incremental Delivery

1. Deliver US1 (MVP share quality + associated highlight inclusion).
2. Deliver US2 (copy parity and attribution consistency).
3. Deliver US3 (random top suggestion with direct share).
4. Apply polish tasks and final verification.

### Team Parallelization

- Developer A: US1 implementation
- Developer B: US2 implementation
- Developer C: US3 implementation

All can proceed after Foundational phase completion.
