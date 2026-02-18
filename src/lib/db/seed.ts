/**
 * Legacy Data Hydration / Migration
 * 
 * One-time migration from existing JSON data files into Dexie IndexedDB tables.
 * Uses syncMeta table to track migration version and ensure idempotency.
 */
import { getDB } from './index';
import type { Book, Note, CanonicalBookIdentity } from '../types';
import { normalizeTitle } from '../matching/canonicalize';

const MIGRATION_VERSION_KEY = 'legacy-hydration-version';
const CURRENT_MIGRATION_VERSION = 1;

/**
 * Check if legacy hydration has already been performed.
 */
export async function isMigrationComplete(): Promise<boolean> {
    const db = getDB();
    const meta = await db.syncMeta.get(MIGRATION_VERSION_KEY);
    return meta !== undefined && Number(meta.value) >= CURRENT_MIGRATION_VERSION;
}

/**
 * Run one-time legacy hydration from JSON data into Dexie.
 * 
 * Rules:
 * 1. If Dexie stores are empty and legacy data is present, hydrate.
 * 2. Generate canonicalBookId for legacy books lacking canonical metadata.
 * 3. Record migration version in syncMeta for idempotency.
 */
export async function runLegacyHydration(
    legacyBooks: Book[],
    legacyNotes: Note[],
): Promise<{ booksHydrated: number; notesHydrated: number; canonicalCreated: number }> {
    const db = getDB();

    // Check if already migrated
    if (await isMigrationComplete()) {
        return { booksHydrated: 0, notesHydrated: 0, canonicalCreated: 0 };
    }

    // Check if Dexie already has data (avoid double-hydration)
    const existingBookCount = await db.books.count();
    if (existingBookCount > 0) {
        // Mark as migrated since data exists
        await markMigrationComplete();
        return { booksHydrated: 0, notesHydrated: 0, canonicalCreated: 0 };
    }

    let canonicalCreated = 0;

    // Hydrate books and create provisional canonical records
    const canonicalMap = new Map<string, string>(); // bookId -> canonicalBookId

    await db.transaction('rw', [db.books, db.notes, db.canonicalBooks, db.bookAliases, db.syncMeta], async () => {
        // Hydrate books
        for (const book of legacyBooks) {
            await db.books.put(book);

            // Create provisional canonical record for each book
            const canonicalBookId = crypto.randomUUID();
            canonicalMap.set(book.id, canonicalBookId);

            const canonical: CanonicalBookIdentity = {
                canonicalBookId,
                titleCanonical: book.title,
                titleNormalized: normalizeTitle(book.title),
                authorsCanonical: book.author ? [book.author] : undefined,
                matchStatus: 'unverified',
                matchSource: 'import-fallback',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.canonicalBooks.put(canonical);
            canonicalCreated++;

            // Create alias mapping
            await db.bookAliases.put({
                id: crypto.randomUUID(),
                normalizedKey: normalizeTitle(book.title),
                rawTitle: book.title,
                rawAuthor: book.author,
                canonicalBookId,
                confidence: 0,
                resolution: 'provisional',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // Hydrate notes
        for (const note of legacyNotes) {
            await db.notes.put(note);
        }

        // Mark migration complete
        await db.syncMeta.put({
            key: MIGRATION_VERSION_KEY,
            value: CURRENT_MIGRATION_VERSION,
            updatedAt: new Date(),
        });
    });

    return {
        booksHydrated: legacyBooks.length,
        notesHydrated: legacyNotes.length,
        canonicalCreated,
    };
}

/**
 * Mark the migration as complete without running it.
 */
async function markMigrationComplete(): Promise<void> {
    const db = getDB();
    await db.syncMeta.put({
        key: MIGRATION_VERSION_KEY,
        value: CURRENT_MIGRATION_VERSION,
        updatedAt: new Date(),
    });
}
