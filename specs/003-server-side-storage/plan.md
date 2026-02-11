# Implementation Plan: Server-Side Storage for Kindle Clippings

**Branch**: `003-server-side-storage` | **Date**: February 11, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-server-side-storage/spec.md`

## Summary

Remove client-side database (Dexie.js/IndexedDB) implementation and migrate to server-side file-based storage for Kindle clippings. All data will be stored in JSON files on the server and passed to Astro components for build-time rendering. Note locations will be preserved as stable identifiers for future user annotation features.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 18+)  
**Primary Dependencies**: Astro 5.17.1 (static site generator with SSR support), MiniSearch 7.2.0 (search - retained)  
**Dependencies to Remove**: Dexie.js 4.3.0 (IndexedDB wrapper, ~45KB client bundle)
**Storage**: File-based JSON storage in `/data` directory (books.json, notes.json)  
**Testing**: Vitest 4.0.18 (unit/integration), Playwright 1.58.2 (E2E)  
**Target Platform**: Web (server-rendered Astro site, Node.js server for uploads)
**Project Type**: Web application (Astro SSR with file-based backend)  
**Performance Goals**: 
- Upload processing: <5 seconds for files up to 10,000 notes
- Page load: <500ms for library pages (pre-rendered)
- Build time: <30 seconds for 1,000+ books
**Constraints**: 
- Bundle size reduction: Remove ~45KB Dexie.js from client
- Zero client-side database operations
- Note location must be preserved for future features
**Scale/Scope**: 
- Single user per deployment
- Support 10,000+ notes per upload
- 1,000+ books in library

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First & User-Centric Design ✅
- **Status**: PASS
- **Evidence**: Feature is driven by user experience improvement (faster page loads, no loading spinners). UI/UX remains unchanged from user perspective - upload and view workflows preserved.
- **Action**: Ensure upload feedback and error states remain clear during migration.

### II. Keep It Simple (KISS) ✅
- **Status**: PASS
- **Evidence**: Removing complex client-side database layer (Dexie.js) in favor of simple file-based storage. Reducing system complexity and client bundle size by 45KB.
- **Dependencies Removed**: 1 (Dexie.js)
- **Dependencies Added**: 0
- **Net Complexity**: REDUCED

### III. Minimal Backend, Maximum Frontend ✅
- **Status**: PASS
- **Evidence**: Backend scope limited to file I/O operations (read/write JSON). Build-time rendering moves work from runtime to build time. No new backend API endpoints beyond existing upload handler.
- **Backend Changes**: Simplified storage layer, existing upload endpoint enhanced

### IV. Security Without Complexity ✅
- **Status**: PASS
- **Evidence**: No security implications. File-based storage maintains same security posture as current implementation. No new authentication or data exposure vectors.

### V. Intuitive & Self-Explanatory ✅
- **Status**: PASS
- **Evidence**: User-facing functionality unchanged. Upload → View workflow remains identical. Performance improvements are transparent to users (faster = better UX).

**Overall Gate Status**: ✅ PASS - All constitution principles satisfied. Feature simplifies architecture while improving performance.

## Project Structure

### Documentation (this feature)

```text
specs/003-server-side-storage/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── interfaces.md    # API contracts for storage operations
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Astro web application structure
src/
├── components/
│   ├── notes/           # BookCard.astro, NoteCard.astro (updated to use server data)
│   ├── upload/          # FileUpload.astro (updated for server storage)
│   └── common/          # Shared components (unchanged)
├── layouts/
│   └── BaseLayout.astro # Main layout (unchanged)
├── lib/
│   ├── types.ts         # TypeScript interfaces (Book, Note with location IDs)
│   ├── parsers/         # Kindle parser (updated to preserve location data)
│   │   ├── kindle-parser.ts
│   │   └── text-file-parser-service.ts
│   ├── server/
│   │   └── storage.ts   # File-based storage operations (enhanced)
│   ├── storage/         # CLIENT-SIDE (TO BE REMOVED)
│   │   ├── database.ts  # ❌ DELETE - Dexie/IndexedDB
│   │   ├── books.ts     # ❌ DELETE - Client-side book operations
│   │   ├── notes.ts     # ❌ DELETE - Client-side note operations
│   │   ├── uploads.ts   # ❌ DELETE - Client-side upload tracking
│   │   └── deduplication.ts # ⚠️ MIGRATE to server/deduplication.ts
│   └── search/
│       └── index.ts     # MiniSearch integration (retained, fed server data)
├── pages/
│   ├── index.astro      # Home page (build-time data injection)
│   ├── library.astro    # Library page (build-time data injection)
│   ├── book.astro       # Book detail page (build-time data injection)
│   └── api/
│       ├── upload.ts    # Upload endpoint (enhanced for server storage)
│       ├── books.ts     # Books API (build-time data access)
│       └── notes.ts     # Notes API (build-time data access)
└── styles/
    └── kindle-theme.css # Styling (unchanged)

