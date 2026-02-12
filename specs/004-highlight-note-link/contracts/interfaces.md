# API Contracts: Highlight-Note Association

**Feature**: 004-highlight-note-link  
**Phase**: 1 (Design)  
**Date**: February 12, 2026

## Overview

This document defines TypeScript interfaces and contracts for the highlight-note association feature. These interfaces serve as the contract between parser, storage, and UI layers.

---

## Core Type Extensions

### Extended Note Interface

```typescript
/**
 * Represents a Kindle annotation (highlight, note, or bookmark)
 * with optional association to a highlight.
 * 
 * Extended from base Note type to include highlight association.
 */
export interface Note {
  id: string;
  bookId: string;
  text: string;
  location?: NoteLocation;
  type: 'highlight' | 'note' | 'bookmark';
  tags: string[];
  userNote?: string;
  
  /**
   * Optional reference to an associated highlight.
   * Only populated when:
   * - type === 'note'
   * - Note immediately followed a highlight in import sequence
   * - Referenced highlight exists in same book
   * 
   * @example "highlight-abc-123"
   */
  associatedHighlightId?: string;
  
  createdAt: Date;
  lastModifiedAt: Date;
  importSource: UploadMeta;
  shareHistory: ShareRecord[];
}
```

---

## Display Entities

### HighlightNotePair Interface

```typescript
/**
 * View model representing a highlight with its optionally associated note.
 * Used for rendering grouped entries in UI components.
 * 
 * @remarks
 * This is a computed structure, not stored in JSON.
 * Built on-the-fly from Note[] data for display purposes.
 */
export interface HighlightNotePair {
  /**
   * The highlight entry
   */
  highlight: Note & { type: 'highlight' };
  
  /**
   * The associated note entry, if one exists.
   * undefined for standalone highlights.
   */
  associatedNote?: Note & { type: 'note' };
  
  /**
   * Sort order based on location.start
   * Used for proper sequential display.
   */
  displayOrder: number;
}
```

### GroupedBookEntries Interface

```typescript
/**
 * Complete collection of entries for a book, separated into
 * associated pairs and standalone items.
 * 
 * @remarks
 * Output of grouping logic applied to raw Note[] data.
 */
export interface GroupedBookEntries {
  /**
   * Highlight-note pairs (including highlights without notes)
   */
  pairs: HighlightNotePair[];
  
  /**
   * Notes not associated with any highlight
   */
  standaloneNotes: Note[];
  
  /**
   * Bookmarks (never associated)
   */
  bookmarks: Note[];
}
```

---

## Parser Contracts

### ParseResult Extension

```typescript
/**
 * Result of parsing a Kindle export file.
 * Extended to include association metadata.
 */
export interface ParseResult {
  books: Book[];
  notes: Note[];  // Now includes associatedHighlightId when applicable
  metadata: ParseMetadata;
}

/**
 * Metadata about parsing operation.
 * Extended to track association statistics.
 */
export interface ParseMetadata {
  fileName?: string;
  fileSize: number;
  totalEntries: number;
  parsedAt: Date;
  statistics: ParseStatistics;
}

/**
 * Statistics collected during parsing.
 * Extended to track associations created.
 */
export interface ParseStatistics {
  highlights: number;
  notes: number;
  bookmarks: number;
  uniqueBooks: number;
  
  /**
   * NEW: Number of notes associated with highlights
   */
  associatedNotes: number;
  
  /**
   * NEW: Number of standalone notes (not associated)
   */
  standaloneNotes: number;
}
```

### AssociationDetectionResult

```typescript
/**
 * Internal result of association detection logic.
 * Used during parsing to track association state.
 */
export interface AssociationDetectionResult {
  /**
   * The parsed note entry
   */
  note: Note;
  
  /**
   * Whether an association was created
   */
  wasAssociated: boolean;
  
  /**
   * ID of associated highlight if wasAssociated is true
   */
  associatedHighlightId?: string;
}
```

---

## Utility Function Contracts

### Grouping Functions

```typescript
/**
 * Groups raw notes into display structure with associations.
 * 
 * @param bookId - ID of book to group entries for
 * @param notes - Complete array of notes from storage
 * @returns Grouped entries ready for rendering
 * 
 * @example
 * const grouped = groupEntriesByAssociation('book-123', allNotes);
 * // grouped.pairs contains highlights with associated notes
 * // grouped.standaloneNotes contains independent notes
 */
export function groupEntriesByAssociation(
  bookId: string,
  notes: Note[]
): GroupedBookEntries;

/**
 * Builds highlight-note pairs from filtered notes.
 * 
 * @param highlights - Array of highlight entries
 * @param noteEntries - Array of note entries
 * @returns Array of pairs sorted by location
 * 
 * @example
 * const pairs = buildHighlightPairs(highlights, notes);
 * pairs.forEach(pair => {
 *   console.log(pair.highlight.text);
 *   if (pair.associatedNote) {
 *     console.log('  → ' + pair.associatedNote.text);
 *   }
 * });
 */
export function buildHighlightPairs(
  highlights: Note[],
  noteEntries: Note[]
): HighlightNotePair[];
```

