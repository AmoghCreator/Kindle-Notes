# API Contracts: Server-Side Storage for Kindle Clippings

**Feature**: 003-server-side-storage  
**Phase**: 1 - Design  
**Date**: February 11, 2026

## Overview

This document defines the interface contracts for server-side storage operations. These are **internal TypeScript interfaces**, not REST API endpoints. All operations are server-side Node.js functions called from Astro pages and API routes.

## Storage Operations Interface

### Book Operations

```typescript
/**
 * Retrieve all books from server storage
 * Used at build time for library page generation
 * @returns Promise resolving to array of all books
 */
export async function getAllBooks(): Promise<Book[]>;

/**
 * Get a single book by ID
 * Used at build time for individual book pages
 * @param id - Unique book identifier
 * @returns Promise resolving to book or null if not found
 */
export async function getBookById(id: string): Promise<Book | null>;

/**
 * Add or update a book
 * Used during upload processing
 * @param book - Book object to save
 */
export async function addBook(book: Book): Promise<void>;

/**
 * Save entire book collection
 * Internal helper for atomic updates
 * @param books - Complete array of books
 */
export async function saveBooks(books: Book[]): Promise<void>;

/**
 * Update book note count
 * Called after notes are added/removed
 * @param bookId - Book to update
 * @param count - New note count
 */
export async function updateBookNoteCount(bookId: string, count: number): Promise<void>;
```

---

### Note Operations

```typescript
/**
 * Retrieve all notes from server storage
 * Used at build time for search index and library stats
 * @returns Promise resolving to array of all notes
 */
export async function getAllNotes(): Promise<Note[]>;

/**
 * Get notes for a specific book
 * Used at build time for book detail pages
 * @param bookId - Book identifier
 * @returns Promise resolving to array of notes for the book
 */
export async function getNotesByBookId(bookId: string): Promise<Note[]>;

/**
 * Get a single note by ID
 * Used for future annotation features
 * @param id - Unique note identifier
 * @returns Promise resolving to note or null if not found
 */
export async function getNoteById(id: string): Promise<Note | null>;

/**
 * Get recent notes across all books
 * Used for dashboard/home page
 * @param limit - Maximum number of notes to return (default: 10)
 * @returns Promise resolving to array of recent notes
 */
export async function getRecentNotes(limit?: number): Promise<Note[]>;

/**
 * Add notes with deduplication
 * Used during upload processing
 * @param newNotes - Array of notes to add
 * @returns Promise resolving to deduplication stats
 */
export async function addNotesWithDeduplication(
  newNotes: Note[]
): Promise<DeduplicationResult>;

/**
 * Save entire note collection
 * Internal helper for atomic updates
 * @param notes - Complete array of notes
 */
export async function saveNotes(notes: Note[]): Promise<void>;

/**
 * Find note by location
 * Critical for future annotation features
 * @param bookId - Book identifier
 * @param locationStart - Note location start position
 * @returns Promise resolving to note or null if not found
 */
export async function findNoteByLocation(
  bookId: string,
  locationStart: number
): Promise<Note | null>;
```

---

### Upload Session Operations

```typescript
/**
 * Create a new upload session
 * Called at the start of file upload
 * @param filename - Original filename
 * @param fileSize - File size in bytes
 * @returns Promise resolving to new session ID
 */
export async function createUploadSession(
  filename: string,
  fileSize: number
): Promise<string>;

/**
 * Update upload session status
 * Called during and after upload processing
 * @param sessionId - Session identifier
 * @param status - New status
 * @param stats - Optional processing statistics
 * @param errorMessage - Optional error message if failed
 */
export async function updateUploadSession(
  sessionId: string,
  status: UploadStatus,
  stats?: UploadStats,
  errorMessage?: string
): Promise<void>;

/**
 * Get upload session by ID
 * Used for status checking and history display
 * @param sessionId - Session identifier
 * @returns Promise resolving to session or null if not found
 */
export async function getUploadSession(sessionId: string): Promise<UploadSession | null>;

/**
 * Get all upload sessions
 * Used for upload history page
 * @param limit - Maximum number of sessions to return
 * @returns Promise resolving to array of sessions, most recent first
 */
export async function getAllUploadSessions(limit?: number): Promise<UploadSession[]>;
```

---

## Supporting Type Definitions

```typescript
/**
 * Result of deduplication operation
 */
export interface DeduplicationResult {
  added: number;          // Number of new notes added
  skipped: number;        // Number of duplicate notes skipped
  errors?: string[];      // Optional parsing/validation errors
}

/**
 * Upload processing statistics
 */
export interface UploadStats {
  booksAdded: number;
  booksUpdated: number;
  notesAdded: number;
  notesSkipped: number;
  parseErrors: number;
}

/**
 * Upload session status enum
 */
export type UploadStatus = 'processing' | 'completed' | 'failed';

/**
 * Book entity (from data-model.md)
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  noteCount: number;
  tags?: string[];
  createdAt: Date;
  lastModifiedAt: Date;
  coverUrl?: string;
}

/**
 * Note entity (from data-model.md)
 */
export interface Note {
  id: string;
  bookId: string;
  type: 'highlight' | 'note' | 'bookmark';
  text: string;
  location: {
    start: number;
    end?: number;
  };
  page?: number;
  dateAdded: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  tags?: string[];
  shareHistory?: ShareRecord[];
}

/**
 * Upload session entity (from data-model.md)
 */
export interface UploadSession {
  id: string;
  filename: string;
  fileSize: number;
  status: UploadStatus;
  startedAt: Date;
  completedAt?: Date;
  stats: UploadStats;
  errorMessage?: string;
}

/**
 * Share record (future feature)
 */
export interface ShareRecord {
  sharedAt: Date;
  platform: string;
  recipient?: string;
}
```

