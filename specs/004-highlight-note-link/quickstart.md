# Quickstart Guide: Highlight-Note Association

**Feature**: 004-highlight-note-link  
**Version**: 1.0.0  
**Date**: February 12, 2026

## Overview

This guide shows how to use the highlight-note association feature in the Kindle Notes Website. When you import Kindle notes, any note that immediately follows a highlight will be automatically linked, making it clear which thoughts go with which passages.

---

## For Users

### Importing Notes with Associations

**Step 1: Export from Kindle**

1. Connect your Kindle device or open Kindle app
2. Export your notes (usually creates `My_Clippings.txt`)
3. The file will have highlights and notes in order

**Step 2: Upload to Website**

1. Go to the upload page
2. Select your `My_Clippings.txt` file
3. Click "Upload"
4. Wait for processing (typically 5-15 seconds)

**Step 3: View Associated Notes**

1. Navigate to your library
2. Click on any book
3. You'll see:
   - **Highlights with notes**: Highlight shown with note directly below, slightly indented
   - **Standalone highlights**: Highlight without any note below
   - **Standalone notes**: Notes that aren't connected to highlights

### Visual Indicators

```
📖 Highlight
"The most important lesson is to never stop learning."
Location: Page 42

  💭 My Note
  "This reminds me of Carol Dweck's growth mindset research."
  
──────────────────────────────

💭 Standalone Note
"Great chapter overall - need to revisit this."
```

**What You'll See**:
- Associated notes are **indented** beneath their highlight
- Standalone notes appear at **full width**
- Highlights without notes appear normally

### Understanding Associations

**When are notes associated?**
- When you highlight a passage in Kindle
- Then immediately add a note about that highlight
- The note appears right after the highlight in the export file

**When are notes standalone?**
- When you create a note without highlighting first
- When you highlight multiple passages before adding a note (only the last highlight gets the note)

---

## For Developers

### Installation

No additional installation needed. Feature is built into the parser.

### Basic Usage

#### Parsing with Associations

```typescript
import { parseKindleFile } from '@/lib/parsers/kindle-parser';

const content = await readFile('My_Clippings.txt', 'utf-8');
const result = await parseKindleFile(content, 'My_Clippings.txt');

// Check association statistics
console.log(`Associated notes: ${result.metadata.statistics.associatedNotes}`);
console.log(`Standalone notes: ${result.metadata.statistics.standaloneNotes}`);

// Save to storage
await saveNotes(result.notes);  // Includes associatedHighlightId field
```

#### Grouping for Display

```typescript
import { groupEntriesByAssociation } from '@/lib/utils/note-grouping';

// Load notes from storage
const allNotes = await loadNotes();

// Group by association for a specific book
const grouped = groupEntriesByAssociation('book-123', allNotes);

// Display pairs
grouped.pairs.forEach(pair => {
  console.log('Highlight:', pair.highlight.text);
  if (pair.associatedNote) {
    console.log('  → Note:', pair.associatedNote.text);
  }
});

// Display standalone notes
grouped.standaloneNotes.forEach(note => {
  console.log('Standalone:', note.text);
});
```

#### Checking Associations

```typescript
import { isAssociatedNote, findAssociatedHighlight } from '@/lib/utils/note-grouping';

// Check if a note has an association
if (isAssociatedNote(note)) {
  console.log('This note is linked to a highlight');
  
  // Find the highlight
  const highlight = findAssociatedHighlight(note, allNotes);
  if (highlight) {
    console.log('Associated with:', highlight.text);
  }
}
```

### Component Integration

#### Using NoteCard with Associations

```astro
---
// In your book detail page
import NoteCard from '@/components/notes/NoteCard.astro';
import { groupEntriesByAssociation } from '@/lib/utils/note-grouping';

const { book, notes } = Astro.props;
const grouped = groupEntriesByAssociation(book.id, notes);
---

<div class="book-notes">
  <!-- Render highlight-note pairs -->
  {grouped.pairs.map(pair => (
    <div class="note-group">
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
  
  <!-- Render standalone notes -->
  {grouped.standaloneNotes.map(note => (
    <NoteCard 
      note={note}
      displayMode="standalone"
    />
  ))}
</div>
```

#### Styling Associated Notes

