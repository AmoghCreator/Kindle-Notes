# Research: Server-Side Storage for Kindle Clippings

**Feature**: 003-server-side-storage  
**Phase**: 0 - Research & Decision Making  
**Date**: February 11, 2026

## Research Questions

### 1. How to inject server data into Astro components at build time?

**Decision**: Use Astro's `getStaticPaths()` for dynamic routes and direct imports in static pages

**Rationale**:
- Astro supports importing server-side modules directly in `.astro` files
- `getStaticPaths()` allows pre-rendering dynamic routes with data
- Frontmatter scripts run at build time with Node.js access
- Current config uses `output: 'server'` which supports both SSR and SSG patterns

**Implementation Pattern**:
```typescript
---
// library.astro - Build-time data loading
import { getAllBooks, getAllNotes } from '@/lib/server/storage';

const books = await getAllBooks();
const notes = await getAllNotes();
---

<BookCard book={book} noteCount={notes.filter(n => n.bookId === book.id).length} />
```

**Alternatives Considered**:
- API endpoints with client-side fetching: Rejected - defeats purpose of removing client DB
- Content collections: Rejected - designed for markdown/content files, not dynamic JSON
- Environment variables: Rejected - not suitable for dynamic data

### 2. What's the best file-based storage pattern for this use case?

**Decision**: Simple JSON files with atomic writes and read caching

**Rationale**:
- Current implementation already uses `fs.readFile()` / `fs.writeFile()` pattern
- Single-user deployment means no concurrent write concerns
- JSON provides human-readable debugging and easy backups
- Node.js file system is fast enough for <10,000 notes

**Implementation Pattern**:
```typescript
// Enhanced with atomic writes
export async function saveNotes(notes: Note[]): Promise<void> {
  await ensureDataDir();
  const tempFile = `${NOTES_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(notes, null, 2));
  await fs.rename(tempFile, NOTES_FILE); // Atomic on POSIX systems
}
```

**Alternatives Considered**:
- SQLite: Rejected - adds dependency, more complex than needed for single user
- MongoDB/PostgreSQL: Rejected - massive overkill for local file storage
- Individual file per book: Rejected - harder to query all books, more file I/O

### 3. How to safely remove client-side database without breaking existing features?

**Decision**: Phased removal with feature flags and parallel data paths

**Strategy**:
1. **Phase 1**: Keep Dexie code but disable initialization, route all reads to server storage
2. **Phase 2**: Update all components to use prop-based data instead of DB queries
3. **Phase 3**: Remove Dexie imports and delete `/src/lib/storage/` directory
4. **Phase 4**: Remove Dexie from `package.json` and Astro config

**Risk Mitigation**:
- Run full E2E test suite after each phase
- Keep git commits atomic per phase for easy rollback
- Test upload → library → book detail flow thoroughly

**Files to Remove**:
```
src/lib/storage/database.ts       # Dexie schema definitions
src/lib/storage/books.ts          # Client-side book operations
src/lib/storage/notes.ts          # Client-side note operations
src/lib/storage/uploads.ts        # Client-side upload tracking
src/lib/storage/interface.ts      # Storage interfaces
public/workers/kindle-parser-worker.js # If only used for client DB
```

**Files to Update**:
```
src/components/notes/BookCard.astro      # Receive data as props
src/components/notes/NoteCard.astro      # Receive data as props
src/components/upload/FileUpload.astro   # Update success handling
src/pages/library.astro                  # Load data at build time
src/pages/book.astro                     # Load data at build time
src/pages/api/upload.ts                  # Save to server storage
astro.config.mjs                         # Remove dexie from optimizeDeps
package.json                             # Remove dexie dependency
```

### 4. What deduplication strategy should we use with location-based IDs?

**Decision**: Use `location.start` + `bookId` as composite unique key

**Rationale**:
- Location start position is unique within a book in Kindle format
- Combining with bookId ensures uniqueness across entire library
- Location data already present in parsed notes
- Enables future annotation feature (location as foreign key)

**Implementation Pattern**:
```typescript
// Deduplication during upload
export async function addNotesWithDeduplication(newNotes: Note[]): Promise<DeduplicationResult> {
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

**Edge Cases Handled**:
- Notes without location: Use content hash as fallback unique key
- Bookmarks (no highlight text): Use location + timestamp
- Notes from different books with same location: bookId differentiates them

**Alternatives Considered**:
- Content-based hashing: Rejected - users may have similar highlights across books
- UUID generation: Rejected - doesn't leverage existing Kindle location metadata
- Page numbers only: Rejected - not all books have page numbers, less precise

### 5. How to ensure build-time performance with large datasets?

**Decision**: In-memory caching with lazy loading and build optimization

**Strategy**:
1. **Read Once**: Load all data once during build, cache in memory
2. **Filter in Memory**: Use JavaScript arrays/filters instead of repeated file reads
3. **Paginate at Build**: Generate multiple pages if library exceeds threshold (100 books/page)
4. **Lazy Book Pages**: Only generate detail pages for books with notes

**Implementation Pattern**:
```typescript
// Cached data loading during build
let booksCache: Book[] | null = null;
let notesCache: Note[] | null = null;

export async function getAllBooksForBuild(): Promise<Book[]> {
  if (!booksCache) {
    booksCache = await getAllBooks();
  }
  return booksCache;
}

// In library.astro
const books = await getAllBooksForBuild(); // Only reads once per build
const notes = await getAllNotesForBuild();
```

**Performance Targets**:
- 1,000 books: <10 seconds build time
- 10,000 notes: <5 seconds parsing + deduplication
- 100 books/page: <500ms page generation

**Alternatives Considered**:
- Database queries: Rejected - file-based storage is faster for read-heavy builds
- Virtual pagination: Rejected - requires client-side JavaScript, defeats purpose
- Service workers for caching: Rejected - not relevant for build-time performance

## Technology Stack Summary

**Retained Technologies**:
- Astro 5.17.1 - Static site generator with SSR support
- TypeScript 5.x - Type safety
- MiniSearch 7.2.0 - Client-side search (fed server data)
- Vitest 4.0.18 - Unit/integration testing
- Playwright 1.58.2 - E2E testing

**Removed Technologies**:
- Dexie.js 4.3.0 - IndexedDB wrapper (~45KB)

**New Patterns**:
- Astro build-time data injection
- File-based JSON storage with atomic writes
- Location-based note deduplication
- In-memory build caching

## Best Practices for Astro SSR/SSG

1. **Data Loading**: Always use async/await in frontmatter, never in component markup
2. **Props Over Fetching**: Pass data as props to components, don't fetch inside components
3. **Build Caching**: Use module-level variables for build-time data caching
4. **Error Boundaries**: Wrap server operations in try-catch with user-friendly error pages
5. **Type Safety**: Define strict TypeScript interfaces for all data structures

## Migration Checklist

- [ ] Update parser to preserve location.start for all notes
- [ ] Enhance server storage with deduplication logic
- [ ] Refactor components to accept data as props
- [ ] Update pages to load data at build time
- [ ] Remove client-side database initialization
- [ ] Update upload API to use server storage
- [ ] Remove Dexie from dependencies
- [ ] Update tests for new architecture
- [ ] Verify bundle size reduction (target: -45KB)
- [ ] Test build performance with large datasets

## Open Questions Resolved

All research questions have been resolved. No [NEEDS CLARIFICATION] markers remain.
