# Implementation Plan: Twitter-First Note Sharing Enhancements

**Branch**: `001-twitter-note-sharing` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-twitter-note-sharing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver a Twitter-first sharing experience by unifying note/highlight copy and share formatting, auto-including associated highlights in note sharing, and adding a random top-of-index suggestion card with direct sharing using the same canonical formatter.

## Technical Context

**Language/Version**: TypeScript (Astro 5.17.1), Node.js 18+  
**Primary Dependencies**: Astro, @astrojs/node, MiniSearch (existing only)  
**Storage**: Local JSON files (`data/books.json`, `data/notes.json`, `data/uploads.json`)  
**Testing**: Vitest (unit/integration), Playwright (E2E), Astro check  
**Target Platform**: Modern web browsers (desktop + mobile)
**Project Type**: Web application (frontend-first with minimal API endpoints)  
**Performance Goals**: Share text generation under 50ms per action; random suggestion visible in initial index render; no perceptible delay for copy/share feedback  
**Constraints**: No new runtime dependencies, preserve WCAG 2.1 AA accessibility patterns, keep backend logic minimal and stateless  
**Scale/Scope**: Personal libraries in range of 100 to 10,000 note/highlight items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First & User-Centric Design ✅ PASS

- Primary outcomes are UI-visible: share quality, quote formatting consistency, and top-of-index suggestion UX.
- User journeys map directly to UI surfaces in `NoteCard` and index page suggestion card.
- Responsive and accessible controls included in planned design and test scope.

### II. Keep It Simple (KISS) ✅ PASS

- Reuse existing browser share and clipboard APIs.
- Introduce a single canonical formatter used by both copy and share flows.
- Avoid dependency additions and over-abstracted data layers.

### III. Minimal Backend, Maximum Frontend ✅ PASS

- Suggestion selection can occur from already loaded note data on index.
- Share text generation is primarily frontend utility logic.
- Optional API contracts remain read-only and stateless if used.

### IV. Security Without Complexity ✅ PASS

- No auth changes or custom security design.
- No additional sensitive data collection.
- Existing validation boundaries and storage model retained.

### V. Intuitive & Self-Explanatory ✅ PASS

- Explicit success/failure feedback for copy/share actions.
- Consistent output format reduces user confusion.
- Empty-state behavior defined for no-suggestion cases.

**Gate Status (Pre-Research):** ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-twitter-note-sharing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── openapi.yaml     # REST contract for share preview + random suggestion
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── export/
│   │   ├── share-format.ts            # [ADD] canonical quote/attribution formatter
│   │   └── twitter-exporter.ts        # [MODIFY] enforce twitter-friendly formatting
│   ├── server/
│   │   └── storage.ts                 # [USE] existing source data for suggestion selection
│   └── types.ts                       # [OPTIONAL MODIFY] payload metadata fields
├── components/
│   ├── notes/
│   │   └── NoteCard.astro             # [MODIFY] route copy/share through formatter
│   └── sharing/
│       └── RandomSuggestionCard.astro # [ADD] top-of-index suggestion + share action
└── pages/
    ├── index.astro                    # [MODIFY] render random suggestion section
    └── api/
        ├── share-preview.ts           # [OPTIONAL ADD] formatted preview endpoint
        └── suggestions.ts             # [OPTIONAL ADD] random suggestion endpoint

tests/
├── unit/
│   ├── share-format.test.js           # [ADD] quote/attribution/truncation behavior
│   └── random-suggestion.test.js      # [ADD] deterministic random picker behavior
├── integration/
│   └── share-flow.test.js             # [ADD] note + associated highlight inclusion tests
└── e2e/
    └── random-suggestion-share.spec.js # [ADD/MODIFY] index quick-share interaction tests
```

**Structure Decision**: Continue with the existing single Astro project structure, adding one sharing utility module and one suggestion UI component while reusing existing storage and page composition patterns.

## Phase 0: Research Output

- [research.md](research.md) captures all decisions, rationale, and alternatives for:
  - Twitter-friendly quote templates
  - Unified copy/share formatter strategy
  - Associated highlight fallback behavior
  - Random suggestion anti-repeat UX and accessibility testing

All technical context clarifications are resolved; no `NEEDS CLARIFICATION` items remain.

## Phase 1: Design & Contracts Output

- [data-model.md](data-model.md) defines `ShareableItem`, `ShareTextPayload`, and `RandomSuggestion` view models.
- [contracts/openapi.yaml](contracts/openapi.yaml) defines REST contracts for share preview and random suggestion retrieval.
- [quickstart.md](quickstart.md) provides verification steps for all three user stories and edge cases.

### Post-Design Constitution Re-check

### I. UI-First & User-Centric Design ✅ PASS

- Design artifacts prioritize direct user outcomes on index and note cards.

### II. Keep It Simple (KISS) ✅ PASS

- Single formatter path for copy/share maintains low complexity.

### III. Minimal Backend, Maximum Frontend ✅ PASS

- Frontend-first implementation remains primary; endpoints are optional and stateless.

### IV. Security Without Complexity ✅ PASS

- No change to auth/security model; only existing content is reformatted for output.

### V. Intuitive & Self-Explanatory ✅ PASS

- Explicit toast feedback and empty states are part of required behavior.

**Gate Status (Post-Design):** ✅ PASS

## Complexity Tracking

> No constitution violations identified.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
