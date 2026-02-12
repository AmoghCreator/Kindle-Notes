---
description: "Task list for highlight-note association feature"
---

# Tasks: Highlight-Note Association

**Input**: Design documents from `/specs/004-highlight-note-link/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested in feature specification - test tasks omitted

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Type definitions and utility infrastructure

- [X] T001 [P] Extend Note interface with optional associatedHighlightId field in src/lib/types.ts
- [X] T002 [P] Add HighlightNotePair interface to src/lib/types.ts
- [X] T003 [P] Add GroupedBookEntries interface to src/lib/types.ts
- [X] T004 [P] Add ParseStatistics extension with associatedNotes and standaloneNotes counts in src/lib/types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Parser logic and utility functions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create utility file src/lib/utils/note-grouping.ts with function stubs
- [X] T006 Implement isAssociatedNote type guard in src/lib/utils/note-grouping.ts
- [X] T007 Implement isValidAssociation validation function in src/lib/utils/note-grouping.ts
- [X] T008 Implement findAssociatedHighlight lookup function in src/lib/utils/note-grouping.ts
- [X] T009 Implement buildHighlightPairs function in src/lib/utils/note-grouping.ts
- [X] T010 Implement groupEntriesByAssociation function in src/lib/utils/note-grouping.ts
- [X] T011 Add association detection logic to parseKindleEntry loop in src/lib/parsers/kindle-parser.ts
- [X] T012 Update parser to track previousHighlight state during parsing in src/lib/parsers/kindle-parser.ts
- [X] T013 Add associatedNotes and standaloneNotes tracking to parser statistics in src/lib/parsers/kindle-parser.ts
- [X] T014 Update duplicate detection logic to preserve associatedHighlightId on update in src/lib/parsers/kindle-parser.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Associated Notes with Highlights (Priority: P1) 🎯 MVP

**Goal**: Display notes directly beneath their associated highlights with visual grouping

**Independent Test**: Import a Kindle file with highlight-note pairs and verify notes appear indented below highlights in book view

### Implementation for User Story 1

- [X] T015 [P] [US1] Add displayMode prop ('standalone' | 'associated') to NoteCard component in src/components/notes/NoteCard.astro
- [X] T016 [P] [US1] Add associatedHighlight prop to NoteCard component in src/components/notes/NoteCard.astro
- [X] T017 [US1] Add conditional CSS classes based on displayMode in NoteCard component in src/components/notes/NoteCard.astro
- [X] T018 [US1] Create CSS styles for .note-associated class with indentation in src/components/notes/NoteCard.astro
- [X] T019 [US1] Create CSS styles for .note-standalone class in src/components/notes/NoteCard.astro
- [X] T020 [US1] Add visual connector (border-left) for associated notes in src/components/notes/NoteCard.astro
- [X] T021 [US1] Update book detail page to use groupEntriesByAssociation in src/pages/books/[id].astro
- [X] T022 [US1] Render highlight-note pairs using grouped.pairs data in src/pages/books/[id].astro
- [X] T023 [US1] Pass associatedHighlight prop when rendering associated notes in src/pages/books/[id].astro
- [X] T024 [US1] Add ARIA labels for associated notes (accessibility) in src/components/notes/NoteCard.astro
- [X] T025 [US1] Add semantic HTML structure (<article> for highlight, <aside> for note) in src/components/notes/NoteCard.astro

**Checkpoint**: At this point, User Story 1 should be fully functional - users can see notes grouped with highlights

---

## Phase 4: User Story 2 - Distinguish Standalone Notes (Priority: P2)

**Goal**: Clearly differentiate standalone notes from associated notes in the UI

**Independent Test**: Import file with both associated and standalone notes, verify visual distinction is clear

### Implementation for User Story 2

- [X] T026 [P] [US2] Render standalone notes section after pairs in src/pages/books/[id].astro
- [X] T027 [P] [US2] Add visual separator between grouped pairs and standalone notes in src/pages/books/[id].astro
- [X] T028 [US2] Add section heading "Standalone Notes" if standaloneNotes exist in src/pages/books/[id].astro
- [X] T029 [US2] Ensure standalone notes render at full width (no indentation) in src/components/notes/NoteCard.astro
- [X] T030 [US2] Add distinct icon or visual indicator for standalone notes in src/components/notes/NoteCard.astro
- [X] T031 [US2] Verify location-based sorting works for both grouped and standalone entries in src/pages/books/[id].astro

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can distinguish note types

---

## Phase 5: User Story 3 - Handle Complex Sequences (Priority: P2)

**Goal**: Correctly handle edge cases like multiple highlights before note, consecutive notes, etc.

**Independent Test**: Import file with complex patterns (highlight-highlight-note, note-note-note) and verify correct associations

### Implementation for User Story 3

- [X] T032 [P] [US3] Add edge case handling for multiple consecutive highlights in parser in src/lib/parsers/kindle-parser.ts
- [X] T033 [P] [US3] Add edge case handling for note at beginning of file (before any highlights) in src/lib/parsers/kindle-parser.ts
- [X] T034 [P] [US3] Add edge case handling for highlight at end of file (no following note) in src/lib/parsers/kindle-parser.ts
- [X] T035 [US3] Reset previousHighlight to null after association or non-highlight entry in src/lib/parsers/kindle-parser.ts
- [X] T036 [US3] Add validation to ensure only last highlight gets associated with following note in src/lib/parsers/kindle-parser.ts
- [ ] T037 [US3] Add logging for association edge cases during parsing in src/lib/parsers/kindle-parser.ts
- [ ] T038 [US3] Create test fixture with complex sequences in tests/fixtures/complex-kindle-notes.txt
- [ ] T039 [US3] Add unit tests for complex sequence parsing in tests/unit/parser.test.js
- [X] T040 [US3] Verify edge case handling in UI rendering (highlights without notes, notes without highlights) in src/pages/books/[id].astro

**Additional Task** (Added during implementation):
- [X] T052 [US3] Fix book deduplication to use title+author instead of UUID in src/lib/server/storage.ts and src/pages/api/upload.ts

**Checkpoint**: All user stories should now be independently functional - system handles all edge cases

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T041 [P] Add responsive styles for mobile (reduce indentation) in src/components/notes/NoteCard.astro
- [X] T042 [P] Add hover states for associated note pairs in src/components/notes/NoteCard.astro
- [ ] T043 [P] Add keyboard navigation support for note pairs in src/components/notes/NoteCard.astro
- [ ] T044 [P] Create unit tests for grouping utilities in tests/unit/note-grouping.test.js
- [ ] T045 [P] Create integration test for association display in tests/integration/association-display.test.js
- [ ] T046 [P] Add E2E test for import and display flow in tests/e2e/highlight-note-association.spec.js
- [ ] T047 [P] Update existing parser tests to account for new association field in tests/unit/parser.test.js
- [ ] T048 [P] Add performance test for parsing 1000+ entries with associations in tests/unit/parser.test.js
- [ ] T049 [P] Document CSS customization options in specs/004-highlight-note-link/quickstart.md
- [ ] T050 Code review and refactoring across all modified files
- [ ] T051 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (Foundational) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Phase 2 (Foundational) and US1 (UI components) - Builds on US1 display
- **User Story 3 (P2)**: Depends on Phase 2 (Foundational) - Parser logic independent of US1/US2

### Within Each User Story

**User Story 1**:
- T015-T016 (component props) can run in parallel
- T017-T020 (CSS) depend on T015-T016
- T021-T023 (page integration) depend on T015-T020
- T024-T025 (accessibility) can run in parallel with T021-T023

**User Story 2**:
- All tasks (T026-T031) depend on US1 completion but can run in parallel with each other

**User Story 3**:
- T032-T034 (edge case handlers) can run in parallel
- T035-T037 (validation) depend on T032-T034
- T038-T040 (tests) depend on T035-T037

### Parallel Opportunities

**Phase 1 (Setup)**: All 4 type definition tasks can run in parallel

**Phase 2 (Foundational)**: 
- T006-T008 (utility functions) can run in parallel after T005
- T009-T010 (grouping functions) can run after T006-T008
- T011-T014 (parser changes) can run in parallel with T006-T010

**Phase 3 (US1)**:
- T015-T016 can run in parallel
- T018-T019 can run in parallel
- T024-T025 can run in parallel

**Phase 6 (Polish)**:
- T041-T043 (CSS enhancements) can run in parallel
- T044-T048 (all tests) can run in parallel
- T049 (docs) can run in parallel with tests

---

## Parallel Example: User Story 1 (P1)

```bash
# Developer A: Component props
git checkout -b us1-component-props
# Work on T015-T016 (NoteCard props)

