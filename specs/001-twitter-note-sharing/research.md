# Research: Twitter-First Note Sharing Enhancements

**Feature**: 001-twitter-note-sharing  
**Phase**: 0 (Research & Discovery)  
**Date**: 2026-02-13

## Scope

This research resolves formatting, UX, and integration decisions needed for:

- Twitter-friendly note/highlight sharing
- Unified copy/share quote formatting with attribution
- Random suggestion card at top of index page with direct share

## Decision Log

### 1) Canonical Twitter-friendly format

- **Decision:** Use plain-text quote blocks with this order: quoted content first, attribution last (`— Book Title, Author` when author exists), preserving attribution during truncation.
- **Rationale:** This is readable, portable, and works with both Web Share and clipboard fallback without external APIs.
- **Alternatives considered:**
  - Hashtag-heavy templates (rejected: wastes character budget)
  - Attribution-first templates (rejected: weakens quote prominence)
  - Platform-specific rich-text formats (rejected: inconsistent rendering)

### 2) Associated highlight inclusion behavior

- **Decision:** When sharing a note, include associated highlight automatically if `associatedHighlightId` resolves to non-empty highlight content.
- **Rationale:** Delivers requested context while avoiding noisy blank highlight blocks.
- **Alternatives considered:**
  - Manual toggle every time (rejected: extra friction)
  - Always include even if empty (rejected: poor output quality)
  - Never include (rejected: violates FR-002)

### 3) Quote + attribution rules for copy actions

- **Decision:** Copy uses the same formatter as share, producing quote-wrapped text and attribution for both notes and highlights.
- **Rationale:** A single formatter prevents drift and ensures consistency across all entry points.
- **Alternatives considered:**
  - Separate copy/share formatters (rejected: high inconsistency risk)
  - Raw text copy only (rejected: violates FR-003/FR-004/FR-005)

### 4) Long text handling

- **Decision:** Apply safe truncation to quote sections first; preserve attribution line; add ellipsis (`…`) for truncated output.
- **Rationale:** Keeps share posts readable and source-identifiable.
- **Alternatives considered:**
  - Hard cut at 280 characters (rejected: breaks words/structure)
  - Drop attribution under pressure (rejected: violates attribution requirement)

### 5) Random suggestion strategy

- **Decision:** Select one random note/highlight from available content, with session-level short-term de-duplication (avoid immediate repeats where possible).
- **Rationale:** Reduces repetitive experience while keeping implementation simple.
- **Alternatives considered:**
  - Pure random each load (rejected: frequent repeats)
  - Daily fixed suggestion only (rejected: low variety)
  - Weighted personalization (rejected: complexity beyond scope)

### 6) Index page data loading pattern

- **Decision:** Compute suggestion from existing index data load (books + notes) in frontmatter; no mandatory new backend endpoint.
- **Rationale:** Aligns with frontend-first constitution principle and minimizes API surface.
- **Alternatives considered:**
  - Client-side fetch after render (rejected: extra loading state/network call)
  - New server endpoint as required path (rejected: unnecessary for MVP)

### 7) Feedback and accessibility behavior

- **Decision:** Copy/share actions must provide explicit success/failure feedback and retain keyboard/screen-reader friendly controls.
- **Rationale:** Required by FR-013 and constitution principle V.
- **Alternatives considered:**
  - Silent copy/share outcomes (rejected: ambiguous UX)
  - Icon-only unlabeled controls (rejected: accessibility risk)

## Canonical Formatting Templates

### A) Note with associated highlight

"{NOTE_TEXT}"  
"{HIGHLIGHT_TEXT}"  
— {BOOK_TITLE}{, AUTHOR_IF_AVAILABLE}

### B) Standalone highlight

"{HIGHLIGHT_TEXT}"  
— {BOOK_TITLE}{, AUTHOR_IF_AVAILABLE}

### C) Standalone note

"{NOTE_TEXT}"  
— {BOOK_TITLE}{, AUTHOR_IF_AVAILABLE}

## Clarification Status

All technical-context clarifications are resolved; no `NEEDS CLARIFICATION` markers remain.
