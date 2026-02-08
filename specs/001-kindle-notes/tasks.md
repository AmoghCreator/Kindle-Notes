# Tasks: Kindle Notes Website

**Input**: Design documents from `/specs/001-kindle-notes/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are included for critical user journeys but are not mandatory per constitution's simplicity principles.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Static Web App**: `src/`, `tests/` at repository root
- **Build Output**: `public/` for static assets
- **Component Organization**: `src/components/[feature]/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Astro setup with Kindle-inspired foundation

- [x] T001 Initialize Astro project with TypeScript in project root directory
- [x] T002 [P] Install core dependencies: dexie (45KB), minisearch (25KB) in package.json
- [x] T003 [P] Configure astro.config.mjs for static output and bundle optimization
- [x] T004 [P] Setup tsconfig.json with path aliases for @/ imports
- [x] T005 [P] Create project directory structure per plan.md in src/
- [x] T006 [P] Setup Vitest configuration in vitest.config.ts for unit testing
- [x] T007 [P] Configure Playwright for E2E testing in playwright.config.ts
- [x] T008 [P] Create Kindle-inspired design system in src/styles/kindle-theme.css
- [x] T009 Create core TypeScript types in src/lib/types.ts from data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Setup IndexedDB database schema with Dexie in src/lib/storage/database.ts
- [ ] T011 [P] Create base storage service interface in src/lib/storage/interface.ts
- [ ] T012 [P] Implement core validation utilities in src/utils/validation.ts
- [ ] T013 [P] Create error handling framework in src/utils/errors.ts
- [ ] T014 [P] Setup MiniSearch index configuration in src/lib/search/index.ts
- [ ] T015 [P] Create responsive layout components in src/components/layout/
- [X] T016 [P] Implement loading states and error boundaries in src/components/common/
- [X] T017 Create base Astro page template in src/layouts/BaseLayout.astro

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Import & Organize Kindle Notes (Priority: P1) 🎯 MVP

**Goal**: Users upload Kindle files and see notes organized by book/page with clear navigation

**Independent Test**: Upload valid Kindle export → verify parsing → see organized book/note groups

### Tests for User Story 1

- [X] T018 [P] [US1] E2E test for file upload flow in tests/e2e/upload.spec.js
- [X] T019 [P] [US1] Unit tests for Kindle parser in tests/unit/parser.test.js
- [X] T020 [P] [US1] Integration test for storage operations in tests/integration/storage.test.js

### Implementation for User Story 1

- [X] T021 [P] [US1] Create Book entity with CRUD operations in src/lib/storage/books.ts
- [X] T022 [P] [US1] Create Note entity with CRUD operations in src/lib/storage/notes.ts
- [X] T023 [P] [US1] Create Upload entity for tracking imports in src/lib/storage/uploads.ts
- [X] T024 [US1] Implement Kindle file parser (.txt format) in src/lib/parsers/kindle-parser.ts
- [X] T025 [US1] Create file upload component with drag-drop in src/components/upload/FileUpload.astro
- [X] T026 [US1] Create book display component in src/components/notes/BookCard.astro
- [X] T027 [US1] Create note display component in src/components/notes/NoteCard.astro
- [X] T028 [US1] Implement upload page with progress feedback in src/pages/index.astro
- [X] T029 [US1] Create library organization page in src/pages/library.astro
- [ ] T030 [US1] Add error handling for malformed files and display user-friendly messages
- [ ] T031 [US1] Implement deduplication logic during import process

**Checkpoint**: At this point, users can import files and browse organized notes independently

---

## Phase 4: User Story 2 - Find Notes Fast (Search & Filter) (Priority: P2)

**Goal**: Users quickly find notes via search with filters by book, page, date, tags

**Independent Test**: Search keywords in imported notes → see highlighted results with filters applied

### Tests for User Story 2

- [ ] T032 [P] [US2] E2E test for search functionality in tests/e2e/search.spec.js
- [ ] T033 [P] [US2] Unit tests for search indexing in tests/unit/search.test.js

### Implementation for User Story 2

- [ ] T034 [P] [US2] Implement search service with MiniSearch in src/lib/search/search-service.ts
- [ ] T035 [P] [US2] Create search interface component in src/components/search/SearchBox.astro
- [ ] T036 [P] [US2] Create filter components (book, date, tags) in src/components/search/FilterPanel.astro
- [ ] T037 [US2] Create search results component with highlighting in src/components/search/SearchResults.astro
- [ ] T038 [US2] Implement search page with filters in src/pages/search.astro
- [ ] T039 [US2] Add pagination for search results
- [ ] T040 [US2] Implement real-time search with debouncing for performance
- [ ] T041 [US2] Add search suggestions and auto-complete functionality