```css
/* In your component styles */
.note-group {
  margin-bottom: 2rem;
}

.note-associated {
  margin-left: 2rem;
  margin-top: 0.5rem;
  border-left: 3px solid var(--accent-color);
  padding-left: 1rem;
}

.note-standalone {
  margin-bottom: 1.5rem;
}

/* Responsive: reduce indentation on mobile */
@media (max-width: 640px) {
  .note-associated {
    margin-left: 1rem;
  }
}
```

### Data Structure

#### Extended Note Type

```typescript
interface Note {
  id: string;
  bookId: string;
  text: string;
  location?: NoteLocation;
  type: 'highlight' | 'note' | 'bookmark';
  tags: string[];
  
  // NEW: Association field
  associatedHighlightId?: string;  // References ID of associated highlight
  
  createdAt: Date;
  lastModifiedAt: Date;
  importSource: UploadMeta;
  shareHistory: ShareRecord[];
}
```

#### Example Data

```json
{
  "notes": [
    {
      "id": "highlight-123",
      "bookId": "book-456",
      "text": "The most important lesson is to never stop learning.",
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
      "text": "This reminds me of Carol Dweck's growth mindset research.",
      "type": "note",
      "location": { "start": 1255, "page": 42 },
      "tags": [],
      "associatedHighlightId": "highlight-123",  // Links to highlight above
      "createdAt": "2024-02-10T14:32:00Z",
      "lastModifiedAt": "2024-02-10T14:32:00Z",
      "importSource": { "uploadId": "u1", "filename": "file.txt", "importedAt": "2024-02-12T10:00:00Z" },
      "shareHistory": []
    }
  ]
}
```

### Parser Configuration

#### Custom Parser Options

```typescript
import { parseKindleFile } from '@/lib/parsers/kindle-parser';
import type { ParserOptions } from '@/lib/types';

const options: ParserOptions = {
  // Enable or disable association detection
  detectAssociations: true,  // default: true
  
  // Optional: limit association distance
  maxAssociationDistance: 100,  // Kindle location units
  
  // Other options
  validateLocations: true,
  strictMode: false
};

const result = await parseKindleFile(content, filename, options);
```

### Utility Functions

#### Available Functions

```typescript
// Check if note is associated
import { isAssociatedNote } from '@/lib/utils/note-grouping';
const hasLink = isAssociatedNote(note);

// Find associated highlight
import { findAssociatedHighlight } from '@/lib/utils/note-grouping';
const highlight = findAssociatedHighlight(note, allNotes);

// Validate association
import { isValidAssociation } from '@/lib/utils/note-grouping';
if (!isValidAssociation(note, allNotes)) {
  console.warn('Invalid association detected');
}

// Group entries for display
import { groupEntriesByAssociation } from '@/lib/utils/note-grouping';
const grouped = groupEntriesByAssociation(bookId, notes);
```

### Testing

#### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { isAssociatedNote, groupEntriesByAssociation } from '@/lib/utils/note-grouping';

describe('Association detection', () => {
  it('identifies associated notes', () => {
    const note = {
      id: 'note-1',
      type: 'note',
      associatedHighlightId: 'highlight-1',
      // ...other fields
    };
    
    expect(isAssociatedNote(note)).toBe(true);
  });
  
  it('groups entries correctly', () => {
    const notes = [
      { id: 'h1', type: 'highlight', bookId: 'b1', /* ... */ },
      { id: 'n1', type: 'note', bookId: 'b1', associatedHighlightId: 'h1', /* ... */ },
      { id: 'n2', type: 'note', bookId: 'b1', /* ... */ },  // standalone
    ];
    
    const grouped = groupEntriesByAssociation('b1', notes);
    
    expect(grouped.pairs).toHaveLength(1);
    expect(grouped.pairs[0].associatedNote?.id).toBe('n1');
    expect(grouped.standaloneNotes).toHaveLength(1);
    expect(grouped.standaloneNotes[0].id).toBe('n2');
  });
});
```

#### Integration Test Example

```typescript
import { test, expect } from '@playwright/test';

test('displays associated notes correctly', async ({ page }) => {
  await page.goto('/books/test-book-id');
  
  // Check for highlight-note pair
  const noteGroups = page.locator('.note-group');
  await expect(noteGroups).toHaveCount(1);
  
  // Verify highlight is present
  const highlight = noteGroups.locator('.note-card').first();
  await expect(highlight).toContainText('highlighted text');
  
  // Verify associated note is indented
  const associatedNote = noteGroups.locator('.note-associated');
  await expect(associatedNote).toBeVisible();
  await expect(associatedNote).toHaveCSS('margin-left', '32px');
});
```

---

## Common Patterns

### Pattern 1: Filtering by Association Status

```typescript
// Get only associated notes
const associatedNotes = notes.filter(n => 
  n.type === 'note' && n.associatedHighlightId !== undefined
);

