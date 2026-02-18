/**
 * Book Aliases Repository
 * 
 * CRUD operations for BookAlias records in Dexie.
 * Maps raw (imported or manually entered) book names to canonical IDs.
 */
import { getDB } from '../index';
import type { BookAlias } from '../../types';
import { normalizeTitle } from '../../matching/canonicalize';

/**
 * Find an alias by normalized title key.
 */
export async function findAliasByNormalizedKey(rawTitle: string): Promise<BookAlias | undefined> {
  const db = getDB();
  const normalized = normalizeTitle(rawTitle);
  return db.bookAliases.where('normalizedKey').equals(normalized).first();
}

/**
 * Find all aliases for a canonical book.
 */
export async function findAliasesByCanonicalId(canonicalBookId: string): Promise<BookAlias[]> {
  const db = getDB();
  return db.bookAliases.where('canonicalBookId').equals(canonicalBookId).toArray();
}

/**
 * Create a new book alias mapping.
 */
export async function createAlias(
  input: {
    rawTitle: string;
    rawAuthor?: string;
    canonicalBookId: string;
    confidence: number;
    resolution: BookAlias['resolution'];
  }
): Promise<BookAlias> {
  const db = getDB();
  const now = new Date();
  const alias: BookAlias = {
    id: crypto.randomUUID(),
    normalizedKey: normalizeTitle(input.rawTitle),
    rawTitle: input.rawTitle,
    rawAuthor: input.rawAuthor,
    canonicalBookId: input.canonicalBookId,
    confidence: input.confidence,
    resolution: input.resolution,
    createdAt: now,
    updatedAt: now,
  };
  await db.bookAliases.put(alias);
  return alias;
}

/**
 * Update alias resolution (e.g. upgrade from provisional to user-confirmed).
 */
export async function updateAliasResolution(
  aliasId: string,
  resolution: BookAlias['resolution'],
  confidence: number
): Promise<void> {
  const db = getDB();
  await db.bookAliases.update(aliasId, {
    resolution,
    confidence,
    updatedAt: new Date(),
  });
}

/**
 * Resolve alias → canonical book ID for a raw title.
 * Returns the canonical book ID if an alias mapping exists.
 */
export async function resolveCanonicalIdFromTitle(rawTitle: string): Promise<string | undefined> {
  const alias = await findAliasByNormalizedKey(rawTitle);
  return alias?.canonicalBookId;
}