### Validation Functions

```typescript
/**
 * Checks if a note is associated with a highlight.
 * 
 * @param note - Note to check
 * @returns true if note has valid association
 * 
 * @example
 * if (isAssociatedNote(note)) {
 *   // Render with indentation
 * }
 */
export function isAssociatedNote(note: Note): boolean;

/**
 * Validates that an association reference is valid.
 * 
 * @param note - Note with potential association
 * @param allNotes - Complete array of notes to validate against
 * @returns true if association is valid, false otherwise
 * 
 * @remarks
 * Checks:
 * - Note type is 'note'
 * - Referenced highlight exists
 * - Referenced highlight type is 'highlight'
 * - Both entries in same book
 * 
 * @example
 * if (!isValidAssociation(note, notes)) {
 *   console.warn('Invalid association detected', note.id);
 *   note.associatedHighlightId = undefined;
 * }
 */
export function isValidAssociation(
  note: Note,
  allNotes: Note[]
): boolean;

/**
 * Finds the highlight associated with a note.
 * 
 * @param note - Note to find highlight for
 * @param allNotes - Complete array of notes
 * @returns Associated highlight or undefined
 * 
 * @example
 * const highlight = findAssociatedHighlight(note, notes);
 * if (highlight) {
 *   console.log('Note comments on:', highlight.text);
 * }
 */
export function findAssociatedHighlight(
  note: Note,
  allNotes: Note[]
): Note | undefined;
```

---

## Component Props

### NoteCard Component Props

```typescript
/**
 * Props for NoteCard component.
 * Extended to support association display.
 */
export interface NoteCardProps {
  /**
   * The note to display
   */
  note: Note;
  
  /**
   * Optional associated highlight (for display context)
   * When provided, note is rendered with association styling
   */
  associatedHighlight?: Note;
  
  /**
   * Display mode for styling
   */
  displayMode?: 'standalone' | 'associated';
  
  /**
   * Show location metadata
   * @default true
   */
  showLocation?: boolean;
  
  /**
   * Callback when note is clicked
   */
  onClick?: (noteId: string) => void;
}
```

### BookNotesView Component Props

```typescript
/**
 * Props for book detail view showing all notes.
 */
export interface BookNotesViewProps {
  /**
   * Book being displayed
   */
  book: Book;
  
  /**
   * All notes for the book (pre-filtered by bookId)
   */
  notes: Note[];
  
  /**
   * Display preference for grouping
   * @default 'grouped'
   */
  displayMode?: 'grouped' | 'sequential';
  
  /**
   * Sort order for notes
   * @default 'location'
   */
  sortBy?: 'location' | 'date' | 'type';
}
```

---

## Storage Contracts

### JSON Schema Extensions

```typescript
/**
 * Schema for notes.json file.
 * Notes now include optional associatedHighlightId.
 */
export interface NotesStorage {
  notes: Note[];
}

/**
 * Type guard for validating stored note structure.
 * 
 * @param data - Raw data from JSON file
 * @returns true if data matches NotesStorage schema
 */
export function isValidNotesStorage(data: unknown): data is NotesStorage;
```

---

## Parser Internal Contracts

### Association Detection Context

```typescript
/**
 * Internal state maintained during parsing for association detection.
 * Not exported, but documented for clarity.
 */
interface AssociationContext {
  /**
   * Most recently parsed highlight entry.
   * Reset to null after associating with a note or encountering non-highlight.
   */
  previousHighlight: Note | null;
  
  /**
   * Count of associations created during parse.
   */
  associationCount: number;
}
```

### Parser Options Extension

```typescript
/**
 * Options for configuring parser behavior.
 * Extended to control association detection.
 */
export interface ParserOptions {
  /**
   * Enable/disable association detection
   * @default true
   */
  detectAssociations?: boolean;
  
  /**
   * Maximum location distance between highlight and note
   * to consider for association (in Kindle location units).
   * undefined means no distance limit.
   * @default undefined
   */
  maxAssociationDistance?: number;
  
  /**
   * Existing options (unchanged)
   */
  validateLocations?: boolean;
  strictMode?: boolean;
}
```

---

## Error Types

### AssociationError

```typescript
/**
 * Error thrown when association validation fails.
 */
export class AssociationError extends Error {
  constructor(
    message: string,
    public noteId: string,
    public highlightId?: string
  ) {
    super(message);
    this.name = 'AssociationError';
  }
}

/**
 * Factory functions for common association errors
 */
export const AssociationErrors = {
  invalidReference: (noteId: string, highlightId: string) =>
    new AssociationError(
      `Note ${noteId} references non-existent highlight ${highlightId}`,
      noteId,
      highlightId
    ),
  
  typeMismatch: (noteId: string) =>
    new AssociationError(
      `Note ${noteId} has associatedHighlightId but type is not 'note'`,
      noteId
    ),
  
  circularReference: (noteId: string) =>
    new AssociationError(
      `Note ${noteId} references itself as associated highlight`,
      noteId
    ),
};
```

