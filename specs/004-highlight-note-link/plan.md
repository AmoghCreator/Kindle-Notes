# Implementation Plan: Highlight-Note Association

**Branch**: `004-highlight-note-link` | **Date**: February 12, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-highlight-note-link/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable automatic association of Kindle notes with their corresponding highlights when a note immediately follows a highlight in the import sequence. Modify parser to detect sequential patterns and extend UI components to display associated pairs together visually. Store association metadata in existing JSON storage by extending Note type with optional `associatedHighlightId` field.

## Technical Context

**Language/Version**: TypeScript (ES2022+) via Astro 5.17.1  
**Primary Dependencies**: Astro (SSG framework), MiniSearch (client-side search)  
**Storage**: JSON files (`data/books.json`, `data/notes.json`, `data/uploads.json`)  
**Testing**: Vitest (unit tests), Playwright (E2E tests)  
**Target Platform**: Web (SSG with client-side hydration), Node.js 18+ for build
**Project Type**: Web application (frontend-heavy SSG with minimal API endpoints)  
**Performance Goals**: Parse 1000+ entries in <30s, render grouped notes in <100ms  
**Constraints**: Client-side bundle <200KB gzip, maintain offline-first functionality  
**Scale/Scope**: Single-user library, ~10-50 books, 500-5000 notes per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First & User-Centric Design ✅ PASS

- UI change (visual grouping of highlight-note pairs) is the primary deliverable
- User journey clearly defined: see associated notes immediately when viewing highlights
- Mobile-responsive design already established in existing components
- Accessibility maintained: semantic HTML structure for associations (e.g., `<details>`, nested lists)
- No backend-first approach—parser modifications serve UI needs

**Justification**: Feature starts with UI requirement (clubbing notes and highlights together) and works backward to determine parser changes needed.

### II. Keep It Simple (KISS) ✅ PASS

- No new dependencies required—uses existing parser and type system
- Simple data model extension: add optional `associatedHighlightId?: string` to Note type
- Association detection uses straightforward sequential logic (if type='note' follows type='highlight', link them)
- Reuses existing UI components (NoteCard, BookCard) with conditional rendering
- No complex abstractions—just optional property and display logic

**Justification**: Minimal changes to existing structures. Association is opt-in metadata, doesn't require schema migration or new storage patterns.

### III. Minimal Backend, Maximum Frontend ✅ PASS

- Zero backend changes—all logic in parser (runs server-side during build) and UI components
- Association detection happens during file parsing (already SSG build-time operation)
- Client-side rendering handles conditional display based on association property
- No new API endpoints required
- JSON storage pattern continues (no database needed)

**Justification**: Pure frontend/build-time feature. Backend surface area unchanged.

### IV. Security Without Complexity ✅ PASS

- No security implications—feature processes user's own data
- No new attack surface introduced
- Input validation remains in existing parser (already handles malformed Kindle exports)
- No authentication changes required
- Data remains local to user (no cross-user data exposure risk)

**Justification**: Feature operates on same trusted data source (Kindle export) with existing validation. No security-sensitive operations added.

### V. Intuitive & Self-Explanatory ✅ PASS

- Visual grouping makes association immediately obvious (indentation, borders, or nesting)
- No user configuration required—associations detected automatically
- Fallback behavior clear: notes without highlights display normally
- Empty states unchanged—existing patterns apply
- No additional UI complexity—just enhanced display of existing data

**Justification**: Feature improves intuitiveness by making implicit relationships (note comments on highlight) visually explicit. Zero learning curve.

**Overall Gate Status**: ✅ **PASS** — All 5 constitution principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-highlight-note-link/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── interfaces.md    # TypeScript interface definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── types.ts                     # [MODIFY] Add associatedHighlightId to Note interface
│   └── parsers/
│       └── kindle-parser.ts         # [MODIFY] Add association detection logic
├── components/
│   └── notes/
│       ├── NoteCard.astro           # [MODIFY] Support grouped display for associated notes
│       └── BookCard.astro           # [EXISTING] May need minor adjustments
├── pages/
│   └── books/
│       └── [id].astro               # [MODIFY] Pass association data to components
└── utils/
    └── note-grouping.ts             # [NEW] Helper functions for grouping logic

tests/
├── unit/
│   ├── parser.test.js               # [MODIFY] Add tests for association detection
│   └── note-grouping.test.js        # [NEW] Tests for grouping utilities
└── integration/
    └── association-display.test.js  # [NEW] E2E tests for UI rendering

data/
└── notes.json                       # [SCHEMA EXTEND] Notes now include optional associatedHighlightId
```

**Structure Decision**: Web application (Astro SSG with client-side hydration). Feature touches existing parser (`src/lib/parsers/kindle-parser.ts`), type definitions (`src/lib/types.ts`), and UI components (`src/components/notes/`). No new major directories needed—adds one utility file and extends existing structures.

## Complexity Tracking

> **No violations detected. Constitution check passed cleanly.**