---

## Build-Time Data Access Pattern

These functions are used in Astro page frontmatter for build-time data injection:

```typescript
// library.astro
---
import { getAllBooks, getAllNotes } from '@/lib/server/storage';

// Loaded once during build, cached in memory
const books = await getAllBooks();
const notes = await getAllNotes();

// Compute note counts per book
const noteCounts = new Map<string, number>();
for (const note of notes) {
  noteCounts.set(note.bookId, (noteCounts.get(note.bookId) || 0) + 1);
}
---

<div>
  {books.map(book => (
    <BookCard 
      book={book} 
      noteCount={noteCounts.get(book.id) || 0} 
    />
  ))}
</div>
```

```typescript
// book.astro (dynamic route)
---
import { getAllBooks, getNotesByBookId } from '@/lib/server/storage';

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

<div>
  <h1>{book.title}</h1>
  {notes.map(note => (
    <NoteCard note={note} />
  ))}
</div>
```

---

## Upload API Endpoint

**Single REST endpoint** for file upload (uses storage operations internally):

```typescript
// POST /api/upload
export async function POST({ request }: APIContext) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 1. Create upload session
    const sessionId = await createUploadSession(file.name, file.size);
    
    // 2. Parse file
    const text = await file.text();
    const { books: parsedBooks, notes: parsedNotes } = parseKindleClippings(text);
    
    // 3. Save books and notes with deduplication
    for (const book of parsedBooks) {
      await addBook(book);
    }
    
    const deduplicationResult = await addNotesWithDeduplication(parsedNotes);
    
    // 4. Update book note counts
    const bookNoteMap = new Map<string, number>();
    const allNotes = await getAllNotes();
    for (const note of allNotes) {
      bookNoteMap.set(note.bookId, (bookNoteMap.get(note.bookId) || 0) + 1);
    }
    for (const [bookId, count] of bookNoteMap) {
      await updateBookNoteCount(bookId, count);
    }
    
    // 5. Complete upload session
    const stats: UploadStats = {
      booksAdded: parsedBooks.length,
      booksUpdated: 0, // Computed during book save
      notesAdded: deduplicationResult.added,
      notesSkipped: deduplicationResult.skipped,
      parseErrors: deduplicationResult.errors?.length || 0
    };
    
    await updateUploadSession(sessionId, 'completed', stats);
    
    return new Response(JSON.stringify({
      success: true,
      sessionId,
      stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    await updateUploadSession(sessionId, 'failed', undefined, error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing Kindle clippings text file

**Response (Success)**:
```json
{
  "success": true,
  "sessionId": "upload-abc123",
  "stats": {
    "booksAdded": 3,
    "booksUpdated": 5,
    "notesAdded": 127,
    "notesSkipped": 45,
    "parseErrors": 0
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Failed to parse clippings file: Invalid format"
}
```

---

## Error Handling

All storage operations should follow consistent error handling:

```typescript
/**
 * Storage error types
 */
export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class NotFoundError extends StorageError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends StorageError {
  constructor(message: string) {
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Example error handling in storage operations
 */
export async function getBookById(id: string): Promise<Book | null> {
  try {
    const books = await getAllBooks();
    const book = books.find(b => b.id === id);
    return book || null;
  } catch (error) {
    throw new StorageError('Failed to retrieve book', error);
  }
}
```

---

## Caching Strategy

For build-time performance, storage operations use module-level caching:

```typescript
// Module-level cache (persists across multiple calls during build)
let booksCache: Book[] | null = null;
let notesCache: Note[] | null = null;

/**
 * Get all books with caching for build performance
 * Cache is cleared on server restart
 */
export async function getAllBooks(): Promise<Book[]> {
  if (booksCache === null) {
    const content = await fs.readFile(BOOKS_FILE, 'utf-8');
    booksCache = JSON.parse(content);
  }
  return booksCache;
}

/**
 * Clear all caches (called after data mutations)
 */
export function clearCache(): void {
  booksCache = null;
  notesCache = null;
}

/**
 * Save books and invalidate cache
 */
export async function saveBooks(books: Book[]): Promise<void> {
  await ensureDataDir();
  const tempFile = `${BOOKS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(books, null, 2));
  await fs.rename(tempFile, BOOKS_FILE);
  clearCache(); // Invalidate cache after write
}
```

---

## Testing Contracts

All storage operations must have corresponding tests:

```typescript
// tests/integration/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAllBooks, addBook, getBookById } from '@/lib/server/storage';

describe('Book Storage Operations', () => {
  beforeEach(async () => {
    // Clear test data before each test
    await clearTestData();
  });
  
  it('should retrieve all books', async () => {
    const books = await getAllBooks();
    expect(Array.isArray(books)).toBe(true);
  });
  
  it('should add and retrieve a book', async () => {
    const book: Book = {
      id: 'test-book',
      title: 'Test Book',
      author: 'Test Author',
      noteCount: 0,
      createdAt: new Date(),
      lastModifiedAt: new Date()
    };
    
    await addBook(book);
    const retrieved = await getBookById('test-book');
    
    expect(retrieved).toMatchObject({
      id: 'test-book',
      title: 'Test Book',
      author: 'Test Author'
    });
  });
});
```

---

## Summary

**Total Operations**: 15 storage functions  
**REST Endpoints**: 1 (POST /api/upload)  
**Primary Usage**: Astro build-time data injection  
**Caching**: Module-level for build performance  
**Error Handling**: Typed exceptions with cause tracking  
**Testing**: Unit and integration tests for all operations

This interface provides a clean separation between data persistence and application logic, enabling easy testing and future migration to different storage backends if needed.
