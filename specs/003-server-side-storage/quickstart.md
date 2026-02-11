# Developer Quickstart: Server-Side Storage Migration

**Feature**: 003-server-side-storage  
**Branch**: `003-server-side-storage`  
**Date**: February 11, 2026

## Overview

This guide helps developers implement the migration from client-side IndexedDB storage to server-side file-based storage for Kindle clippings. The migration removes ~45KB from the client bundle and enables build-time page generation for instant page loads.

## Prerequisites

- Node.js 18+ installed
- Existing Kindle Notes Website codebase
- Understanding of Astro framework basics
- Familiarity with TypeScript

## Quick Start

### 1. Verify Current Setup

```bash
# Clone or switch to feature branch
git checkout 003-server-side-storage

# Install dependencies (existing)
npm install

# Verify current structure
ls -la src/lib/storage/  # Client-side DB files (to be removed)
ls -la src/lib/server/   # Server storage (to be enhanced)
```

### 2. Understand the Architecture Shift

**Before (Client-Side)**:
```
User uploads file → API stores raw file → Client downloads file
  → Client parses in browser → Client stores in IndexedDB
  → Client queries DB to render pages
```

**After (Server-Side)**:
```
User uploads file → API parses immediately → Server stores in JSON files
  → Build process loads JSON → Pages pre-rendered with data
  → Client receives complete HTML (zero DB queries)
```

### 3. Key Implementation Steps

#### Step 1: Enhance Server Storage Layer

**File**: `src/lib/server/storage.ts`

Add deduplication and caching:

```typescript
// Module-level cache for build performance
let booksCache: Book[] | null = null;
let notesCache: Note[] | null = null;

export function clearCache(): void {
  booksCache = null;
  notesCache = null;
}

export async function getAllBooks(): Promise<Book[]> {
  if (booksCache === null) {
    try {
      const content = await fs.readFile(BOOKS_FILE, 'utf-8');
      booksCache = JSON.parse(content);
    } catch (error) {
      booksCache = []; // Empty array if file doesn't exist
    }
  }
  return booksCache;
}

export async function addNotesWithDeduplication(
  newNotes: Note[]
): Promise<DeduplicationResult> {
  const existing = await getAllNotes();
  const existingMap = new Map(
    existing.map(n => [`${n.bookId}-${n.location?.start}`, n])
  );
  
  const added: Note[] = [];
  const skipped: Note[] = [];
  
  for (const note of newNotes) {
    const key = `${note.bookId}-${note.location?.start}`;
    if (!existingMap.has(key)) {
      added.push(note);
      existingMap.set(key, note);
    } else {
      skipped.push(note);
    }
  }
  
  if (added.length > 0) {
    await saveNotes(Array.from(existingMap.values()));
  }
  
  return { added: added.length, skipped: skipped.length };
}
```

#### Step 2: Update Kindle Parser

**File**: `src/lib/parsers/kindle-parser.ts`

Ensure location data is preserved:

```typescript
export function parseKindleClippings(text: string): ParsedClippings {
  const entries = text.split('==========');
  const books = new Map<string, Book>();
  const notes: Note[] = [];
  
  for (const entry of entries) {
    const lines = entry.trim().split('\n');
    if (lines.length < 3) continue;
    
    // Parse title and author
    const titleLine = lines[0].trim();
    const [title, author] = titleLine.split('(').map(s => s.trim());
    
    // Parse metadata line (contains location info)
    const metaLine = lines[1].trim();
    const locationMatch = metaLine.match(/location\s+(\d+)(?:-(\d+))?/i);
    const location = locationMatch ? {
      start: parseInt(locationMatch[1]),
      end: locationMatch[2] ? parseInt(locationMatch[2]) : undefined
    } : undefined;
    
    // CRITICAL: Always preserve location for deduplication
    if (!location) {
      console.warn('Note without location:', titleLine);
    }
    
    // Create note with location
    const note: Note = {
      id: generateNoteId(),
      bookId: generateBookId(title, author),
      type: detectNoteType(metaLine),
      text: lines.slice(2).join('\n').trim(),
      location, // MUST be present for deduplication
      dateAdded: parseDateFromMetaLine(metaLine),
      createdAt: new Date(),
      lastModifiedAt: new Date()
    };
    
    notes.push(note);
    
    // Track book
    if (!books.has(note.bookId)) {
      books.set(note.bookId, {
        id: note.bookId,
        title: title.trim(),
        author: author?.trim() || 'Unknown',
        noteCount: 0,
        createdAt: new Date(),
        lastModifiedAt: new Date()
      });
    }
  }
  
  return {
    books: Array.from(books.values()),
    notes
  };
}
```

