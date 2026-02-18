# Tasks: Reading Session Tracker & Canonical Book Catalog

**Input**: Design documents from `/specs/001-reading-session-tracker/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No explicit TDD/test-first requirement was requested in the specification, so test tasks are not included in this plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add required dependencies, UX design artifact prerequisites, and baseline feature structure.

- [X] T001 Add Dexie runtime dependency in package.json
- [X] T002 Create UX wireframe artifact for tracker + sessions flow in specs/001-reading-session-tracker/checklists/ui-wireframes.md
- [X] T003 Create user journey map for daily session + canonical matching flow in specs/001-reading-session-tracker/checklists/user-journeys.md
- [X] T004 Create Dexie schema scaffold in src/lib/db/schema.ts
- [X] T005 [P] Create Dexie bootstrap helper in src/lib/db/index.ts
- [X] T006 [P] Create feature repository exports scaffold in src/lib/db/repositories/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core client-side data foundation that blocks all user stories.

**⚠️ CRITICAL**: No user story work should start before this phase is complete.

- [X] T007 Define `ReadingSession`, `CanonicalBookIdentity`, `CanonicalLinkAudit`, and `UnifiedBookHistory` types in src/lib/types.ts
- [X] T008 Implement IndexedDB table definitions and indexes (`books`, `notes`, `readingSessions`, `canonicalBooks`, `bookAliases`, `syncMeta`) in src/lib/db/schema.ts
- [X] T009 Implement one-time legacy hydration/migration flow with version marker in src/lib/db/seed.ts
- [X] T010 Implement canonical book repository base operations in src/lib/db/repositories/canonical-books.ts
- [X] T011 [P] Implement alias repository base operations in src/lib/db/repositories/aliases.ts
- [X] T012 [P] Implement reading session repository base operations in src/lib/db/repositories/reading-sessions.ts
- [X] T013 Implement Google Books browser client wrapper with outage-safe fallback in src/lib/matching/google-books-client.ts
- [X] T014 Implement canonical match scoring policy (0.90 auto, 0.70–0.89 confirm, <0.70 provisional) in src/lib/matching/canonicalize.ts
- [X] T015 Implement canonical link audit recording helpers in src/lib/matching/audit.ts
- [X] T016 Implement shared session and canonical-input validation utilities in src/lib/utils/validation.ts
- [X] T017 Implement UI state contract helpers (loading/error/empty) in src/lib/utils/ui-state.ts

**Checkpoint**: Foundation ready — user stories can now proceed.

---

## Phase 3: User Story 1 - Log daily reading quickly (Priority: P1) 🎯 MVP

**Goal**: Let users create and browse daily reading sessions with required validation and optional insight.

**Independent Test**: Open the sessions page, create a valid entry, confirm it appears in reverse chronological order, and verify invalid input is rejected.

### Implementation for User Story 1

- [X] T018 [US1] Create reading sessions page shell in src/pages/sessions.astro
- [X] T019 [P] [US1] Build session entry form component in src/components/sessions/ReadingSessionForm.astro
- [X] T020 [P] [US1] Build sessions timeline list component in src/components/sessions/ReadingSessionList.astro
- [X] T021 [US1] Implement create/list/query methods with canonical audit persistence in src/lib/db/repositories/reading-sessions.ts
- [X] T022 [US1] Wire form submit and validation flow to Dexie persistence in src/components/sessions/ReadingSessionForm.astro
- [X] T023 [US1] Wire reverse-chronological list rendering in src/components/sessions/ReadingSessionList.astro
- [X] T024 [US1] Add loading, empty, and actionable error states for session create/list in src/pages/sessions.astro
- [X] T025 [US1] Compose sessions page with form + list + UX guidance states in src/pages/sessions.astro

**Checkpoint**: User Story 1 is complete and independently usable.

---

## Phase 4: User Story 2 - See reading context on the library home (Priority: P1)

**Goal**: Replace the library header with a tracker summary showing today/yesterday/latest session context.

**Independent Test**: Seed sessions across dates and verify header priority behavior (today > yesterday > latest > empty CTA).

### Implementation for User Story 2

- [X] T026 [US2] Create tracker header component in src/components/tracker/ReadingTrackerHeader.astro
- [X] T027 [US2] Implement tracker session selection helper (today > yesterday > latest) in src/lib/tracker/summary.ts
- [X] T028 [US2] Replace existing homepage hero header with tracker component in src/pages/index.astro
- [X] T029 [P] [US2] Add tracker empty-state CTA linking to sessions page in src/components/tracker/ReadingTrackerHeader.astro
- [X] T030 [P] [US2] Add responsive tracker styles for mobile and desktop in src/components/tracker/ReadingTrackerHeader.astro
- [X] T031 [US2] Add tracker loading and error fallback states in src/components/tracker/ReadingTrackerHeader.astro

**Checkpoint**: User Story 2 is complete and independently usable.

---

## Phase 5: User Story 3 - Keep one canonical book catalog (Priority: P2)

**Goal**: Ensure canonical matching runs for both Kindle import and manual session entry using Google Books metadata with safe fallback.

**Independent Test**: Import Kindle notes and add manual sessions for title variants, then verify a single canonical identity is used.

### Implementation for User Story 3

- [X] T032 [P] [US3] Implement canonical resolve/create repository methods in src/lib/db/repositories/canonical-books.ts
- [X] T033 [P] [US3] Implement alias-to-canonical mapping persistence in src/lib/db/repositories/aliases.ts
- [X] T034 [US3] Integrate canonicalization into Kindle import parsing flow in src/lib/parsers/kindle-parser.ts
- [X] T035 [US3] Apply canonical book assignment and audit metadata during upload import pipeline in src/components/upload/FileUpload.astro
- [X] T036 [US3] Add metadata search/autocomplete behavior for manual entry in src/components/sessions/ReadingSessionForm.astro
- [X] T037 [US3] Persist manual candidate selection with confidence band handling in src/components/sessions/ReadingSessionForm.astro
- [X] T038 [US3] Implement provisional canonical record fallback for low-confidence/unavailable provider cases in src/lib/matching/canonicalize.ts
- [X] T039 [US3] Add canonical conflict-resolution UI messaging for user-confirmation band matches in src/components/sessions/ReadingSessionForm.astro

**Checkpoint**: User Story 3 is complete and independently usable.

---

## Phase 6: User Story 4 - Track motivation with streaks and per-book history (Priority: P3)

**Goal**: Show streak gamification and render book-specific reading session history.

**Independent Test**: Log sessions across consecutive days and confirm streak values; open a book page and verify only linked sessions appear.

### Implementation for User Story 4

- [X] T040 [US4] Implement streak calculation utilities in src/lib/tracker/streak.ts
- [X] T041 [US4] Add streak summary data retrieval in src/lib/db/repositories/reading-sessions.ts
- [X] T042 [US4] Render streak metrics in tracker header UI in src/components/tracker/ReadingTrackerHeader.astro
- [X] T043 [US4] Add canonical-book session filter helper in src/lib/db/repositories/reading-sessions.ts
- [X] T044 [US4] Implement unified notes+sessions history selector by canonical book ID in src/lib/db/repositories/unified-history.ts
- [X] T045 [US4] Add reading sessions section to book detail page in src/pages/books/[id].astro
- [X] T046 [US4] Display unified book history timeline with empty-state guidance in src/pages/books/[id].astro

**Checkpoint**: User Story 4 is complete and independently usable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and release-readiness checks.

- [X] T047 [P] Document feature usage notes for sessions + canonical behavior in README.md
- [X] T048 [P] Document Dexie table shape, migration notes, and audit fields in specs/001-reading-session-tracker/data-model.md
- [X] T049 Add accessibility acceptance checklist results (keyboard, headings, contrast) in specs/001-reading-session-tracker/checklists/requirements.md
- [X] T050 Add success-criteria measurement results (SC-001..SC-005) in specs/001-reading-session-tracker/quickstart.md
- [X] T051 Run full quickstart verification and capture final consistency adjustments in specs/001-reading-session-tracker/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all story work.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and uses US1 session data.
- **Phase 5 (US3)**: Depends on Phase 2; integrates with US1 form/import flows.
- **Phase 6 (US4)**: Depends on Phase 2 and requires US1 session persistence plus canonical mapping from US3 for unified history.
- **Phase 7 (Polish)**: Depends on completion of all desired user stories.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after Foundational; no dependency on other stories.
- **US2 (P1)**: Can start after Foundational; reads session records created by US1 flows.
- **US3 (P2)**: Can start after Foundational; integration touchpoints in US1 form/import surfaces.
- **US4 (P3)**: Requires session data from US1 and canonical mappings from US3 for complete unified history behavior.

### Parallel Opportunities

- Setup: `T005` and `T006` can run in parallel after `T004`.
- Foundational: `T011` and `T012` can run in parallel after schema/types.
- US1: `T019` and `T020` can run in parallel.
- US2: `T029` and `T030` can run in parallel after tracker base exists.
- US3: `T032` and `T033` can run in parallel; then UI integration tasks proceed.
- Polish: `T047` and `T048` can run in parallel.

---

## Parallel Example: User Story 1

- Run in parallel:
  - `T019` Build session entry form in src/components/sessions/ReadingSessionForm.astro
  - `T020` Build sessions timeline list in src/components/sessions/ReadingSessionList.astro

---

## Parallel Example: User Story 3

- Run in parallel:
  - `T032` Canonical resolve/create repository in src/lib/db/repositories/canonical-books.ts
  - `T033` Alias mapping repository in src/lib/db/repositories/aliases.ts

---

## Parallel Example: User Story 2

- Run in parallel:
  - `T029` Add tracker empty-state CTA in src/components/tracker/ReadingTrackerHeader.astro
  - `T030` Add responsive tracker styles in src/components/tracker/ReadingTrackerHeader.astro

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US1)
4. Validate US1 independently from sessions page behavior

### Incremental Delivery

1. Deliver MVP with US1.
2. Add US2 to replace homepage header with tracker context.
3. Add US3 to unify canonical identity across import/manual flows.
4. Add US4 for streak gamification and per-book history.
5. Finish with Phase 7 polish and quickstart validation.