// Get only standalone notes
const standaloneNotes = notes.filter(n => 
  n.type === 'note' && !n.associatedHighlightId
);

// Get highlights with notes
const highlightsWithNotes = notes.filter(n => 
  n.type === 'highlight' && 
  notes.some(note => note.associatedHighlightId === n.id)
);
```

### Pattern 2: Building Navigation

```typescript
// Create table of contents with associations
const toc = grouped.pairs.map(pair => ({
  text: pair.highlight.text.substring(0, 50) + '...',
  location: pair.highlight.location?.start,
  hasNote: !!pair.associatedNote,
  id: pair.highlight.id
}));
```

### Pattern 3: Search with Association Context

```typescript
// Search notes and include their highlights
function searchWithContext(query: string, notes: Note[]) {
  const matches = notes.filter(n => 
    n.text.toLowerCase().includes(query.toLowerCase())
  );
  
  return matches.map(match => {
    if (match.type === 'note' && match.associatedHighlightId) {
      const highlight = notes.find(n => n.id === match.associatedHighlightId);
      return { note: match, context: highlight?.text };
    }
    return { note: match, context: null };
  });
}
```

---

## Troubleshooting

### Notes Not Associating

**Problem**: Notes appear standalone when they should be linked.

**Solutions**:
1. Check Kindle export format - notes must immediately follow highlights
2. Verify parser options have `detectAssociations: true`
3. Check location data - both entries need valid locations
4. Re-import the file (associations created during import)

### Invalid Associations

**Problem**: `associatedHighlightId` references non-existent highlight.

**Solutions**:
```typescript
// Validate and clean up associations
import { isValidAssociation } from '@/lib/utils/note-grouping';

notes.forEach(note => {
  if (note.associatedHighlightId && !isValidAssociation(note, notes)) {
    console.warn(`Clearing invalid association for note ${note.id}`);
    note.associatedHighlightId = undefined;
  }
});

// Save cleaned data
await saveNotes(notes);
```

### Styling Not Applied

**Problem**: Associated notes don't appear indented.

**Solutions**:
1. Check CSS classes are applied: `.note-associated` and `.note-standalone`
2. Verify `displayMode` prop is passed to component
3. Check CSS specificity - your styles may be overridden

---

## Migration Guide

### Updating Existing Data

**Existing notes without associations continue to work.** No migration required.

To add associations to existing notes:
1. Re-import the original Kindle export file
2. Parser will detect associations on new import
3. Duplicate detection will update existing notes with association field

### Backward Compatibility

```typescript
// Old code works without changes
notes.forEach(note => {
  console.log(note.text);  // ✅ Works
});

// New code uses associations when available
notes.forEach(note => {
  console.log(note.text);
  
  // Optional chaining for safety
  if (note.associatedHighlightId) {
    console.log('  → Associated with:', note.associatedHighlightId);
  }
});
```

---

## Performance Tips

### Large Libraries (500+ notes)

```typescript
// Pre-group at build time (Astro SSG)
export async function getStaticPaths() {
  const books = await loadBooks();
  const allNotes = await loadNotes();
  
  return books.map(book => ({
    params: { id: book.id },
    props: {
      book,
      grouped: groupEntriesByAssociation(book.id, allNotes)  // Pre-computed
    }
  }));
}
```

### Client-Side Rendering

```typescript
// Memoize grouping result
import { useMemo } from 'react';  // or similar

const grouped = useMemo(
  () => groupEntriesByAssociation(bookId, notes),
  [bookId, notes]
);
```

---

## API Reference

See [contracts/interfaces.md](contracts/interfaces.md) for complete TypeScript interface definitions.

---

## Getting Help

- **Issues**: Check [edge cases documentation](spec.md#edge-cases)
- **Examples**: See test files in `tests/unit/parser.test.js`
- **Design rationale**: See [research.md](research.md)

---

## What's Next

This feature provides the foundation. Future enhancements could include:
- Manual association editing in UI
- Multiple notes per highlight
- Association based on semantic similarity
- Bulk association management

See [spec.md](spec.md) for scope details.
