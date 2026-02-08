# Implementation Plan: Kindle Text File Parser

**Branch**: `002-kindle-txt-parser` | **Date**: February 8, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-kindle-txt-parser/spec.md`

## Summary

Add text file parsing capability to import Kindle exported notes/highlights with intelligent deduplication. Users can upload .txt files containing multiple books, highlights, and notes, which are parsed and stored in existing JSON/IndexedDB storage without creating duplicates. Parsed content integrates seamlessly with the existing library interface.

## Technical Context

**Language/Version**: TypeScript (JavaScript ES2022)  
**Primary Dependencies**: Astro 5.17.1, Dexie 4.3.0, Minisearch 7.2.0  
**Storage**: IndexedDB (via Dexie.js) with JSON-based models  
**Testing**: Vitest 4.0.18, Playwright 1.58.2  
**Target Platform**: Modern web browsers (static site deployment)
**Project Type**: Web application (frontend-heavy with static generation)  
**Performance Goals**: Parse 10k notes/highlights in <30 seconds, <200KB bundle impact  
**Constraints**: Client-side only processing, no backend dependencies, offline-capable  
**Scale/Scope**: Handle files up to 10MB, 10k individual entries, maintain responsive UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First & User-Centric Design ✅
- **Compliance**: Feature enhances existing upload UI with text file support
- **Evidence**: Builds on established FileUpload.astro component, integrates with library interface
- **User Journey**: Clear flow from file upload → parsing feedback → library view

### II. Keep It Simple (KISS) ✅
- **Compliance**: Reuses existing parser infrastructure, extends current storage patterns
- **Evidence**: Leverages established Dexie storage, builds on existing Note/Book models
- **Simplicity**: Client-side only, no new backend services required

### III. Minimal Backend, Maximum Frontend ✅
- **Compliance**: 100% client-side processing, no server dependencies
- **Evidence**: Text parsing in browser, IndexedDB storage, static site deployment unchanged
- **Frontend-Heavy**: All logic handled in TypeScript on the client

### IV. Security Without Complexity ✅
- **Compliance**: File processing is read-only, no external network calls during parsing
- **Evidence**: Local file processing only, validates input format, no sensitive data exposure
- **Standard Patterns**: Uses File API and existing validation utilities

### V. Intuitive & Self-Explanatory ✅
- **Compliance**: Extends familiar upload pattern, provides clear parsing feedback
- **Evidence**: Uses existing upload UI, shows progress during parsing, error messages for invalid files
- **Natural Flow**: Fits existing mental model of "upload file → see content in library"

**GATE RESULT**: ✅ PASS - No constitution violations identified

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── upload/
│       ├── FileUpload.astro          # Extend to support .txt files
│       └── TextFileParser.astro      # New: parsing progress UI
├── lib/
│   ├── parsers/
│   │   ├── kindle-parser.ts          # Extend existing parser
│   │   └── text-parser.ts            # New: dedicated text file parser
│   ├── storage/
│   │   ├── database.ts               # Extend existing Dexie setup
│   │   └── deduplication.ts          # New: duplicate detection logic
│   ├── types.ts                      # Extend with text parsing types
│   └── utils/
│       └── validation.ts             # Extend with text file validation
└── pages/
    └── library.astro                 # Display imported content (existing)

tests/
├── unit/
│   ├── parser.test.js                # Extend existing parser tests
│   └── text-parser.test.js           # New: text parser specific tests
├── integration/
│   └── text-import.test.js           # New: end-to-end text import tests
└── fixtures/
    └── sample-kindle-notes.txt       # New: test data files
```

**Structure Decision**: Extending existing Astro web application structure. New text parsing functionality integrates with established patterns: parsers extend existing parser infrastructure, storage builds on Dexie setup, UI components follow Astro component patterns. This maintains consistency and leverages existing code.

## Complexity Tracking

> **No constitution violations identified - this section left empty**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