---

## Type Guards

```typescript
/**
 * Type guard to check if note is a highlight.
 */
export function isHighlight(note: Note): note is Note & { type: 'highlight' } {
  return note.type === 'highlight';
}

/**
 * Type guard to check if note is a note (annotation).
 */
export function isNoteEntry(note: Note): note is Note & { type: 'note' } {
  return note.type === 'note';
}

/**
 * Type guard to check if note has association.
 */
export function hasAssociation(
  note: Note
): note is Note & { associatedHighlightId: string } {
  return isNoteEntry(note) && note.associatedHighlightId !== undefined;
}
```

---

## Constants

```typescript
/**
 * Constants related to association feature.
 */
export const AssociationConstants = {
  /**
   * CSS class applied to associated note cards
   */
  ASSOCIATED_NOTE_CLASS: 'note-associated',
  
  /**
   * CSS class applied to standalone note cards
   */
  STANDALONE_NOTE_CLASS: 'note-standalone',
  
  /**
   * CSS class applied to highlight cards with associated notes
   */
  HIGHLIGHT_WITH_NOTE_CLASS: 'highlight-has-note',
  
  /**
   * ARIA label pattern for associated notes
   */
  ARIA_LABEL_PATTERN: 'Note for highlight: {highlightText}',
  
  /**
   * Maximum characters of highlight text to include in ARIA label
   */
  ARIA_LABEL_MAX_LENGTH: 50,
} as const;
```

---

## Usage Examples

### Parser Usage

```typescript
import { parseKindleFile } from './parsers/kindle-parser';
import type { ParseResult, ParserOptions } from './contracts';

const content = await readFile('My_Clippings.txt', 'utf-8');

const options: ParserOptions = {
  detectAssociations: true,  // Enable association detection
  validateLocations: true,
  strictMode: false
};

const result: ParseResult = await parseKindleFile(content, 'My_Clippings.txt', options);

console.log(`Created ${result.metadata.statistics.associatedNotes} associations`);
console.log(`Found ${result.metadata.statistics.standaloneNotes} standalone notes`);
```

### Grouping Usage

```typescript
import { groupEntriesByAssociation } from './utils/note-grouping';
import type { GroupedBookEntries } from './contracts';

// Load notes from storage
const allNotes = await loadNotes();

// Group for specific book
const grouped: GroupedBookEntries = groupEntriesByAssociation('book-123', allNotes);

// Render pairs
grouped.pairs.forEach(pair => {
  renderHighlight(pair.highlight);
  if (pair.associatedNote) {
    renderAssociatedNote(pair.associatedNote);
  }
});

// Render standalone notes
grouped.standaloneNotes.forEach(note => {
  renderStandaloneNote(note);
});
```

### Component Usage

```typescript
// In BookDetail.astro
import NoteCard from '@/components/notes/NoteCard.astro';
import { groupEntriesByAssociation } from '@/lib/utils/note-grouping';

const { book, notes } = Astro.props;
const grouped = groupEntriesByAssociation(book.id, notes);
---

{grouped.pairs.map(pair => (
  <div class="highlight-note-group">
    <NoteCard 
      note={pair.highlight} 
      displayMode="standalone" 
    />
    
    {pair.associatedNote && (
      <NoteCard 
        note={pair.associatedNote}
        associatedHighlight={pair.highlight}
        displayMode="associated"
      />
    )}
  </div>
))}

{grouped.standaloneNotes.map(note => (
  <NoteCard 
    note={note}
    displayMode="standalone"
  />
))}
```

---

## Backward Compatibility

All interfaces extend existing types with optional fields. Existing code continues to work without modification:

```typescript
// Old code still works
const notes: Note[] = await loadNotes();
notes.forEach(note => {
  console.log(note.text);  // Works as before
});

// New code uses extended functionality
notes.forEach(note => {
  console.log(note.text);
  if (note.associatedHighlightId) {
    console.log('  → Associated with highlight:', note.associatedHighlightId);
  }
});
```

---

## Summary

**Core Extensions**:
- `Note`: Add `associatedHighlightId?: string`
- `ParseMetadata`: Add association statistics

**New Interfaces**:
- `HighlightNotePair`: Display model
- `GroupedBookEntries`: Organized view of book contents
- `AssociationError`: Error handling

**Utility Functions**:
- Grouping: `groupEntriesByAssociation`, `buildHighlightPairs`
- Validation: `isAssociatedNote`, `isValidAssociation`
- Lookup: `findAssociatedHighlight`

All contracts maintain backward compatibility and follow TypeScript best practices for type safety.
