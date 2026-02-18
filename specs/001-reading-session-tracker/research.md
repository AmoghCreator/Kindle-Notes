# Research: Reading Session Tracker & Canonical Book Standardization

**Feature**: 001-reading-session-tracker  
**Phase**: 0 (Research & Discovery)  
**Date**: 2026-02-17

## Overview

This document resolves design and integration decisions for daily reading-session tracking, streak gamification, and canonical book identity matching across Kindle imports and manual session entry.

All prior technical unknowns are resolved in this document, including the clarified static-first persistence choice (IndexedDB via Dexie).

---

## 1) Reading session persistence model

**Decision**: Persist reading sessions and canonical catalog records in browser IndexedDB using Dexie tables, keyed by canonical book ID.

**Rationale**:
- Satisfies static-first architecture with no required project-owned backend service.
- Provides structured queries and indexing for session timeline + streak computation.
- Improves client-side reliability compared with string-only storage approaches.

**Alternatives considered**:
1. `localStorage` only.
   - Rejected: weak query/index support and size limits for long-term use.
2. JSON files under `data/` as runtime persistence.
   - Rejected: implies server-side write path, conflicting with static-first constraint.
3. Project-owned backend database.
   - Rejected: explicitly out of scope per clarified requirement.

---

## 2) Canonical identity source for books

**Decision**: Use Google Books volume identity (`volumeId`) as the primary external canonical key when a confident match exists.

**Rationale**:
- User explicitly requested Google Books integration.
- Existing utility already uses Google Books API for cover lookup.
- `volumeId` provides stable cross-flow identity for both import and manual entry.

**Alternatives considered**:
1. Title+author only normalization.
   - Rejected: high collision/variant risk.
2. ISBN-only canonicalization.
   - Rejected: ISBN is often absent or inconsistent in user-provided data.
3. Multi-provider aggregation (OpenLibrary + Google).
   - Rejected for now: increased complexity and conflicting identities.

---

## 3) Matching strategy for imports and manual entry

**Decision**: Use confidence-based matching with thresholded auto-linking and user-confirmed fallback.

**Rationale**:
- Prevents unsafe automatic merges for similarly named books.
- Supports consistent behavior across both Kindle import and session-entry flows.
- Keeps user in control when confidence is low.

**Clarified trigger behavior**:
- Canonical matching is executed during Kindle import processing for each parsed book candidate before writing to Dexie.
- Canonical matching is also executed during manual reading-session entry when user searches/selects a book.

**Match policy (explicit thresholds)**:
- `score >= 0.90`: auto-link as `verified`.
- `0.70 <= score < 0.90`: show candidate to user and require confirmation.
- `score < 0.70`: create provisional canonical record as `unverified`.

**Suggested scoring weights**:
- Title similarity: 0.60
- Author similarity: 0.25
- ISBN/identifier agreement: 0.15

**Tie-breakers**:
1. Exact ISBN match wins.
2. Then highest title similarity.
3. Then user confirmation required if still ambiguous.

**Alternatives considered**:
1. Always auto-link top result.
   - Rejected: unacceptable false positive risk.
2. Always require manual confirmation.
   - Rejected: too much friction for common clean matches.
3. Fuzzy local-only matching without external lookup.
   - Rejected: does not satisfy required standardization quality.

---

## 4) Google Books outage behavior

**Decision**: Allow provisional book creation when lookup fails; mark record as `unverified` for later reconciliation.

**Rationale**:
- Keeps core task (logging reading sessions/importing notes) available offline or during API disruption.
- Preserves user trust by avoiding blocked workflows.

**Alternatives considered**:
1. Hard-fail all writes when lookup fails.
   - Rejected: poor UX and violates resilience goals.
2. Queue and defer all creates until lookup restores.
   - Rejected: adds queue complexity outside current scope.

---

## 5) Streak definition and calculation

**Decision**: Define streak as consecutive local-calendar days with at least one session; multiple sessions on one day count as one streak day.

**Rationale**:
- Aligns with user expectation for habit tracking.
- Handles multiple same-day entries without inflating streak count.
- Deterministic and easy to test.