data/                    # Server-side storage directory
├── books.json           # All books data
├── notes.json           # All notes data
└── uploads.json         # Upload session tracking

tests/
├── unit/
│   └── parser.test.js   # Parser tests (updated for location preservation)
├── integration/
│   └── storage.test.js  # Server storage tests (updated)
└── e2e/
    └── upload.spec.js   # End-to-end upload flow (updated expectations)

public/
└── workers/
    └── kindle-parser-worker.js # ❌ DELETE if only used for client-side DB
```

**Structure Decision**: Astro web application with server-side file storage. Removing `/src/lib/storage/` directory entirely (client-side DB layer). Enhancing `/src/lib/server/storage.ts` for all data persistence. Components updated to receive data as props from Astro pages using build-time data loading.

## Complexity Tracking

**Status**: ✅ NO VIOLATIONS - Complexity tracking not needed.

This feature **reduces** complexity rather than adding it:
- Removes 1 dependency (Dexie.js)
- Eliminates client-side database abstraction layer
- Simplifies data flow (direct file I/O vs. IndexedDB API)
- Reduces client bundle by 45KB

No constitution violations to justify.

---

## Phase 0-1 Completion Summary

### Research Phase (Phase 0) ✅

**Completed**: [research.md](research.md)

Key decisions made:
1. **Build-time data injection**: Use Astro's `getStaticPaths()` and frontmatter imports
2. **File-based storage**: Simple JSON files with atomic writes
3. **Removal strategy**: Phased approach with feature flags
4. **Deduplication**: `bookId` + `location.start` composite key
5. **Performance**: In-memory caching for build optimization

All research questions resolved. No NEEDS CLARIFICATION markers remain.

### Design Phase (Phase 1) ✅

**Completed**:
- [data-model.md](data-model.md) - Core entities defined (Book, Note, Upload Session)
- [contracts/interfaces.md](contracts/interfaces.md) - 15 storage operations specified
- [quickstart.md](quickstart.md) - Developer implementation guide

**Key Design Decisions**:
- Note `location.start` serves as stable identifier for future annotations
- Server storage uses JSON files in `/data` directory
- Build-time caching via module-level variables
- Deduplication during upload processing
- Zero client-side database operations

### Constitution Re-Evaluation (Post-Design) ✅

All design decisions align with constitution:

**I. UI-First & User-Centric Design** ✅
- UI/UX unchanged from user perspective
- Upload and viewing workflows preserved
- Performance improvements transparent to users (faster loads)

**II. Keep It Simple (KISS)** ✅
- File-based storage simpler than IndexedDB
- Removed complex Dexie abstraction layer
- Direct JSON read/write operations
- Net reduction in code complexity

**III. Minimal Backend, Maximum Frontend** ✅
- Backend limited to file I/O (read/write JSON)
- Build-time rendering (work moved from runtime to build)
- Single upload endpoint (no new APIs)
- Pre-rendered HTML reduces runtime processing

**IV. Security Without Complexity** ✅
- No security implications
- Same security posture as current implementation
- No new authentication requirements
- File-based storage with standard Node.js permissions

**V. Intuitive & Self-Explanatory** ✅
- User experience unchanged
- Error handling preserved
- Upload feedback maintained
- Instant page loads (no loading states)

**Final Gate Status**: ✅✅ DOUBLE PASS - Both pre-research and post-design gates satisfied.

---

## Next Steps

The planning phase is complete. Generated artifacts:

1. ✅ **plan.md** - This file with technical context and constitution checks
2. ✅ **research.md** - Technology decisions and implementation patterns
3. ✅ **data-model.md** - Entity definitions and storage schema
4. ✅ **contracts/interfaces.md** - API contracts for storage operations
5. ✅ **quickstart.md** - Developer implementation guide
6. ✅ **Agent context updated** - Copilot instructions enhanced

**To proceed with implementation**:

```bash
# Generate task breakdown
/speckit.tasks

# This will create:
# - specs/003-server-side-storage/tasks.md
# - Atomic, testable implementation tasks
# - Clear acceptance criteria per task
```

**Branch**: `003-server-side-storage`  
**Status**: Ready for task breakdown and implementation
