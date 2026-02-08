// IndexedDB database configuration using Dexie.js
import Dexie, { type Table } from 'dexie';
import type { Book, Note, Upload, ImportSession, ParsedTextEntry, DeduplicationResult } from '@/lib/types';

export class KindleNotesDatabase extends Dexie {
    books!: Table<Book, string>;
    notes!: Table<Note, string>;
    uploads!: Table<Upload, string>;
    importSessions!: Table<ImportSession, string>;
    parsedEntries!: Table<ParsedTextEntry, string>;
    deduplicationResults!: Table<DeduplicationResult, string>;

    constructor() {
        super('KindleNotesDB');

        // Version 1: Original schema
        this.version(1).stores({
            // Primary keys and indexes for optimal query performance
            books: '++id, title, author, *tags, createdAt, lastModifiedAt',
            notes: '++id, bookId, *tags, text, type, createdAt, lastModifiedAt, [bookId+createdAt]',
            uploads: '++id, filename, status, createdAt, completedAt'
        });

        // Version 2: Add text import tables
        this.version(2).stores({
            books: '++id, title, author, *tags, createdAt, lastModifiedAt',
            notes: '++id, bookId, *tags, text, type, createdAt, lastModifiedAt, [bookId+createdAt]',
            uploads: '++id, filename, status, createdAt, completedAt',
            importSessions: '++id, fileName, status, startedAt, completedAt',
            parsedEntries: '++id, sessionId, bookIdentifier, entryType, parseIndex, [sessionId+parseIndex]',
            deduplicationResults: '++id, parsedEntryId, decision, existingNoteId, [parsedEntryId+decision]'
        });

        // Hooks for data validation and auto-computed fields
        this.books.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date();
            obj.lastModifiedAt = new Date();
            obj.noteCount = 0; // Will be updated via updateNoteCount method
        });

        this.books.hook('updating', function (modifications, primKey, obj, trans) {
            modifications.lastModifiedAt = new Date();
        });

        this.notes.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date();
            obj.lastModifiedAt = new Date();
            obj.shareHistory = obj.shareHistory || [];
        });

        this.notes.hook('updating', function (modifications, primKey, obj, trans) {
            modifications.lastModifiedAt = new Date();
        });

        this.uploads.hook('creating', function (primKey, obj, trans) {
            obj.startedAt = new Date();
        });
    }

    // Helper methods for common operations
    async updateBookNoteCount(bookId: string): Promise<void> {
        const noteCount = await this.notes.where('bookId').equals(bookId).count();
        await this.books.update(bookId, { noteCount });
    }

    async deleteBookWithNotes(bookId: string): Promise<void> {
        await this.transaction('rw', this.books, this.notes, async () => {
            await this.notes.where('bookId').equals(bookId).delete();
            await this.books.delete(bookId);
        });
    }

    // Search-optimized queries
    async searchNotes(query: string, bookIds?: string[]): Promise<Note[]> {
        let collection = this.notes.orderBy('createdAt');

        if (bookIds && bookIds.length > 0) {
            collection = this.notes.where('bookId').anyOf(bookIds);
        }

        return collection
            .filter(note => {
                const searchText = `${note.text} ${note.userNote || ''}`.toLowerCase();
                return searchText.includes(query.toLowerCase());
            })
            .reverse() // Most recent first
            .toArray();
    }

    async getNotesByBook(bookId: string): Promise<Note[]> {
        return this.notes
            .where('bookId')
            .equals(bookId)
            .orderBy('createdAt')
            .toArray();
    }

    async getRecentNotes(limit = 10): Promise<Note[]> {
        return this.notes
            .orderBy('lastModifiedAt')
            .reverse()
            .limit(limit)
            .toArray();
    }

    async getBooksByTag(tag: string): Promise<Book[]> {
        return this.books
            .where('tags')
            .anyOf([tag])
            .toArray();
    }

    // Bulk operations for import
    async bulkAddBooks(books: Omit<Book, 'id' | 'createdAt' | 'lastModifiedAt'>[]): Promise<string[]> {
        return this.books.bulkAdd(books, { allKeys: true }) as Promise<string[]>;
    }

    async bulkAddNotes(notes: Omit<Note, 'id' | 'createdAt' | 'lastModifiedAt'>[]): Promise<string[]> {
        return this.notes.bulkAdd(notes, { allKeys: true }) as Promise<string[]>;
    }
}

// Singleton database instance
export const DatabaseService = new KindleNotesDatabase();