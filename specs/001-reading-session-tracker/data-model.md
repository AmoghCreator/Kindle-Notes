# Data Model: Reading Session Tracker & Canonical Book Standardization

**Feature**: 001-reading-session-tracker  
**Phase**: 1 (Design)  
**Date**: 2026-02-17

## Overview

This model introduces reading-session tracking and canonical book identity fields that unify Kindle import books and manually selected books into a single catalog identity, persisted in browser IndexedDB via Dexie.

---

## Entity: CanonicalBookIdentity

Represents normalized catalog identity for a logical book.

| Field | Type | Required | Description |
|---|---|---|---|
| `canonicalBookId` | `string` | Yes | Primary internal canonical ID |
| `titleCanonical` | `string` | Yes | Standardized display title |
| `titleNormalized` | `string` | Yes | Search/matching normalized title |
| `authorsCanonical` | `string[]` | No | Standardized author names |
| `googleVolumeId` | `string` | No | Google Books volume identity |
| `isbn13` | `string` | No | Canonical ISBN-13 when available |
| `coverUrl` | `string` | No | Canonical cover image URL |
| `matchStatus` | `'verified' | 'unverified' | 'user-confirmed'` | Yes | Identity confidence state |
| `matchSource` | `'google-books' | 'manual' | 'import-fallback'` | Yes | Origin of canonical record |
| `createdAt` | `string` (ISO datetime) | Yes | Creation timestamp |
| `updatedAt` | `string` (ISO datetime) | Yes | Last update timestamp |

### Validation rules

1. `canonicalBookId` must be unique.
2. `titleCanonical` must be non-empty.
3. `matchStatus='verified'` requires either `googleVolumeId` or explicit user confirmation audit flag.
4. `googleVolumeId`, if present, should be unique across canonical records.

### IndexedDB table mapping

- Table: `canonicalBooks`
- Primary key: `canonicalBookId`
- Indexes: `googleVolumeId`, `titleNormalized`, `[titleNormalized+matchStatus]`

---

## Entity: ReadingSession

Represents one daily reading entry.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Session identifier |
| `sessionDate` | `string` (`YYYY-MM-DD`) | Yes | User-local reading day |
| `canonicalBookId` | `string` | Yes | Link to canonical book identity |
| `bookId` | `string` | No | Legacy/internal book reference for migration compatibility |
| `pageStart` | `number` | Yes | Starting page in session |
| `pageEnd` | `number` | Yes | Ending page in session |
| `insight` | `string` | No | Optional reflection |
| `durationMinutes` | `number` | No | Optional reading duration |
| `canonicalLinkAudit` | `CanonicalLinkAudit` | Yes | Audit metadata for canonical linkage decision |
| `createdAt` | `string` (ISO datetime) | Yes | Created timestamp |
| `updatedAt` | `string` (ISO datetime) | Yes | Last modified timestamp |

### Validation rules

1. `sessionDate` must be valid local date format (`YYYY-MM-DD`).
2. `pageStart >= 1` and `pageEnd >= pageStart`.
3. `insight` max length: 2000 characters.
4. `canonicalBookId` must reference an existing canonical identity.
5. Multiple sessions are allowed for the same `sessionDate`, but streak calculations dedupe by date.
6. `canonicalLinkAudit` must include at least source flow (`import` or `manual-entry`) and resolution mode (`auto`, `user-confirmed`, `provisional`).

### IndexedDB table mapping

- Table: `readingSessions`
- Primary key: `id`
- Indexes: `sessionDate`, `canonicalBookId`, `[canonicalBookId+sessionDate]`, `updatedAt`

### State transitions

`draft` (form client state) → `saved` (persisted) → `updated` (optional edit in future scope)

For this feature scope, persisted entries are created and listed; delete/edit can remain out-of-scope unless later added.

---

## Value Object: CanonicalLinkAudit

