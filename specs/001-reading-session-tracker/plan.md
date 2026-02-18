# Implementation Plan: Reading Session Tracker & Canonical Book Catalog

**Branch**: `001-reading-session-tracker` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-reading-session-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the current library header with a daily reading tracker, add a reading sessions page for create/browse flows, show streak gamification, and unify book identity through canonical matching for both Kindle imports and manual entries. Implementation remains static-first and client-side for canonical workflows: IndexedDB via Dexie for persistence, browser fetch for Google Books metadata, and no required project-owned backend service for matching/session state. The implemented upload flow now hydrates Dexie from import API responses and runs canonicalization post-upload, and manual matching now always surfaces candidate choices when available (auto-link only at >= 0.90).

## Technical Context

**Language/Version**: TypeScript (Astro 5.17.1), Node.js 18+  
**Primary Dependencies**: Astro, @astrojs/node, MiniSearch, Dexie, Google Books HTTP API (browser fetch)  
**Storage**: Server JSON import persistence (`data/books.json`, `data/notes.json`) plus browser IndexedDB via Dexie (`books`, `notes`, `readingSessions`, `canonicalBooks`, `bookAliases`, `syncMeta`) with post-upload hydration  
**Testing**: Vitest (unit/integration), Playwright (E2E), Astro check  
**Target Platform**: Modern browsers (desktop/mobile), static hosting
**Project Type**: Web application (static-first, client-side data layer)  
**Performance Goals**: Session create/list <100ms local p95 for 5k sessions; canonical suggestion render <1s p95; tracker summary computation <50ms after hydration  
**Constraints**: No required project-owned backend service for canonical/session state; graceful fallback on metadata outages; WCAG 2.1 AA compliance and explicit loading/error/empty states; upload reconciliation between server import and Dexie must be non-blocking but visible  
**Scale/Scope**: Single-user personal library, ~10-200 books, up to 20k notes, up to 5k reading sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First & User-Centric Design ✅ PASS

- Wireframe/user-flow artifact is required before implementation starts (tracked in tasks).
- Primary delivery remains user-facing: tracker header, sessions page, per-book session view.

### II. Keep It Simple (KISS) ✅ PASS

- One persistence model (Dexie/IndexedDB), one matching provider (Google Books), no extra service tier.
- Matching policy is explicit and threshold-based to prevent ad hoc heuristics.

### III. Minimal Backend, Maximum Frontend ✅ PASS

- Static-first architecture with no required feature backend.
- Canonical matching, streak logic, and persistence all stay client-side.

### IV. Security Without Complexity ✅ PASS

- Input validation for all user-entered fields and import payload normalization.
- Minimal data collection with explicit audit metadata on canonical link events.

### V. Intuitive & Self-Explanatory ✅ PASS

- Required loading states, actionable validation errors, and guided empty states are in scope.
- No hidden workflows for canonical conflict/fallback paths.

**Gate Status (Pre-Research):** ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-reading-session-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── openapi.yaml     # Logical service contract (client-side implementation)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
├── components/
│   ├── tracker/
│   │   └── ReadingTrackerHeader.astro
│   └── sessions/
│       ├── ReadingSessionForm.astro
│       └── ReadingSessionList.astro
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   ├── repositories/
│   │   │   ├── reading-sessions.ts
│   │   │   ├── canonical-books.ts
│   │   │   └── aliases.ts
│   │   └── seed.ts
│   ├── matching/
│   │   ├── canonicalize.ts
│   │   └── google-books-client.ts
│   ├── tracker/
│   │   ├── summary.ts
│   │   └── streak.ts
│   ├── parsers/
│   │   └── kindle-parser.ts
│   └── types.ts
└── pages/
    ├── index.astro
    ├── sessions.astro
    └── books/
        └── [id].astro

tests/
├── unit/
│   ├── streak.test.js
│   ├── canonicalize.test.js
│   └── parser-canonical-import.test.js
├── integration/
│   ├── dexie-reading-sessions.test.js
│   └── book-page-session-link.test.js
└── e2e/
    └── reading-tracker.spec.js
```

**Structure Decision**: Continue the existing single Astro app and implement all feature-domain operations client-side using Dexie repositories. Keep contracts logical and implementation static-first.

## Phase 0: Research Output

- [research.md](research.md) resolves persistence, thresholded matching policy, fallback behavior, and static-first constraints.
- Canonical matching trigger is explicit for both Kindle import and manual session flows.
- Migration strategy from legacy JSON datasets to IndexedDB is documented.

## Phase 1: Design & Contracts Output

- [data-model.md](data-model.md) defines Dexie-backed entities plus audit fields for canonical link traceability.
- [contracts/openapi.yaml](contracts/openapi.yaml) describes logical service contracts, including import canonicalization.
- [quickstart.md](quickstart.md) includes measurable validation steps tied to success criteria.

## Implementation Alignment Addendum (2026-02-19)

- Manual canonical matching UX is implementation-aligned to keep candidate selection available whenever search returns results; provisional creation is now an explicit user fallback path.
- Upload completion path is implementation-aligned to hydrate Dexie (`books`, `notes`) from API response payloads and execute canonicalization in the same user flow.
- Upload confirmation UX now includes canonicalization outcome counts (auto-matched / pending review / provisional) for traceability.

### Post-Design Constitution Re-check

### I. UI-First & User-Centric Design ✅ PASS

- Wireframe and journey artifacts are formalized as implementation prerequisites.

### II. Keep It Simple (KISS) ✅ PASS

- Matching thresholds and fallback rules are explicit; no multi-provider complexity.

### III. Minimal Backend, Maximum Frontend ✅ PASS

- No required feature backend, with client-side data lifecycle and synchronization boundary clearly defined.

### IV. Security Without Complexity ✅ PASS

- Explicit validation and audit metadata without custom security mechanisms.

### V. Intuitive & Self-Explanatory ✅ PASS

- Loading, empty, and error states are now required verification points.

**Gate Status (Post-Design):** ✅ PASS

## Complexity Tracking

> No constitution violations identified.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
