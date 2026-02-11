# Data Model: Server-Side Storage for Kindle Clippings

**Feature**: 003-server-side-storage  
**Phase**: 1 - Design  
**Date**: February 11, 2026  
**Storage**: Server-side JSON files in `/data` directory

## Overview

This data model defines the structure for server-side storage of Kindle clippings. All data is persisted in JSON files and loaded at build time for Astro page generation. The model emphasizes location-based identifiers to support future user annotation features.

## Core Entities

### Book

Represents a book or document from which Kindle clippings were taken.

**Storage**: `/data/books.json` (array of Book objects)

**Attributes**:
```typescript
interface Book {
  id: string;                    // Unique identifier (generated from title + author)
  title: string;                 // Book title
  author: string;                // Book author(s)
  noteCount: number;             // Cached count of associated notes
  tags?: string[];               // User-defined tags (future feature)
  createdAt: Date;               // First time book was added
  lastModifiedAt: Date;          // Last time notes were added/modified
  coverUrl?: string;             // Book cover image URL (future feature)
}
```

**Unique Key**: `id` (derived from `${sanitize(title)}-${sanitize(author)}`)

**Relationships**:
- One-to-Many with Note (via `bookId` foreign key)

**Validation Rules**:
- `title` is required, non-empty string
- `author` is required, non-empty string
- `noteCount` must be >= 0
- `createdAt` must be <= `lastModifiedAt`

**Business Rules**:
- `noteCount` is computed from associated notes, not user-editable
- `lastModifiedAt` updated whenever notes are added for this book
- `id` generation must be deterministic for deduplication

**Example**:
```json
{
  "id": "atomic-habits-james-clear",
  "title": "Atomic Habits",
  "author": "James Clear",
  "noteCount": 42,
  "tags": ["productivity", "habits"],
  "createdAt": "2026-02-01T10:30:00Z",
  "lastModifiedAt": "2026-02-10T15:45:00Z"
}
```

---

### Note

Represents an individual highlight, note, or bookmark from a Kindle book. **Critical**: The `location` field serves as the stable identifier for future user annotations.

**Storage**: `/data/notes.json` (array of Note objects)

**Attributes**:
```typescript
interface Note {
  id: string;                    // Unique identifier (generated)
  bookId: string;                // Foreign key to Book
  type: 'highlight' | 'note' | 'bookmark'; // Type of clipping
  text: string;                  // Highlighted text or note content
  location: {                    // CRITICAL for future annotations
    start: number;               // Starting location (Kindle position)
    end?: number;                // Ending location (if range)
  };
  page?: number;                 // Page number (if available)
  dateAdded: Date;               // When user created this on Kindle
  createdAt: Date;               // When imported to our system
  lastModifiedAt: Date;          // Last time note was updated
  tags?: string[];               // User-defined tags (future feature)
  shareHistory?: ShareRecord[];  // Sharing history (future feature)
}

interface ShareRecord {
  sharedAt: Date;
  platform: string;
  recipient?: string;
}
```

**Unique Key**: Composite of `bookId` + `location.start`  
**Rationale**: Location within a book is unique in Kindle format. This enables:
- Deduplication across multiple uploads
- Future user annotations using location as foreign key
- Stable reference for comments/supplements

**Relationships**:
- Many-to-One with Book (via `bookId`)
- Foundation for future One-to-Many with UserAnnotation (via `location.start`)

**Validation Rules**:
- `bookId` must reference an existing Book
- `type` must be one of the enum values
- `text` is required for highlights and notes, optional for bookmarks
- `location.start` is required and must be > 0
- `dateAdded` must be <= `createdAt`

**Business Rules**:
- Notes without location data must generate fallback unique key (content hash)
- Duplicate detection based on `bookId` + `location.start`
- `lastModifiedAt` updated on any field changes (future annotation edits)

**Example**:
```json
{
  "id": "note-abc123",
  "bookId": "atomic-habits-james-clear",
  "type": "highlight",
  "text": "You do not rise to the level of your goals. You fall to the level of your systems.",
  "location": {
    "start": 1234,
    "end": 1245
  },
  "page": 27,
  "dateAdded": "2026-01-15T08:20:00Z",
  "createdAt": "2026-02-01T10:30:00Z",
  "lastModifiedAt": "2026-02-01T10:30:00Z"
}
```

---

### Upload Session

Tracks file upload operations for debugging and deduplication reporting.

**Storage**: `/data/uploads.json` (array of UploadSession objects)

**Attributes**:
```typescript
interface UploadSession {
  id: string;                    // Unique identifier
  filename: string;              // Original filename
  fileSize: number;              // File size in bytes
  status: 'processing' | 'completed' | 'failed'; // Upload status
  startedAt: Date;               // Upload start time
  completedAt?: Date;            // Upload completion time
  stats: {
    booksAdded: number;          // New books discovered
    booksUpdated: number;        // Existing books with new notes
    notesAdded: number;          // New notes added
    notesSkipped: number;        // Duplicate notes skipped
    parseErrors: number;         // Notes that failed to parse
  };
  errorMessage?: string;         // Error details if status = 'failed'
}
```

