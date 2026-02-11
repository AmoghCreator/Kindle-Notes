# Tasks: Server-Side Storage for Kindle Clippings

**Branch**: `003-server-side-storage`  
**Input**: Design documents from `/specs/003-server-side-storage/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/interfaces.md, ✅ quickstart.md

**Tests**: Not explicitly requested in specification - focusing on implementation tasks

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Astro web application with structure:
- `src/` - Application source code
- `tests/` - Test files
- `data/` - Server-side JSON storage

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare project for server-side storage migration

- [ ] T001 Create data directory structure with data/ folder for JSON storage
- [ ] T002 [P] Update TypeScript types in src/lib/types.ts to include location field in Note interface
- [ ] T003 [P] Review and document existing storage operations in src/lib/server/storage.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement module-level caching in src/lib/server/storage.ts for build performance
- [ ] T005 [P] Add clearCache() function in src/lib/server/storage.ts
- [ ] T006 [P] Implement atomic file writes using temp files in src/lib/server/storage.ts
- [ ] T007 Implement getUniqueKey() function for note deduplication in src/lib/server/storage.ts
- [ ] T008 [P] Add findNoteByLocation() function in src/lib/server/storage.ts
- [ ] T009 Add updateBookNoteCount() function in src/lib/server/storage.ts
- [ ] T010 Create upload session tracking with createUploadSession() in src/lib/server/storage.ts
- [ ] T011 [P] Add updateUploadSession() function in src/lib/server/storage.ts
- [ ] T012 [P] Add error handling types (StorageError, ValidationError) in src/lib/server/storage.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload and View Kindle Clippings (Priority: P1) 🎯 MVP

**Goal**: Users can upload Kindle clippings and immediately see books and notes in library with server-side storage

**Independent Test**: Upload a clippings file via UI, navigate to library page, verify all books and notes display correctly

### Implementation for User Story 1

**Parser Updates**:
- [ ] T013 [P] [US1] Update parseKindleClippings() in src/lib/parsers/kindle-parser.ts to preserve location.start
- [ ] T014 [P] [US1] Add location extraction logic with regex in src/lib/parsers/kindle-parser.ts
- [ ] T015 [US1] Add warning logging for notes without location in src/lib/parsers/kindle-parser.ts
- [ ] T016 [US1] Ensure location field is included in Note objects returned by parser

**Storage Operations**:
- [ ] T017 [US1] Implement addNotesWithDeduplication() using location-based keys in src/lib/server/storage.ts
- [ ] T018 [US1] Add deduplication stats return (DeduplicationResult) in src/lib/server/storage.ts
- [ ] T019 [US1] Update saveNotes() to call clearCache() after write in src/lib/server/storage.ts
- [ ] T020 [US1] Update saveBooks() to call clearCache() after write in src/lib/server/storage.ts

**Upload API**:
- [X] T021 [US1] Update POST handler in src/pages/api/upload.ts to use addNotesWithDeduplication()
- [X] T022 [US1] Add upload session creation at upload start in src/pages/api/upload.ts
- [X] T023 [US1] Implement book note count updates after upload in src/pages/api/upload.ts
- [X] T024 [US1] Add upload session completion with stats in src/pages/api/upload.ts
- [X] T025 [US1] Add error handling with session status update in src/pages/api/upload.ts

**Library Page (Build-Time Data)**:
- [X] T026 [US1] Update library.astro to import server storage functions
- [X] T027 [US1] Add build-time data loading with getAllBooks() and getAllNotes() in src/pages/library.astro
- [X] T028 [US1] Compute note counts per book in library.astro frontmatter
- [X] T029 [US1] Pass book and noteCount as props to BookCard components in src/pages/library.astro

**Book Detail Page (Build-Time Data)**:
- [X] T030 [US1] Update book.astro to use getStaticPaths() for dynamic routes
- [X] T031 [US1] Load book data in getStaticPaths() using getAllBooks() in src/pages/book.astro
- [X] T032 [US1] Load notes using getNotesByBookId() in book.astro frontmatter
- [X] T033 [US1] Pass note data as props to NoteCard components in src/pages/book.astro

**Component Updates**:
- [X] T034 [P] [US1] Update BookCard.astro to receive book and noteCount as props (remove any DB calls)
- [X] T035 [P] [US1] Update NoteCard.astro to receive note as prop and display location if present
- [X] T036 [US1] Update FileUpload.astro success handling for server-side upload response

**Client-Side Database Removal**:
- [X] T037 [US1] Remove Dexie imports from any remaining components
- [X] T038 [US1] Delete src/lib/storage/database.ts file
- [X] T039 [US1] Delete src/lib/storage/books.ts file
- [X] T040 [US1] Delete src/lib/storage/notes.ts file
- [X] T041 [US1] Delete src/lib/storage/uploads.ts file
- [X] T042 [US1] Delete src/lib/storage/interface.ts file
- [X] T043 [US1] Delete src/lib/storage/deduplication.ts file (logic migrated to server)
- [X] T044 [US1] Delete entire src/lib/storage/ directory
- [X] T045 [US1] Delete public/workers/kindle-parser-worker.js if only used for client DB
- [X] T046 [US1] Remove dexie from dependencies in package.json
- [X] T047 [US1] Remove dexie from vite.optimizeDeps in astro.config.mjs
- [X] T048 [US1] Run npm install to clean dependencies

**Testing and Validation**:
- [ ] T049 [US1] Update parser unit tests in tests/unit/parser.test.js for location preservation
- [ ] T050 [US1] Update storage integration tests in tests/integration/storage.test.js for new server functions
- [ ] T051 [US1] Update E2E upload test in tests/e2e/upload.spec.js for server-side flow
- [ ] T052 [US1] Verify upload → library → book detail flow works end-to-end
- [ ] T053 [US1] Test with sample clippings file containing 100+ notes
- [ ] T054 [US1] Verify no client-side database errors in browser console

**Checkpoint**: User Story 1 complete - users can upload clippings and view them in library with zero client-side DB operations

---

## Phase 4: User Story 2 - Build-Time Rendering of Library Components (Priority: P2)

**Goal**: Library pages pre-rendered at build time with complete data, enabling instant page loads

**Independent Test**: Run `npm run build`, verify generated HTML contains complete book and note data without client-side hydration

### Implementation for User Story 2

**Build Optimization**:
- [ ] T055 [P] [US2] Implement getAllBooksForBuild() with caching in src/lib/server/storage.ts
- [ ] T056 [P] [US2] Implement getAllNotesForBuild() with caching in src/lib/server/storage.ts
- [ ] T057 [US2] Add module-level cache variables for build-time data in src/lib/server/storage.ts

**Library Page Optimization**:
- [ ] T058 [US2] Update library.astro to use cached build functions (getAllBooksForBuild)
- [ ] T059 [US2] Move note count computation to frontmatter (build time) in src/pages/library.astro
- [ ] T060 [US2] Add sorting logic for books in frontmatter (by lastModifiedAt) in src/pages/library.astro
- [ ] T061 [US2] Ensure no client-side data fetching or loading states in library.astro

**Book Detail Page Optimization**:
- [ ] T062 [US2] Update book.astro getStaticPaths() to use cached build function
- [ ] T063 [US2] Pre-compute note sorting in book.astro frontmatter
- [ ] T064 [US2] Verify all data passed as props (zero client-side queries) in src/pages/book.astro

**Home Page Updates**:
- [ ] T065 [P] [US2] Update index.astro to load recent notes at build time
- [ ] T066 [US2] Use getRecentNotes() function with build caching in src/pages/index.astro
- [ ] T067 [US2] Pass recent notes as props to components in src/pages/index.astro

**Search Integration**:
- [ ] T068 [US2] Update search initialization in src/lib/search/index.ts to accept server data
- [ ] T069 [US2] Remove any client-side DB queries from search implementation
- [ ] T070 [US2] Feed MiniSearch with build-time data passed from pages

**Performance Testing**:
- [ ] T071 [US2] Run build and measure build time (target: <30 seconds for 1,000 books)
- [ ] T072 [US2] Verify bundle size reduction (target: -45KB from Dexie removal)
- [ ] T073 [US2] Test page load performance (target: <500ms for library page)
- [ ] T074 [US2] Verify no loading spinners or skeleton states on initial load
- [ ] T075 [US2] Test with large dataset (1,000 books, 10,000 notes)

**Checkpoint**: User Story 2 complete - all pages pre-rendered with instant load times

---

## Phase 5: User Story 3 - Foundation for User Annotations (Priority: P3)

**Goal**: Establish location-based identifiers as stable references for future annotation features

**Independent Test**: Verify every note has location.start preserved, test deduplication across multiple uploads, confirm data structure supports future annotations store

### Implementation for User Story 3

**Data Model Validation**:
- [ ] T076 [P] [US3] Add validation in parser to ensure location is always extracted in src/lib/parsers/kindle-parser.ts
- [ ] T077 [P] [US3] Implement fallback unique key (content hash) for notes without location in src/lib/server/storage.ts
- [ ] T078 [US3] Add unit tests for getUniqueKey() with various note types

**Deduplication Testing**:
- [ ] T079 [US3] Test upload of same file twice - verify skipped count equals total notes
- [ ] T080 [US3] Test upload of file with overlapping notes - verify correct deduplication
- [ ] T081 [US3] Test notes without location - verify fallback deduplication works
- [ ] T082 [US3] Verify deduplication stats accuracy in upload response

**Location Persistence**:
- [ ] T083 [US3] Add NoteCard display of location information in src/components/notes/NoteCard.astro
- [ ] T084 [US3] Verify location persists across page navigation
- [ ] T085 [US3] Verify location survives build and rebuild cycles
- [ ] T086 [US3] Add data-location attribute to note cards for future annotation hooks

**Future Annotation Architecture**:
- [ ] T087 [US3] Document annotation data model in data-model.md (reference only, not implemented)
- [ ] T088 [US3] Verify location can serve as foreign key (unique within book)
- [ ] T089 [US3] Add placeholder for data/annotations.json structure (not implemented)
- [ ] T090 [US3] Document separation between core clippings and user annotations

**Edge Case Handling**:
- [ ] T091 [US3] Test and document behavior for notes with duplicate locations
- [ ] T092 [US3] Test and document behavior for notes without location data
- [ ] T093 [US3] Test and document behavior for bookmarks (no highlight text)
- [ ] T094 [US3] Add error handling for location parsing failures

**Checkpoint**: User Story 3 complete - location-based architecture ready for future annotation features

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [ ] T095 [P] Update README.md with server-side storage architecture
- [ ] T096 [P] Verify all documentation in specs/003-server-side-storage/ is accurate
- [ ] T097 Run full test suite (unit + integration + E2E)
- [ ] T098 Verify quickstart.md instructions work for new developers
- [ ] T099 [P] Check bundle size reports (verify -45KB reduction)
- [ ] T100 [P] Verify zero console errors on all pages
- [ ] T101 Performance audit with Lighthouse (target: >90 score)
- [ ] T102 Test upload with corrupted/malformed clippings files
- [ ] T103 Test upload with empty clippings file
- [ ] T104 Test upload with extremely large file (10,000+ notes)
- [ ] T105 Verify error messages are user-friendly
- [ ] T106 Code review and cleanup of any remaining TODOs
- [ ] T107 Final build and deploy test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP functionality
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion - Build optimization
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion - Can run parallel with US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for all functionality - MUST complete first
- **User Story 2 (P2)**: Builds on US1 (requires working server storage and components)
- **User Story 3 (P3)**: Builds on US1 (requires working deduplication and storage)
- **US2 and US3 can proceed in parallel** after US1 is complete

### Within Each User Story

**User Story 1**:
1. Parser updates (T013-T016) can start first
2. Storage operations (T017-T020) depend on parser
3. Upload API (T021-T025) depends on storage operations
4. Pages (T026-T033) can start after storage operations
5. Components (T034-T036) can update in parallel with pages
6. Client DB removal (T037-T048) only after all above complete
7. Testing (T049-T054) after implementation complete

**User Story 2**:
1. Build optimization (T055-T057) can start first
2. Page optimizations (T058-T070) depend on build functions
3. Performance testing (T071-T075) after all optimizations

**User Story 3**:
1. Data validation (T076-T078) can start first
2. Deduplication testing (T079-T082) after validation
3. Location persistence (T083-T086) in parallel with testing
4. Future architecture (T087-T090) can be done anytime
5. Edge cases (T091-T094) after core implementation

### Parallel Opportunities

**Setup Phase**: T002 and T003 can run in parallel

**Foundational Phase**: 
- T005 and T006 can run in parallel
- T008, T011, and T012 can run in parallel

**User Story 1**:
- T013 and T014 can run in parallel (parser updates)
- T034 and T035 can run in parallel (component updates)
- All deletion tasks (T038-T045) can run in parallel after T037

**User Story 2**:
- T055, T056, T057 can run in parallel
- T065 can run in parallel with T058-T064

**User Story 3**:
- T076 and T077 can run in parallel
- T087 and T089 can run in parallel

**Polish Phase**:
- T095, T096, T099, T100 can all run in parallel

---

## Parallel Example: User Story 1 - Parser & Storage

Developer A can work on parser updates (T013-T016) while Developer B works on storage operations (T017-T020). Once both complete, Developer C can work on upload API while Developer A updates pages and Developer B updates components.

---

## Implementation Strategy

### MVP First (Recommended)

**Week 1**: Phase 1 + Phase 2 (Setup + Foundation)
- Focus on core storage infrastructure
- Get server-side storage working

**Week 2-3**: Phase 3 (User Story 1)
- Complete upload and view functionality
- Remove client-side database
- **Deliverable**: Working MVP with server-side storage

**Week 4**: Phase 4 (User Story 2)
- Optimize build-time rendering
- Performance improvements
- **Deliverable**: Production-ready with instant page loads

**Week 5**: Phase 5 + Phase 6 (User Story 3 + Polish)
- Location architecture validation
- Final testing and polish
- **Deliverable**: Complete feature with future-ready architecture

### Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 9 tasks
- **Phase 3 (User Story 1)**: 42 tasks - MVP
- **Phase 4 (User Story 2)**: 21 tasks - Performance
- **Phase 5 (User Story 3)**: 19 tasks - Future architecture
- **Phase 6 (Polish)**: 13 tasks - Final validation

**Total**: 107 tasks

**Parallel Opportunities**: 25+ tasks can run in parallel across different files

### Success Validation

After completing all phases, verify:

✅ Upload processing: <5 seconds for 10,000 notes  
✅ Page load: <500ms for library  
✅ Build time: <30 seconds for 1,000 books  
✅ Bundle size: -45KB (Dexie removed)  
✅ Deduplication: 100% accuracy  
✅ Zero client-side DB errors  
✅ All tests passing  
✅ Location identifiers present on all notes
