/**
 * Dexie Database Schema
 * 
 * Defines IndexedDB tables and indexes for the reading session tracker
 * and canonical book catalog features.
 * 
 * Tables: books, notes, readingSessions, canonicalBooks, bookAliases, syncMeta
 */
import Dexie, { type EntityTable } from 'dexie';
import type {
    Book,
    Note,
    ReadingSession,
    CanonicalBookIdentity,
    BookAlias,
    SyncMeta,
} from '../types';

export class KindleNotesDB extends Dexie {
    books!: EntityTable<Book, 'id'>;
    notes!: EntityTable<Note, 'id'>;
    readingSessions!: EntityTable<ReadingSession, 'id'>;
    canonicalBooks!: EntityTable<CanonicalBookIdentity, 'canonicalBookId'>;
    bookAliases!: EntityTable<BookAlias, 'id'>;
    syncMeta!: EntityTable<SyncMeta, 'key'>;

    constructor() {
        super('kindle-notes-db');

        this.version(1).stores({
            // Existing app tables
            books: 'id, title, author, [title+author]',
            notes: 'id, bookId, type, createdAt, [bookId+type]',

            // Reading session tracker tables
            readingSessions: 'id, sessionDate, canonicalBookId, [canonicalBookId+sessionDate], updatedAt',
            canonicalBooks: 'canonicalBookId, googleVolumeId, titleNormalized, [titleNormalized+matchStatus], matchStatus',
            bookAliases: 'id, normalizedKey, canonicalBookId, [normalizedKey+canonicalBookId]',

            // Migration/versioning metadata
            syncMeta: 'key',
        });
    }
}