**Alternatives considered**:
1. Session-count streak (each entry increments).
   - Rejected: gamification becomes noisy and misleading.
2. Page-count weighted streak.
   - Rejected: encourages gaming and adds ambiguity.
3. Weekly streak windows only.
   - Rejected: less motivating for daily habit feedback.

---

## 6) Home header replacement behavior

**Decision**: Replace current library header with tracker summary priority order: today session > yesterday session > most recent historical session > empty-state CTA.

**Rationale**:
- Directly maps to user request (“reading / read yesterday”).
- Gives immediate resume context and clear next action.

**Alternatives considered**:
1. Keep existing header and add tracker below.
   - Rejected: user asked for replacement.
2. Show only today’s data, otherwise blank.
   - Rejected: misses useful “yesterday/last session” context.

---

## 7) Service contract shape for static-first implementation

**Decision**: Define logical REST-style contracts in OpenAPI for client use, but implement operations in-browser via Dexie repositories and metadata adapters (no required project-owned backend service).

**Rationale**:
- Preserves clear, testable contracts without violating static-first constraints.
- Keeps architecture future-flexible for optional sync features without changing domain semantics.

**Alternatives considered**:
1. No formal contracts.
   - Rejected: increases ambiguity across components and tests.
2. GraphQL schema.
   - Rejected: unnecessary complexity for current CRUD/query needs.

---

## 8) Per-book reading session visibility

**Decision**: Add a “Reading Sessions” section to book detail pages by filtering sessions by canonical book ID.

**Rationale**:
- Meets requirement to show session entries on each related book page.
- Enables a unified story with notes/highlights and reading habit.

**Alternatives considered**:
1. Separate sessions-only page with no per-book embedding.
   - Rejected: fails required book-level visibility.
2. Link out only (no inline section).
   - Rejected: weaker UX and more navigation friction.

---

## 9) Migration and compatibility strategy

**Decision**: Use one-time client migration/hydration from existing JSON-shaped records into Dexie tables at first-run for this feature version.

**Rationale**:
- Preserves existing user data while moving to static-first IndexedDB persistence.
- Avoids mandatory backend migration process.

**Migration rules**:
1. If Dexie stores are empty and legacy data payload is present, hydrate `books`, `notes`, `canonicalBooks`, `readingSessions`, and `bookAliases`.
2. Generate `canonicalBookId` for legacy books lacking canonical metadata.
3. Record migration version in `syncMeta` to ensure idempotent migration.

**Alternatives considered**:
1. No migration, start fresh.
   - Rejected: unacceptable data loss risk.
2. Server-side migration script.
   - Rejected: conflicts with static-first/no required backend constraint.

---

## 10) Success criteria validation approach

**Decision**: Validate SC-001..SC-005 through quickstart instrumentation and deterministic test datasets.

**Rationale**:
- Keeps measurement local and reproducible without backend analytics.
- Supports release-readiness checks tied directly to specification outcomes.

**Validation approach**:
- SC-001: form completion timing using test harness stopwatch over 10 trials.
- SC-002: render assertions on tracker summary completeness across representative datasets.
- SC-003: duplicate consolidation checks on import/manual variant corpus.
- SC-004: streak-return proxy through repeat-entry scenario in 7-day simulated timeline.
- SC-005: per-book page assertions for full session visibility with linked notes.

---

## Final decision summary

- Canonical book identity: Google Books `volumeId` when confidence threshold is met.
- Fallback identity: local provisional canonical record marked `unverified`.
- Session persistence: Dexie-backed IndexedDB tables with canonical book references.
- Streak policy: consecutive day presence, day-level deduping.
- Header UX: tracker-first replacement with today/yesterday fallback priority.
- Canonical matching trigger: executed during Kindle import and manual session entry.
- Architecture: static-first client implementation with no required project-owned backend service.
- Matching thresholds: 0.90 auto-link, 0.70+ user-confirmation band, below 0.70 provisional.
- Migration: one-time client hydration from legacy JSON-shaped records into Dexie.
- Measurement: quickstart-driven validation tied to SC-001..SC-005.

No unresolved clarification items remain.