#### Step 3: Update Upload API

**File**: `src/pages/api/upload.ts`

Process and store data server-side:

```typescript
import { parseKindleClippings } from '@/lib/parsers/kindle-parser';
import { addBook, addNotesWithDeduplication, getAllNotes } from '@/lib/server/storage';

export async function POST({ request }: APIContext) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400
    });
  }
  
  try {
    // Parse file immediately on server
    const text = await file.text();
    const { books, notes } = parseKindleClippings(text);
    
    // Save books
    for (const book of books) {
      await addBook(book);
    }
    
    // Save notes with deduplication
    const result = await addNotesWithDeduplication(notes);
    
    // Update book note counts
    const allNotes = await getAllNotes();
    const counts = new Map<string, number>();
    for (const note of allNotes) {
      counts.set(note.bookId, (counts.get(note.bookId) || 0) + 1);
    }
    
    for (const book of books) {
      book.noteCount = counts.get(book.id) || 0;
      await addBook(book); // Update with correct count
    }
    
    return new Response(JSON.stringify({
      success: true,
      stats: {
        booksAdded: books.length,
        notesAdded: result.added,
        notesSkipped: result.skipped
      }
    }), {
      status: 200
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500
    });
  }
}
```

#### Step 4: Update Astro Pages

**File**: `src/pages/library.astro`

Load data at build time:

```astro
---
import { getAllBooks, getAllNotes } from '@/lib/server/storage';
import BookCard from '@/components/notes/BookCard.astro';
import BaseLayout from '@/layouts/BaseLayout.astro';

// Build-time data loading (runs on server)
const books = await getAllBooks();
const notes = await getAllNotes();

// Compute note counts
const noteCounts = new Map<string, number>();
for (const note of notes) {
  noteCounts.set(note.bookId, (noteCounts.get(note.bookId) || 0) + 1);
}

// Sort books by most recent
books.sort((a, b) => 
  new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()
);
---

<BaseLayout title="Library">
  <h1>My Library</h1>
  <p>{books.length} books • {notes.length} notes</p>
  
  <div class="book-grid">
    {books.map(book => (
      <BookCard 
        book={book} 
        noteCount={noteCounts.get(book.id) || 0} 
      />
    ))}
  </div>
</BaseLayout>
```

**File**: `src/pages/book.astro` (dynamic route)

```astro
---
import { getAllBooks, getNotesByBookId } from '@/lib/server/storage';
import NoteCard from '@/components/notes/NoteCard.astro';
import BaseLayout from '@/layouts/BaseLayout.astro';

// Generate static paths for all books
export async function getStaticPaths() {
  const books = await getAllBooks();
  
  return books.map(book => ({
    params: { id: book.id },
    props: { book }
  }));
}

const { book } = Astro.props;
const notes = await getNotesByBookId(book.id);
---

<BaseLayout title={book.title}>
  <h1>{book.title}</h1>
  <p class="author">by {book.author}</p>
  <p>{notes.length} notes</p>
  
  <div class="notes-list">
    {notes.map(note => (
      <NoteCard note={note} />
    ))}
  </div>
</BaseLayout>
```

#### Step 5: Update Components

**File**: `src/components/notes/BookCard.astro`

Remove any client-side DB calls, use props only:

```astro
---
import type { Book } from '@/lib/types';

interface Props {
  book: Book;
  noteCount: number;
}

const { book, noteCount } = Astro.props;
---

<div class="book-card">
  <h3>{book.title}</h3>
  <p class="author">{book.author}</p>
  <p class="note-count">{noteCount} notes</p>
  <a href={`/book/${book.id}`}>View notes</a>
</div>
```

**File**: `src/components/notes/NoteCard.astro`

```astro
---
import type { Note } from '@/lib/types';

interface Props {
  note: Note;
}

const { note } = Astro.props;
---

<div class="note-card" data-note-id={note.id}>
  <p class="note-type">{note.type}</p>
  <blockquote>{note.text}</blockquote>
  {note.location && (
    <p class="location">Location {note.location.start}</p>
  )}
  {note.page && (
    <p class="page">Page {note.page}</p>
  )}
</div>
```

#### Step 6: Remove Client-Side Database

**Delete these files**:
```bash
rm src/lib/storage/database.ts
rm src/lib/storage/books.ts
rm src/lib/storage/notes.ts
rm src/lib/storage/uploads.ts
rm src/lib/storage/interface.ts
rm -rf src/lib/storage/  # Remove entire directory
```