**Unique Key**: `id` (UUID generated at upload start)

**Relationships**:
- Informational only, no foreign key relationships

**Validation Rules**:
- `status` must be one of the enum values
- `completedAt` required if status is 'completed' or 'failed'
- `stats.notesAdded` + `stats.notesSkipped` should equal total parsed notes

**Business Rules**:
- Session created immediately on upload start
- Stats computed during upload processing
- Historical record kept for user reference and debugging

**Example**:
```json
{
  "id": "upload-789xyz",
  "filename": "My Clippings.txt",
  "fileSize": 524288,
  "status": "completed",
  "startedAt": "2026-02-10T15:40:00Z",
  "completedAt": "2026-02-10T15:40:03Z",
  "stats": {
    "booksAdded": 3,
    "booksUpdated": 5,
    "notesAdded": 127,
    "notesSkipped": 45,
    "parseErrors": 0
  }
}
```

---

## Future Extension: User Annotation (Out of Scope)

**Design Foundation**: The current data model supports future user annotations without requiring data migration.

**Planned Structure** (reference only, not implemented now):
```typescript
interface UserAnnotation {
  id: string;
  noteId: string;              // Foreign key to Note
  bookId: string;              // Foreign key to Book
  noteLocation: number;        // PRIMARY KEY: links to Note.location.start
  annotationType: 'comment' | 'supplement' | 'tag';
  content: string;
  createdAt: Date;
  lastModifiedAt: Date;
}
```

**Storage Separation**: User annotations will be stored in `/data/annotations.json`, separate from core Kindle clippings data. This enables:
- Original clippings remain immutable
- User content can be cleared/reset independently
- Easy export of "original vs. annotated" versions

---

## Storage Format

### File Structure

```text
data/
├── books.json           # All books (array)
├── notes.json           # All notes (array)
├── uploads.json         # Upload history (array)
└── annotations.json     # Future: user annotations
```

### JSON Schema

**books.json**:
```json
[
  { "id": "...", "title": "...", "author": "...", ... },
  { "id": "...", "title": "...", "author": "...", ... }
]
```

**notes.json**:
```json
[
  { "id": "...", "bookId": "...", "type": "highlight", "text": "...", "location": { "start": 1234 }, ... },
  { "id": "...", "bookId": "...", "type": "note", "text": "...", "location": { "start": 5678 }, ... }
]
```

---

## Deduplication Strategy

**Primary Key**: `bookId` + `location.start`

**Algorithm**:
```typescript
function getUniqueKey(note: Note): string {
  if (note.location?.start) {
    return `${note.bookId}-${note.location.start}`;
  }
  // Fallback for notes without location
  return `${note.bookId}-${hashContent(note.text)}`;
}
```

**Deduplication Rules**:
1. Notes with same `bookId` + `location.start` are considered duplicates
2. Most recent `dateAdded` wins in case of conflict
3. Notes without location use content hash as fallback
4. Deduplication stats reported in UploadSession

---

## Data Integrity

**Referential Integrity**:
- Every Note must reference an existing Book (via `bookId`)
- Orphaned notes are prevented at insertion time
- Book deletion must cascade to notes (future feature)

**Computed Fields**:
- `Book.noteCount` recomputed after any note addition/deletion
- `Book.lastModifiedAt` updated when notes change
- `UploadSession.stats` computed during upload processing

**Atomic Operations**:
- File writes use temp file + rename pattern for atomicity
- All book/note updates within single upload are atomic
- Failed uploads roll back to previous state

---

## Migration from Client-Side DB

**Existing Dexie Schema** (to be removed):
```typescript
// BEFORE (client-side)
books: '++id, title, author, *tags, createdAt, lastModifiedAt'
notes: '++id, bookId, *tags, text, type, createdAt, lastModifiedAt, [bookId+createdAt]'
```

**New Server Schema** (file-based):
```typescript
// AFTER (server-side)
Book { id, title, author, noteCount, tags?, createdAt, lastModifiedAt }
Note { id, bookId, type, text, location: { start, end? }, ... }
```

**Key Differences**:
- Added `location` field to Note (critical for future features)
- Added `noteCount` to Book (computed field for performance)
- Removed Dexie auto-increment `++id`, using generated string IDs
- Removed compound index `[bookId+createdAt]`, using in-memory filtering

**Data Preservation**:
- All existing data compatible with new schema
- No data loss during migration
- Location data parsed from original Kindle format

---

## Performance Considerations

**Read Performance**:
- All data loaded once during build, cached in memory
- Filtering/sorting done in JavaScript (fast for <10,000 items)
- No database query overhead

**Write Performance**:
- Atomic file writes with temp + rename pattern
- In-memory deduplication before write
- Target: <5 seconds for 10,000 notes

**Build Performance**:
- Books and notes loaded once per build
- Cached in module-level variables
- Target: <30 seconds for 1,000 books

**Storage Size**:
- ~1KB per book (with metadata)
- ~500 bytes per note (with text)
- 10,000 notes ≈ 5MB JSON file (acceptable)
