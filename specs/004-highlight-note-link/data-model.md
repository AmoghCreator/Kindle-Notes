# Data Model: Highlight-Note Association

**Feature**: 004-highlight-note-link  
**Phase**: 1 (Design)  
**Date**: February 12, 2026

## Overview

This document defines the data structures for associating Kindle notes with their corresponding highlights. The design extends the existing `Note` type with an optional association reference while maintaining backward compatibility with existing data.

## Entity Definitions

### Extended Note Type

**Purpose**: Represents a Kindle annotation (highlight, note, or bookmark) with optional association to a highlight.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier (UUID) |
| `bookId` | `string` | Yes | Reference to parent book |
| `text` | `string` | Yes | Content of the note/highlight |
| `location` | `NoteLocation` | No | Position information (page, location range) |
| `type` | `'highlight' \| 'note' \| 'bookmark'` | Yes | Entry type |
| `tags` | `string[]` | Yes | User-defined tags (can be empty array) |
| `userNote` | `string` | No | Additional user commentary |
| `associatedHighlightId` | `string` | No | **NEW**: Reference to associated highlight (if note follows highlight) |
| `createdAt` | `Date` | Yes | Original creation timestamp from Kindle |
| `lastModifiedAt` | `Date` | Yes | Last update timestamp |
| `importSource` | `UploadMeta` | Yes | Import file metadata |
| `shareHistory` | `ShareRecord[]` | Yes | Social sharing records (can be empty array) |

**Key Properties**:

