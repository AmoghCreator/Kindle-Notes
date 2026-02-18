/**
 * Canonical Books Repository
 * 
 * CRUD operations for CanonicalBookIdentity records in Dexie.
 */
import { getDB } from '../index';
import type { CanonicalBookIdentity } from '../../types';
import { normalizeTitle } from '../../matching/canonicalize';

/**
 * Get a canonical book by its ID.
 */
export async function getCanonicalBook(canonicalBookId: string): Promise<CanonicalBookIdentity | undefined> {
    const db = getDB();
    return db.canonicalBooks.get(canonicalBookId);
}

/**
 * Get a canonical book by Google Volume ID.
 */
export async function getCanonicalBookByVolumeId(googleVolumeId: string): Promise<CanonicalBookIdentity | undefined> {
    const db = getDB();
    return db.canonicalBooks.where('googleVolumeId').equals(googleVolumeId).first();
}

/**
 * Find canonical books by normalized title.
 */
export async function findCanonicalBooksByTitle(title: string): Promise<CanonicalBookIdentity[]> {
    const db = getDB();
    const normalized = normalizeTitle(title);
    return db.canonicalBooks.where('titleNormalized').equals(normalized).toArray();
}

/**
 * Create a new canonical book record.
 */
export async function createCanonicalBook(
    identity: Omit<CanonicalBookIdentity, 'createdAt' | 'updatedAt'>
): Promise<CanonicalBookIdentity> {
    const db = getDB();
    const now = new Date();
    const record: CanonicalBookIdentity = {
        ...identity,
        createdAt: now,
        updatedAt: now,
    };
    await db.canonicalBooks.put(record);
    return record;
}

/**
 * Update an existing canonical book record.
 */
export async function updateCanonicalBook(
    canonicalBookId: string,
    updates: Partial<Omit<CanonicalBookIdentity, 'canonicalBookId' | 'createdAt'>>
): Promise<void> {
    const db = getDB();
    await db.canonicalBooks.update(canonicalBookId, {
        ...updates,
        updatedAt: new Date(),
    });
}

/**
 * Resolve or create a canonical book identity.
 * 
 * If a canonical record with the given googleVolumeId exists, return it.
 * If a matching normalized title exists with the same match status, return it.
 * Otherwise, create a new record.
 */
export async function resolveOrCreateCanonical(
    input: {
        titleCanonical: string;
        authorsCanonical?: string[];
        googleVolumeId?: string;
        isbn13?: string;
        coverUrl?: string;
        matchStatus: CanonicalBookIdentity['matchStatus'];
        matchSource: CanonicalBookIdentity['matchSource'];
    }
): Promise<CanonicalBookIdentity> {
    const db = getDB();

    // Try by Google Volume ID first (strongest match)
    if (input.googleVolumeId) {
        const existing = await getCanonicalBookByVolumeId(input.googleVolumeId);
        if (existing) {
            // Update metadata if needed
            await updateCanonicalBook(existing.canonicalBookId, {
                coverUrl: input.coverUrl || existing.coverUrl,
                isbn13: input.isbn13 || existing.isbn13,
                matchStatus: input.matchStatus === 'verified' ? 'verified' : existing.matchStatus,
            });
            return { ...existing, coverUrl: input.coverUrl || existing.coverUrl };
        }
    }

    // Try by normalized title
    const normalized = normalizeTitle(input.titleCanonical);
    const existing = await db.canonicalBooks
        .where('titleNormalized')
        .equals(normalized)
        .first();

    if (existing && !existing.googleVolumeId && input.googleVolumeId) {
        // Upgrade existing provisional record with verified metadata
        await updateCanonicalBook(existing.canonicalBookId, {
            googleVolumeId: input.googleVolumeId,
            coverUrl: input.coverUrl || existing.coverUrl,
            isbn13: input.isbn13 || existing.isbn13,
            authorsCanonical: input.authorsCanonical || existing.authorsCanonical,
            matchStatus: input.matchStatus,
            matchSource: input.matchSource,
        });
        return { ...existing, googleVolumeId: input.googleVolumeId, matchStatus: input.matchStatus };
    }

    if (existing) {
        return existing;
    }

    // Create new canonical record
    return createCanonicalBook({
        canonicalBookId: crypto.randomUUID(),
        titleCanonical: input.titleCanonical,
        titleNormalized: normalized,
        authorsCanonical: input.authorsCanonical,
        googleVolumeId: input.googleVolumeId,
        isbn13: input.isbn13,
        coverUrl: input.coverUrl,
        matchStatus: input.matchStatus,
        matchSource: input.matchSource,
    });
}

/**
 * Get all canonical books.
 */
export async function getAllCanonicalBooks(): Promise<CanonicalBookIdentity[]> {
    const db = getDB();
    return db.canonicalBooks.toArray();
}