**Update package.json**:
```json
{
  "dependencies": {
    "astro": "^5.17.1",
    "minisearch": "^7.2.0"
    // REMOVED: "dexie": "^4.3.0"
  }
}
```

**Update astro.config.mjs**:
```javascript
export default defineConfig({
  output: 'server',
  vite: {
    optimizeDeps: {
      include: ['minisearch']  // REMOVED: 'dexie'
    }
  }
});
```

**Clean install**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Testing Strategy

### 1. Unit Tests

Test storage operations:

```typescript
// tests/unit/storage.test.ts
import { describe, it, expect } from 'vitest';
import { addNotesWithDeduplication } from '@/lib/server/storage';

describe('Deduplication', () => {
  it('should detect duplicate notes by location', async () => {
    const notes = [
      { bookId: 'book1', location: { start: 100 }, text: 'Note 1', ... },
      { bookId: 'book1', location: { start: 100 }, text: 'Note 1 (duplicate)', ... }
    ];
    
    const result = await addNotesWithDeduplication(notes);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
```

### 2. Integration Tests

Test upload flow:

```typescript
// tests/integration/upload.test.ts
import { describe, it, expect } from 'vitest';

describe('Upload API', () => {
  it('should process Kindle clippings file', async () => {
    const file = new File([sampleClippings], 'clippings.txt');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.stats.booksAdded).toBeGreaterThan(0);
  });
});
```

### 3. E2E Tests

```typescript
// tests/e2e/library.spec.ts
import { test, expect } from '@playwright/test';

test('library page loads with books', async ({ page }) => {
  await page.goto('/library');
  
  // Should show books without loading spinners
  await expect(page.locator('.book-card')).toHaveCount(0, { timeout: 100 });
  // Content should be immediate (pre-rendered)
  await expect(page.locator('h1')).toHaveText('My Library');
});
```

## Verification Checklist

- [ ] Server storage operations work (create, read, deduplication)
- [ ] Upload API processes files and stores data server-side
- [ ] Library page loads with pre-rendered book cards
- [ ] Book detail pages load with pre-rendered notes
- [ ] Location data preserved in all notes
- [ ] Duplicate notes detected and skipped correctly
- [ ] Client-side database code completely removed
- [ ] Dexie dependency removed from package.json
- [ ] Bundle size reduced by ~45KB
- [ ] All tests passing
- [ ] Build completes in <30 seconds
- [ ] Page loads instant (<500ms)

## Performance Metrics

**Expected Improvements**:
- Client bundle: -45KB (Dexie removed)
- Initial page load: <500ms (pre-rendered HTML)
- Upload processing: <5 seconds (10,000 notes)
- Build time: <30 seconds (1,000 books)

**Verify with**:
```bash
# Build and check bundle size
npm run build
du -sh dist/

# Check bundle composition
npx astro build --analyze

# Test upload performance
time curl -F "file=@clippings.txt" http://localhost:3000/api/upload
```

## Troubleshooting

### Issue: "Cannot read file during build"

**Solution**: Ensure data directory exists:
```typescript
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
```

### Issue: "Notes without location not deduplicated"

**Solution**: Implement fallback unique key:
```typescript
function getUniqueKey(note: Note): string {
  if (note.location?.start) {
    return `${note.bookId}-${note.location.start}`;
  }
  // Fallback: hash content
  return `${note.bookId}-${hashContent(note.text)}`;
}
```

### Issue: "Build time too slow"

**Solution**: Implement caching:
```typescript
let booksCache: Book[] | null = null;

export async function getAllBooks(): Promise<Book[]> {
  if (!booksCache) {
    booksCache = await loadBooksFromFile();
  }
  return booksCache;
}
```

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes** to server storage or components
3. **Test upload** via UI at `http://localhost:3000`
4. **Verify library** shows updated data
5. **Run tests**: `npm test`
6. **Build**: `npm run build`
7. **Commit** with descriptive message

## Next Steps

After completing this migration:

1. **Phase 2**: Implement user annotation features using note locations as foreign keys
2. **Enhancement**: Add search functionality using MiniSearch with server data
3. **Optimization**: Implement pagination for large libraries (>100 books)
4. **Feature**: Export functionality for backup/sharing

## Resources

- [Astro Build-Time Data Loading](https://docs.astro.build/en/guides/data-fetching/)
- [Astro Dynamic Routes](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes)
- [Node.js File System](https://nodejs.org/api/fs.html)
- Feature spec: [specs/003-server-side-storage/spec.md](../spec.md)
- Data model: [specs/003-server-side-storage/data-model.md](../data-model.md)
- API contracts: [specs/003-server-side-storage/contracts/interfaces.md](../contracts/interfaces.md)