# Developer B: Styling
git checkout -b us1-styling  
# Work on T018-T020 (CSS for associations)

# Developer C: Page integration
git checkout -b us1-page-integration
# Work on T021-T023 (book detail page)

# Merge order: A → B → C (or A+B together, then C)
```

---

## MVP Recommendation

**Minimum Viable Product**: User Story 1 only (Phase 1 + Phase 2 + Phase 3)

**Delivers**: 
- Notes appear grouped with highlights
- Visual indentation shows relationship
- Basic functionality for primary use case

**Tasks**: T001-T025 (25 tasks)

**Estimated Effort**: 2-3 days for solo developer, 1-2 days for team

**Why this MVP**: 
- Provides immediate user value (see notes with highlights)
- All foundational infrastructure in place
- Can deploy and gather feedback before edge cases
- User Stories 2 and 3 are enhancements, not blockers

---

## Full Feature Scope

**Complete implementation**: All user stories (Phase 1-6)

**Tasks**: T001-T051 (51 tasks)

**Estimated Effort**: 4-6 days for solo developer, 2-3 days for team

---

## Task Count Summary

- **Total Tasks**: 51
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 10 tasks (BLOCKS user stories)
- **User Story 1 (P1)**: 11 tasks
- **User Story 2 (P2)**: 6 tasks
- **User Story 3 (P2)**: 9 tasks
- **Polish Phase**: 11 tasks

**Parallelizable Tasks**: 23 tasks marked with [P]

**Independent Stories**: 3 user stories can be implemented independently after foundation

---

## Implementation Strategy

### Recommended Approach: Incremental Delivery

1. **Sprint 1**: Setup + Foundational (T001-T014)
   - Establishes infrastructure
   - Unblocks all user stories
   - ~1-2 days

2. **Sprint 2**: User Story 1 - MVP (T015-T025)
   - Core functionality
   - Deploy and gather feedback
   - ~1-2 days

3. **Sprint 3**: User Stories 2 & 3 (T026-T040)
   - Enhanced UX and edge cases
   - Can prioritize based on Sprint 2 feedback
   - ~1-2 days

4. **Sprint 4**: Polish (T041-T051)
   - Testing, optimization, documentation
   - ~1 day

### Alternative: Waterfall (Not Recommended)

Complete all tasks T001-T051 before any deployment. Slower feedback cycle, higher risk.

---

## Validation Checklist

After completing all tasks, verify:

- [ ] Kindle files with highlight-note pairs import correctly
- [ ] Notes appear indented below highlights in book view
- [ ] Standalone notes appear at full width
- [ ] Complex sequences (multiple highlights, multiple notes) handled correctly
- [ ] Associations preserved during re-import
- [ ] Mobile responsive design works (reduced indentation)
- [ ] Keyboard navigation functional
- [ ] ARIA labels correct for screen readers
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance target met (<30s for 1000 entries)
- [ ] Documentation updated (quickstart.md)
- [ ] Constitution compliance maintained (no violations)

---

## Success Metrics (from spec.md)

After deployment, measure:

- **SC-001**: Users identify note-highlight relationships in <2 seconds ✓
- **SC-002**: 95%+ correct associations from standard Kindle exports ✓
- **SC-003**: Users distinguish associated vs standalone in <1 second ✓
- **SC-004**: 60% reduction in time searching for related annotations ✓
- **SC-005**: Parse 1000+ entries in <30 seconds ✓
- **SC-006**: 100% association preservation during re-import ✓

---

## Notes

- **No test tasks included**: Feature spec did not request TDD approach
- **Tests in Polish phase**: Optional validation tests after implementation
- **Backward compatibility**: All changes are additive (optional field)
- **No migration required**: Existing data continues to work
- **Constitution compliant**: All 5 principles satisfied (see plan.md)