- **`associatedHighlightId`** (NEW field):
  - Only populated when `type === 'note'` AND note immediately follows a highlight in import sequence
  - References the `id` of the associated highlight note
  - `undefined` for standalone notes, bookmarks, and highlights themselves
  - Unidirectional: note points to highlight (highlight doesn't store references back to notes)

**Validation Rules**:

1. If `associatedHighlightId` is present, it must reference an existing note with `type === 'highlight'`
2. If `type !== 'note'`, then `associatedHighlightId` must be `undefined`
3. `associatedHighlightId` cannot reference itself (circular reference check)
4. Location data must be present for both associated note and highlight for proper ordering

**Example Data**:

```json
{
  "id": "highlight-123",
  "bookId": "book-456",
  "text": "The most important lesson is to never stop learning.",
  "location": {
    "start": 1250,
    "end": 1280,
    "page": 42
  },
  "type": "highlight",
  "tags": ["learning", "education"],
  "userNote": null,
  "associatedHighlightId": null,
  "createdAt": "2024-02-10T14:30:00Z",
  "lastModifiedAt": "2024-02-10T14:30:00Z",
  "importSource": {
    "uploadId": "upload-789",
    "filename": "My_Clippings.txt",
    "importedAt": "2024-02-12T10:00:00Z"
  },
  "shareHistory": []
}
```

```json
{
  "id": "note-124",
  "bookId": "book-456",
  "text": "This reminds me of Carol Dweck's growth mindset research.",
  "location": {
    "start": 1255,
    "page": 42
  },
  "type": "note",
  "tags": ["learning", "research"],
  "userNote": null,
  "associatedHighlightId": "highlight-123",
  "createdAt": "2024-02-10T14:32:00Z",
  "lastModifiedAt": "2024-02-10T14:32:00Z",
  "importSource": {
    "uploadId": "upload-789",
    "filename": "My_Clippings.txt",
    "importedAt": "2024-02-12T10:00:00Z"
  },
  "shareHistory": []
}
```

---

### Display Entity: HighlightNotePair

**Purpose**: View model for rendering grouped highlight-note pairs in UI components.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `highlight` | `Note` (where `type === 'highlight'`) | Yes | The highlight entry |
| `associatedNote` | `Note` (where `type === 'note'`) | No | The note entry if one exists |
| `displayOrder` | `number` | Yes | Sort order based on location |

**Key Properties**:

- Computed on-the-fly from raw Note data (not stored)
- Used exclusively for UI rendering
- `associatedNote` is `undefined` for standalone highlights
- Single note per highlight (one-to-one relationship)

**Example Construction**:

```typescript
// Input: Array of Note objects from notes.json
const notes: Note[] = [...];

// Filter to specific book
const bookNotes = notes.filter(n => n.bookId === currentBookId);

// Separate highlights and notes
const highlights = bookNotes.filter(n => n.type === 'highlight');
const noteEntries = bookNotes.filter(n => n.type === 'note');

// Build pairs
const pairs: HighlightNotePair[] = highlights.map(h => ({
  highlight: h,
  associatedNote: noteEntries.find(n => n.associatedHighlightId === h.id),
  displayOrder: h.location?.start ?? 0
}));

// Sort by location
pairs.sort((a, b) => a.displayOrder - b.displayOrder);
```

---

### Supporting Types (Unchanged)

These existing types remain unmodified but are referenced by the association feature:

#### NoteLocation

```typescript
interface NoteLocation {
  start: number;      // REQUIRED for deduplication and ordering
  end?: number;       // Optional end location for ranges
  page?: number;      // Page number from Kindle
  chapter?: string;   // Chapter name if available
  position?: string;  // Kindle position string
}
```

#### UploadMeta

```typescript
interface UploadMeta {
  uploadId: string;
  filename: string;
  importedAt: Date;
}
```

---

## Entity Relationships

```
┌─────────────┐
│    Book     │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────────────────────┐
│          Note                    │
│                                  │
│  type: 'highlight'|'note'|...   │
│  associatedHighlightId?: string │
└──────────────┬──────────────────┘
               │
               │ 0..1 (optional)
               │ Self-reference
               │
               ▼
      ┌────────────────┐
      │ Associated     │
      │ Highlight      │
      │ (Note where    │
      │ type='highlight')
      └────────────────┘

Cardinality:
- Book → Note: One-to-Many (one book has many notes)
- Note → Highlight: Zero-or-One (a note may reference one highlight)
- Highlight → Note: Zero-or-Many (a highlight may have multiple notes, but only one via direct association)
```

**Relationship Rules**:

1. **Book-Note**: Standard one-to-many. All notes belong to exactly one book.
2. **Note-Highlight**: Optional association. Only notes (type='note') can have `associatedHighlightId`.
3. **Unidirectional**: Note stores reference to highlight, not vice versa.
4. **No Cascading**: Deleting a highlight doesn't delete associated notes (just clears the association).

---

## Data Integrity Constraints

### Primary Constraints

1. **Type Safety**: 
   - Only notes with `type === 'note'` can have `associatedHighlightId` populated
   - Referenced highlight must exist and have `type === 'highlight'`

2. **Referential Integrity**:
   - `associatedHighlightId` must point to valid note ID in same book
   - No cross-book associations allowed

3. **Location Consistency**:
   - Associated note location should be within reasonable range of highlight location (same page or adjacent)
   - Parser should validate this during association creation

4. **Uniqueness**:
   - Multiple notes can reference the same highlight (though parser creates max 1:1 associations)
   - One note cannot reference multiple highlights

### Secondary Constraints

1. **Backward Compatibility**:
   - Existing notes without `associatedHighlightId` remain valid
   - System treats missing field as `undefined` (standalone note)

2. **Import Consistency**:
   - Re-importing same file should produce same associations
   - Updating note text preserves association if location unchanged

---

## Query Patterns

### Common Queries

**Get all entries for a book (grouped by association)**:

```typescript
function getGroupedEntries(bookId: string, notes: Note[]): {
  pairs: HighlightNotePair[],
  standaloneNotes: Note[]
} {
  const bookNotes = notes.filter(n => n.bookId === bookId);
  
  const highlights = bookNotes.filter(n => n.type === 'highlight');
  const noteEntries = bookNotes.filter(n => n.type === 'note');
  
  const pairs = highlights.map(h => ({
    highlight: h,
    associatedNote: noteEntries.find(n => n.associatedHighlightId === h.id),
    displayOrder: h.location?.start ?? 0
  }));
  
  const standaloneNotes = noteEntries.filter(n => !n.associatedHighlightId);
  
  return { pairs, standaloneNotes };
}
```

**Check if note is associated**:

```typescript
function isAssociated(note: Note): boolean {
  return note.type === 'note' && note.associatedHighlightId !== undefined;
}
```

**Find highlight for a note**:

```typescript
function findAssociatedHighlight(note: Note, allNotes: Note[]): Note | undefined {
  if (!note.associatedHighlightId) return undefined;
  return allNotes.find(n => n.id === note.associatedHighlightId);
}
```

---

## Storage Format

### JSON File Structure (notes.json)

```json
{
  "notes": [
    {
      "id": "highlight-123",
      "bookId": "book-456",
      "text": "Highlighted text...",
      "type": "highlight",
      "location": { "start": 1250, "page": 42 },
      "tags": [],
      "createdAt": "2024-02-10T14:30:00Z",
      "lastModifiedAt": "2024-02-10T14:30:00Z",
      "importSource": { "uploadId": "u1", "filename": "file.txt", "importedAt": "2024-02-12T10:00:00Z" },
      "shareHistory": []
    },
    {
      "id": "note-124",
      "bookId": "book-456",
      "text": "My note about the highlight...",
      "type": "note",
      "location": { "start": 1255, "page": 42 },
      "tags": [],
      "associatedHighlightId": "highlight-123",
      "createdAt": "2024-02-10T14:32:00Z",
      "lastModifiedAt": "2024-02-10T14:32:00Z",
      "importSource": { "uploadId": "u1", "filename": "file.txt", "importedAt": "2024-02-12T10:00:00Z" },
      "shareHistory": []
    },
    {
      "id": "note-125",
      "bookId": "book-456",
      "text": "Standalone note without highlight...",
      "type": "note",
      "location": { "start": 1500, "page": 45 },
      "tags": [],
      "createdAt": "2024-02-10T15:00:00Z",
      "lastModifiedAt": "2024-02-10T15:00:00Z",
      "importSource": { "uploadId": "u1", "filename": "file.txt", "importedAt": "2024-02-12T10:00:00Z" },
      "shareHistory": []
    }
  ]
}
```

**Notes on Storage**:
- `associatedHighlightId` field only appears when populated (omit if undefined)
- No separate association table needed
- Backward compatible: old entries without field load correctly
- File size impact minimal (~50 bytes per associated note)

---

## Migration Strategy

### No Migration Required

**Reason**: `associatedHighlightId` is optional. Existing data remains valid.

**Handling Existing Data**:

1. **On Load**: Existing notes without `associatedHighlightId` are treated as standalone
2. **On Display**: UI checks for field presence before attempting grouped rendering
3. **On Re-import**: New associations created for entries that qualify

**Future Association of Old Data**:

Users must re-import their Kindle files to generate associations for previously imported notes. No automated retroactive association (out of scope, per spec).

---

## Performance Considerations

### Query Performance

- **Association lookups**: O(n) linear search within book's notes (typically < 100 notes per book)
- **Grouping operation**: O(n) single pass to build pairs
- **Sorting**: O(n log n) for display order

**Optimization**: For books with 500+ notes, consider pre-grouping at build time (Astro SSG) rather than client-side grouping.

### Storage Performance

- **Read**: No change (same file loading as before)
- **Write**: Minimal overhead (one additional optional field per note)
- **Size**: +10% for files with many associations (~50 bytes per association)

---

## Summary

**Changes to Existing Types**:
- `Note`: Add optional `associatedHighlightId?: string` field

**New Types**:
- `HighlightNotePair`: Display model for UI rendering

**Validation**:
- Type constraint: only notes can have associations
- Referential integrity: associations must reference valid highlights
- Location consistency: associated entries should be nearby

**Storage**:
- Single optional field in existing JSON structure
- No migration required
- Backward compatible

This data model design satisfies all functional requirements while maintaining simplicity and backward compatibility per constitution principles.