Captures auditable linkage details for session/book canonical resolution.

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceFlow` | `'kindle-import' | 'manual-entry'` | Yes | Originating workflow |
| `resolutionMode` | `'auto' | 'user-confirmed' | 'provisional'` | Yes | How canonical link was decided |
| `confidenceScore` | `number` (0..1) | No | Match score when available |
| `provider` | `'google-books' | 'none'` | Yes | Metadata provider used |
| `providerCandidateId` | `string` | No | External candidate identifier |
| `resolvedAt` | `string` (ISO datetime) | Yes | Resolution timestamp |

### Validation rules

1. `confidenceScore` is required when `provider='google-books'` and resolution is not provisional.
2. `resolutionMode='auto'` requires `confidenceScore >= 0.90`.
3. `resolutionMode='provisional'` requires either `confidenceScore < 0.70` or metadata unavailability reason in local event log.

---

## Entity: BookMatchCandidate

Represents metadata search candidate presented to users or import resolver.

| Field | Type | Required | Description |
|---|---|---|---|
| `candidateId` | `string` | Yes | Candidate identity (e.g., `volumeId`) |
| `title` | `string` | Yes | Candidate title |
| `authors` | `string[]` | No | Candidate authors |
| `coverUrl` | `string` | No | Candidate cover |
| `isbn13` | `string` | No | Candidate ISBN |
| `source` | `'google-books'` | Yes | Provider source |
| `confidence` | `number` (0..1) | Yes | Match confidence score |
| `selected` | `boolean` | No | User selection marker |

### Validation rules

1. `confidence` must be between 0 and 1.
2. `source` constrained to known providers.
3. `candidateId` must be present for selected candidate.

### Persistence note

`BookMatchCandidate` is transient UI/query data and is not required to be stored in IndexedDB.

---

## Entity: ReadingStreakSummary (derived)

Computed view entity (not necessarily persisted).

| Field | Type | Required | Description |
|---|---|---|---|
| `currentStreakDays` | `number` | Yes | Current consecutive-day streak |
| `longestStreakDays` | `number` | Yes | Historical max streak |
| `lastReadingDate` | `string` (`YYYY-MM-DD`) | No | Most recent day with any session |
| `streakStatus` | `'active' | 'broken' | 'none'` | Yes | Current streak state |
| `daysReadThisWeek` | `number` | Yes | Distinct reading days in trailing 7-day window |

### Calculation rules

1. Distinct dates are used (not raw session count).
2. `currentStreakDays` increments only if latest sequence includes today or yesterday boundary as active sequence.
3. Missing a calendar day breaks the current streak.

---

## Entity: UnifiedBookHistory (derived)

Combined view model for one canonical book page containing notes and reading sessions.

| Field | Type | Required | Description |
|---|---|---|---|
| `canonicalBookId` | `string` | Yes | Canonical identifier |
| `notes` | `Note[]` | Yes | Notes linked (directly or via mapped aliases) |
| `readingSessions` | `ReadingSession[]` | Yes | Sessions linked by canonical ID |
| `timeline` | `Array<UnifiedTimelineItem>` | Yes | Chronological merged events |

### Validation rules

1. `notes` and `readingSessions` must both be resolved through canonical mapping.
2. `timeline` ordering is deterministic by timestamp (descending for UI default).
3. Missing notes or sessions is allowed; missing both should render empty-state guidance.

---

## Relationships

1. `CanonicalBookIdentity` 1:N `ReadingSession`
2. Existing `Book` records should map to one `CanonicalBookIdentity` (1:1 target, with migration period tolerance)
3. `BookMatchCandidate` is transient and can result in creation/update of `CanonicalBookIdentity`

---

## Storage layout impact

- Browser persistence implemented in Dexie tables:
	- `canonicalBooks` (canonical identity records)
	- `bookAliases` (imported/manually-entered aliases mapped to canonical IDs)
	- `readingSessions` (session timeline)
	- `notes` and `books` (existing app tables; linked to canonical IDs)
	- `syncMeta` (migration/version metadata and lightweight audit event pointers)
- Existing JSON data may be used as one-time seed/import source into IndexedDB.

---

## Data integrity invariants

1. Every `ReadingSession.canonicalBookId` must resolve to exactly one canonical book record.
2. Canonical merging must preserve prior `bookId` linkage so existing notes remain discoverable.
3. A canonical record must never point to multiple conflicting `googleVolumeId` values.
4. Session dates are immutable as day keys for streak logic once persisted (edits can create clear re-computation paths if added later).
5. Kindle import flow must run canonical matching before final note/book persistence so imported notes inherit canonical linkage.
6. Every persisted reading session must contain canonical link audit metadata.

---

## Implementation Notes

### Dexie Schema (v1)

The following IndexedDB stores are defined in `src/lib/db/schema.ts`:

```typescript
version(1).stores({
  books:            '++id, title, author',
  notes:            '++id, bookId, type, createdAt',
  readingSessions:  '++id, sessionDate, canonicalBookId, [canonicalBookId+sessionDate], updatedAt',
  canonicalBooks:   'canonicalBookId, googleVolumeId, titleNormalized, [titleNormalized+matchStatus]',
  bookAliases:      '++id, normalizedKey, canonicalBookId, [normalizedKey+canonicalBookId]',
  syncMeta:         'key'
});
```

### Legacy Migration

One-time migration from `data/books.json` and `data/notes.json` into Dexie is handled by `src/lib/db/seed.ts`:

- `runLegacyHydration(legacyBooks, legacyNotes)` — bulk-inserts legacy data into `books` and `notes` tables
- `isMigrationComplete()` — checks for `syncMeta.key='legacy-hydration-version'` to prevent re-running
- Migration version is stored as a `syncMeta` record with key `'legacy-hydration-version'`

### Singleton Database Access

The database instance is managed in `src/lib/db/index.ts`:

- `getDB()` — returns the singleton `KindleNotesDB` instance (throws if not initialized)
- `initDB()` — creates the instance if needed (idempotent)
- `closeDB()` / `deleteDB()` — cleanup utilities for testing

### Repository Pattern

All data access goes through repository modules in `src/lib/db/repositories/`:

- `canonical-books.ts` — CRUD + `resolveOrCreateCanonical()` smart upsert
- `aliases.ts` — alias lookup/creation + `resolveCanonicalIdFromTitle()` chain
- `reading-sessions.ts` — session CRUD + date queries + streak data retrieval
- `unified-history.ts` — combined notes+sessions timeline for book detail pages