**Checkpoint**: At this point, users can search and filter their notes efficiently

---

## Phase 5: User Story 3 - One-Click Share (Twitter & Instagram Story) (Priority: P3)

**Goal**: Users instantly share notes as Twitter messages or Instagram Story images

**Independent Test**: Select note → generate Twitter text/Instagram image → verify format and attribution

### Tests for User Story 3

- [ ] T042 [P] [US3] E2E test for sharing workflow in tests/e2e/sharing.spec.js
- [ ] T043 [P] [US3] Unit tests for Twitter formatting in tests/unit/twitter-export.test.js
- [ ] T044 [P] [US3] Unit tests for Instagram image generation in tests/unit/instagram-export.test.js

### Implementation for User Story 3

- [ ] T045 [P] [US3] Create Twitter message formatter in src/lib/export/twitter-exporter.ts
- [ ] T046 [P] [US3] Create Instagram image generator using Canvas API in src/lib/export/instagram-exporter.ts
- [ ] T047 [P] [US3] Create share button component in src/components/sharing/ShareButton.astro
- [ ] T048 [US3] Create share modal with format selection in src/components/sharing/ShareModal.astro
- [ ] T049 [US3] Implement attribution settings in share options
- [ ] T050 [US3] Add copy-to-clipboard functionality for Twitter messages
- [ ] T051 [US3] Add download functionality for Instagram images
- [ ] T052 [US3] Handle text truncation with intelligent breaks for Twitter limits

**Checkpoint**: At this point, users can share their notes to social platforms

---

## Phase 6: User Story 4 - Browse, Edit, and Annotate (Priority: P3)

**Goal**: Users browse, edit notes, add tags/annotations, and save changes

**Independent Test**: Edit note text → add tags → verify persistence and searchability

### Tests for User Story 4

- [ ] T053 [P] [US4] E2E test for note editing in tests/e2e/editing.spec.js
- [ ] T054 [P] [US4] Unit tests for tag management in tests/unit/tags.test.js

### Implementation for User Story 4

- [ ] T055 [P] [US4] Create note editor component in src/components/notes/NoteEditor.astro
- [ ] T056 [P] [US4] Create tag management component in src/components/notes/TagManager.astro
- [ ] T057 [US4] Implement auto-save functionality for note edits
- [ ] T058 [US4] Create note detail page with editing in src/pages/notes/[id].astro
- [ ] T059 [US4] Add confirmation dialogs for destructive actions
- [ ] T060 [US4] Implement bulk operations (delete, tag multiple notes)
- [ ] T061 [US4] Update search index when notes are modified

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, PWA features, and final UX refinements

- [ ] T062 [P] Add service worker for offline functionality in public/sw.js
- [ ] T063 [P] Implement PWA manifest for installable experience in public/manifest.json
- [ ] T064 [P] Optimize bundle size and code splitting across all pages
- [ ] T065 [P] Add keyboard shortcuts for power users throughout the application
- [ ] T066 [P] Implement dark mode toggle in Kindle theme
- [ ] T067 [P] Add accessibility improvements (ARIA labels, focus management)
- [ ] T068 [P] Create comprehensive error boundaries and fallback states
- [ ] T069 [P] Add analytics tracking for user interactions (privacy-friendly)
- [ ] T070 [P] Performance monitoring and Lighthouse score optimization
- [ ] T071 Run quickstart.md validation and update documentation
- [ ] T072 Security review for client-side data handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on core user stories (US1-US3 minimum) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent but uses data from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses notes from US1, may integrate with US2 search
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Uses and modifies data from US1

### Parallel Opportunities

Within each phase:
- All tasks marked [P] can run in parallel
- Different user stories (Phase 3-6) can be worked on simultaneously
- Tests can be written in parallel with implementation

**MVP Definition**: Phase 3 (User Story 1) delivers a working Kindle notes organizer

---

## Implementation Strategy

### Development Approach
1. **MVP First**: Complete US1 for immediate value
2. **Incremental Delivery**: Each user story adds independent functionality
3. **Parallel Development**: Multiple stories can be developed simultaneously
4. **Quality Gates**: Tests ensure each story works independently

### Bundle Size Monitoring
- Current commitment: 95KB (Astro + Dexie + MiniSearch)
- Available: 105KB for application code
- Monitor during implementation to stay under 200KB target

### Performance Checkpoints
- After US1: Verify upload and organization performance
- After US2: Ensure search speed <100ms for 1k+ notes  
- After US3: Test image generation performance
- Before Polish: Full Lighthouse audit for 90+ score

**Total Tasks**: 72 tasks organized by user story for independent implementation and testing