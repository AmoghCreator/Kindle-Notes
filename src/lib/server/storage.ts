import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Book, Note, DeduplicationResult, UploadSession, UploadStats, StorageError } from '../types';
import { ValidationError } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');

// Module-level cache for build performance
let booksCache: Book[] | null = null;
let notesCache: Note[] | null = null;
let uploadsCache: UploadSession[] | null = null;

/**
 * Clear all caches (called after data mutations)
 */
export function clearCache(): void {
    booksCache = null;
    notesCache = null;
    uploadsCache = null;
}

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create data directory:', error);
    }
}

// Books storage
export async function getAllBooks(): Promise<Book[]> {
    if (booksCache !== null) {
        return booksCache;
    }

    try {
        const content = await fs.readFile(BOOKS_FILE, 'utf-8');
        booksCache = JSON.parse(content);
        return booksCache;
    } catch (error) {
        booksCache = []; // Cache empty array if file doesn't exist
        return booksCache;
    }
}

export async function saveBooks(books: Book[]): Promise<void> {
    await ensureDataDir();
    // Atomic write using temp file + rename pattern
    const tempFile = `${BOOKS_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(books, null, 2), 'utf-8');
    await fs.rename(tempFile, BOOKS_FILE);
    clearCache(); // Invalidate cache after write
}

export async function getBookById(id: string): Promise<Book | null> {
    const books = await getAllBooks();
    return books.find(book => book.id === id) || null;
}

/**
 * Find book by title and author (for deduplication)
 */
export async function findBookByTitleAndAuthor(title: string, author?: string): Promise<Book | null> {
    const books = await getAllBooks();
    return books.find(book =>
        book.title === title && book.author === author
    ) || null;
}

export async function addBook(book: Book): Promise<Book> {
    const books = await getAllBooks();
    // Deduplicate by title and author, not by ID
    const existingIndex = books.findIndex(b =>
        b.title === book.title && b.author === book.author
    );

    if (existingIndex >= 0) {
        // Update existing book, preserve ID
        const existingBook = books[existingIndex];
        books[existingIndex] = {
            ...book,
            id: existingBook.id, // Keep original ID
            createdAt: existingBook.createdAt, // Keep original creation date
            lastModifiedAt: new Date() // Update modification date
        };
        await saveBooks(books);
        return books[existingIndex];
    } else {
        // Add new book
        books.push(book);
        await saveBooks(books);
        return book;
    }
}

// Notes storage
export async function getAllNotes(): Promise<Note[]> {
    if (notesCache !== null) {
        return notesCache;
    }

    try {
        const content = await fs.readFile(NOTES_FILE, 'utf-8');
        notesCache = JSON.parse(content);
        return notesCache;
    } catch (error) {
        notesCache = []; // Cache empty array if file doesn't exist
        return notesCache;
    }
}

export async function saveNotes(notes: Note[]): Promise<void> {
    await ensureDataDir();
    // Atomic write using temp file + rename pattern
    const tempFile = `${NOTES_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(notes, null, 2), 'utf-8');
    await fs.rename(tempFile, NOTES_FILE);
    clearCache(); // Invalidate cache after write
}

export async function getNotesByBookId(bookId: string): Promise<Note[]> {
    const notes = await getAllNotes();
    return notes.filter(note => note.bookId === bookId);
}

export async function addNotes(newNotes: Note[]): Promise<void> {
    const existingNotes = await getAllNotes();
    const notesMap = new Map(existingNotes.map(n => [n.id, n]));

    // Merge new notes (replace duplicates by ID)
    for (const note of newNotes) {
        notesMap.set(note.id, note);
    }

    await saveNotes(Array.from(notesMap.values()));
}

export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
    const notes = await getAllNotes();
    return notes
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
}
/**
 * Generate unique key for note deduplication
 * Uses bookId + location.start, falls back to content hash
 */
