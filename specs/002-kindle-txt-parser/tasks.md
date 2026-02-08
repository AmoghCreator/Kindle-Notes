# Tasks: Kindle Text File Parser

**Input**: Design documents from `/specs/002-kindle-txt-parser/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create sample Kindle text file fixtures in tests/fixtures/sample-kindle-notes.txt
- [x] T002 [P] Install and configure Vitest for text parser unit testing
- [x] T003 [P] Setup Web Worker configuration in astro.config.mjs for background parsing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extend existing types in src/lib/types.ts with ImportSession, ParsedTextEntry, DeduplicationResult interfaces
- [x] T005 [P] Create base text parser class in src/lib/parsers/text-parser.ts with enhanced pattern matching
- [x] T006 [P] Extend Dexie database schema in src/lib/storage/database.ts for import sessions and deduplication tracking
- [x] T007 Create deduplication service in src/lib/storage/deduplication.ts with multi-layer matching algorithms
- [x] T008 [P] Create Web Worker script for background parsing in public/workers/kindle-parser-worker.js
- [x] T009 [P] Extend existing validation utilities in src/lib/utils/validation.ts for text file format validation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Import Kindle Notes File (Priority: P1) 🎯 MVP

**Goal**: Users can upload text files and have books, highlights, and notes automatically parsed and stored

**Independent Test**: Upload a Kindle notes text file and verify books, highlights, and notes are extracted and stored correctly

### Implementation for User Story 1

- [x] T010 [P] [US1] Create TextFileParserService class in src/lib/parsers/text-file-parser-service.ts
- [x] T011 [P] [US1] Create ImportSessionService class in src/lib/storage/import-session-service.ts for session management
- [ ] T012 [US1] Implement parseTextFile method with streaming and chunked processing (depends on T010, T008)
- [ ] T013 [US1] Implement text entry extraction with enhanced regex patterns for book metadata and note content
- [ ] T014 [US1] Add progress tracking and callback system for real-time parsing updates
- [ ] T015 [US1] Create TextFileParser Astro component in src/components/upload/TextFileParser.astro for parsing progress UI
- [ ] T016 [US1] Extend FileUpload.astro component to accept .txt files and integrate with text parser
- [ ] T017 [US1] Add error handling for malformed text files with graceful degradation
- [ ] T018 [US1] Implement storage integration to save parsed books and notes to IndexedDB via existing storage service

**Checkpoint**: At this point, User Story 1 should be fully functional - users can import text files and see content in their library

---

## Phase 4: User Story 2 - Duplicate Detection and Prevention (Priority: P1)

**Goal**: Prevent duplicate entries when importing the same content multiple times

**Independent Test**: Import the same file twice and verify no duplicate entries are created

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create DeduplicationIndex class in src/lib/storage/deduplication-index.ts for fast duplicate lookups
- [ ] T020 [P] [US2] Implement exact match detection using composite keys (bookId:location:type:textHash)
- [ ] T021 [P] [US2] Implement fuzzy text similarity calculation using normalized text comparison
- [ ] T022 [US2] Create conflict resolution UI component in src/components/upload/ConflictResolver.astro
- [ ] T023 [US2] Integrate deduplication service with text file parser to check each parsed entry
- [ ] T024 [US2] Implement content update logic for same location with different text
- [ ] T025 [US2] Add user prompt system for ambiguous matches requiring manual decision
- [ ] T026 [US2] Extend ImportSessionService to track deduplication statistics and decisions
- [ ] T027 [US2] Add duplicate prevention to storage service with cross-session deduplication

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - imports prevent duplicates

---

## Phase 5: User Story 3 - View Parsed Notes in Library (Priority: P2)

**Goal**: Display imported books, highlights, and notes in the existing library interface

**Independent Test**: Import notes and navigate to library to see books and notes displayed correctly

### Implementation for User Story 3

- [ ] T028 [P] [US3] Extend BookCard.astro component to show import source indicators
- [ ] T029 [P] [US3] Extend NoteCard.astro component to display original location and timestamp metadata
- [ ] T030 [US3] Add import session filtering to library.astro page for viewing content by import
- [ ] T031 [US3] Create import history page in src/pages/import-history.astro to list all import sessions
- [ ] T032 [US3] Add rollback functionality to ImportSessionService for undoing imports
- [ ] T033 [US3] Enhance search functionality in src/lib/search/index.ts to include imported content metadata
- [ ] T034 [US3] Add visual indicators in library UI to distinguish imported vs manually created content
- [ ] T035 [US3] Create import summary modal component to show results after successful import

**Checkpoint**: All user stories should now be independently functional - complete text file import workflow

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Add comprehensive error messages and user guidance for common import issues
- [ ] T037 [P] Implement progress persistence to resume interrupted imports
- [ ] T038 Code cleanup and refactoring of parser services for maintainability
- [ ] T039 [P] Add unit tests for text parsing logic in tests/unit/text-parser.test.js
- [ ] T040 [P] Add unit tests for deduplication algorithms in tests/unit/deduplication.test.js
- [ ] T041 [P] Add integration tests for end-to-end text import workflow in tests/integration/text-import.test.js
- [ ] T042 [P] Add E2E tests for text file upload and library integration in tests/e2e/text-import.spec.js
- [ ] T043 Performance optimization for large file processing and memory management
- [ ] T044 Accessibility improvements for import UI components (WCAG 2.1 AA compliance)
- [ ] T045 Run quickstart.md validation with real import workflows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Builds on US1/US2 but should be independently testable

### Within Each User Story

- Core parsing implementation (T010-T018) before deduplication (T019-T027)
- UI components after service implementation
- Error handling after core functionality
- Storage integration after parsing logic

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each story, tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all foundational services for User Story 1 together:
Task: "Create TextFileParserService class in src/lib/parsers/text-file-parser-service.ts"
Task: "Create ImportSessionService class in src/lib/storage/import-session-service.ts"
Task: "Create TextFileParser Astro component in src/components/upload/TextFileParser.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently - users can import text files
5. Deploy/demo basic text import capability

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - basic import!)
3. Add User Story 2 → Test independently → Deploy/Demo (duplicate prevention!)
4. Add User Story 3 → Test independently → Deploy/Demo (full integration!)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core parsing)
   - Developer B: User Story 2 (deduplication)
   - Developer C: User Story 3 (UI integration)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US2/US3] labels map tasks to specific user stories for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Leverage existing Astro components and Dexie storage patterns
- Maintain client-side only architecture (no backend dependencies)