function getUniqueKey(note: Note): string {
    if (note.location?.start) {
        return `${note.bookId}-${note.location.start}`;
    }
    // Fallback for notes without location: hash content
    const hash = crypto.createHash('md5').update(note.text || '').digest('hex').substring(0, 8);
    return `${note.bookId}-${hash}`;
}

/**
 * Find note by location (critical for future annotation features)
 */
export async function findNoteByLocation(
    bookId: string,
    locationStart: number
): Promise<Note | null> {
    const notes = await getAllNotes();
    return notes.find(n => n.bookId === bookId && n.location?.start === locationStart) || null;
}

/**
 * Add notes with deduplication based on location
 */
export async function addNotesWithDeduplication(
    newNotes: Note[]
): Promise<DeduplicationResult> {
    const existing = await getAllNotes();
    const existingMap = new Map(
        existing.map(n => [getUniqueKey(n), n])
    );

    const added: Note[] = [];
    const skipped: Note[] = [];
    const errors: string[] = [];

    for (const note of newNotes) {
        try {
            const key = getUniqueKey(note);
            if (!existingMap.has(key)) {
                added.push(note);
                existingMap.set(key, note);
            } else {
                skipped.push(note);
            }
        } catch (error) {
            errors.push(`Failed to process note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    if (added.length > 0) {
        await saveNotes(Array.from(existingMap.values()));
    }

    return {
        added: added.length,
        skipped: skipped.length,
        errors: errors.length > 0 ? errors : undefined
    };
}

/**
 * Update book note count
 */
export async function updateBookNoteCount(bookId: string, count: number): Promise<void> {
    const books = await getAllBooks();
    const book = books.find(b => b.id === bookId);

    if (book) {
        book.noteCount = count;
        book.lastModifiedAt = new Date();
        await saveBooks(books);
    }
}

/**
 * Get all upload sessions
 */
export async function getAllUploadSessions(limit?: number): Promise<UploadSession[]> {
    if (uploadsCache !== null) {
        return limit ? uploadsCache.slice(0, limit) : uploadsCache;
    }

    try {
        const content = await fs.readFile(UPLOADS_FILE, 'utf-8');
        uploadsCache = JSON.parse(content);
        return limit ? uploadsCache.slice(0, limit) : uploadsCache;
    } catch (error) {
        uploadsCache = [];
        return uploadsCache;
    }
}

/**
 * Save upload sessions
 */
async function saveUploadSessions(sessions: UploadSession[]): Promise<void> {
    await ensureDataDir();
    const tempFile = `${UPLOADS_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(sessions, null, 2), 'utf-8');
    await fs.rename(tempFile, UPLOADS_FILE);
    clearCache();
}

/**
 * Create a new upload session
 */
export async function createUploadSession(
    filename: string,
    fileSize: number
): Promise<string> {
    const sessions = await getAllUploadSessions();
    const sessionId = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const newSession: UploadSession = {
        id: sessionId,
        filename,
        fileSize,
        status: 'processing',
        startedAt: new Date(),
        stats: {
            booksAdded: 0,
            booksUpdated: 0,
            notesAdded: 0,
            notesSkipped: 0,
            parseErrors: 0
        }
    };

    sessions.unshift(newSession); // Add to beginning
    await saveUploadSessions(sessions);

    return sessionId;
}

/**
 * Update upload session status
 */
export async function updateUploadSession(
    sessionId: string,
    status: 'processing' | 'completed' | 'failed',
    stats?: UploadStats,
    errorMessage?: string
): Promise<void> {
    const sessions = await getAllUploadSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
        session.status = status;
        if (stats) {
            session.stats = stats;
        }
        if (status === 'completed' || status === 'failed') {
            session.completedAt = new Date();
        }
        if (errorMessage) {
            session.errorMessage = errorMessage;
        }

        await saveUploadSessions(sessions);
    }
}

/**
 * Get upload session by ID
 */
export async function getUploadSession(sessionId: string): Promise<UploadSession | null> {
    const sessions = await getAllUploadSessions();
    return sessions.find(s => s.id === sessionId) || null;
}