/**
 * Unified Book History Repository
 * 
 * Combines notes and reading sessions for a canonical book
 * into a single chronological timeline.
 */
import { getDB } from '../index';
import { getSessionsByCanonicalBookId } from './reading-sessions';
import { findAliasesByCanonicalId } from './aliases';
import type {
    ReadingSession,
    Note,
    UnifiedBookHistory,
    UnifiedBookHistoryItem,
    CanonicalBookIdentity,
} from '../../types';
import { getCanonicalBook } from './canonical-books';

/**
 * Build unified history for a canonical book.
 * Merges notes (via alias mappings) and reading sessions
 * into a single chronological timeline.
 */
export async function getUnifiedBookHistory(
    canonicalBookId: string
): Promise<UnifiedBookHistory | null> {
    const db = getDB();

    // Get canonical book info
    const canonical = await getCanonicalBook(canonicalBookId);
    if (!canonical) return null;

    // Get reading sessions
    const sessions = await getSessionsByCanonicalBookId(canonicalBookId);

    // Get notes via alias mappings
    // First find all book IDs that map to this canonical ID
    const aliases = await findAliasesByCanonicalId(canonicalBookId);
    const bookIds = new Set<string>();
    for (const alias of aliases) {
        // Find books matching this alias's normalized key
        const books = await db.books.where('title').equals(alias.rawTitle).toArray();
        for (const book of books) {
            bookIds.add(book.id);
        }
    }

    // Get notes for all mapped book IDs
    const allNotes: Note[] = [];
    for (const bookId of bookIds) {
        const notes = await db.notes.where('bookId').equals(bookId).toArray();
        allNotes.push(...notes);
    }

    // Build unified timeline
    const items: UnifiedBookHistoryItem[] = [];

    for (const note of allNotes) {
        items.push({
            itemType: 'note',
            itemId: note.id,
            happenedAt: new Date(note.createdAt),
            payload: note,
        });
    }

    for (const session of sessions) {
        items.push({
            itemType: 'session',
            itemId: session.id,
            happenedAt: new Date(session.sessionDate + 'T00:00:00'),
            payload: session,
        });
    }

    // Sort descending by date
    items.sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime());

    return {
        canonicalBookId,
        canonicalTitle: canonical.titleCanonical,
        noteCount: allNotes.length,
        sessionCount: sessions.length,
        lastActivityAt: items.length > 0 ? items[0].happenedAt : undefined,
        items,
    };
}

/**
 * Get reading sessions for a book page (by legacy bookId).
 * Resolves through alias mapping to find the canonical ID.
 */
export async function getSessionsForBookPage(
    bookId: string,
    bookTitle: string
): Promise<{ sessions: ReadingSession[]; canonical?: CanonicalBookIdentity }> {

    // Try to find canonical mapping via alias
    const { findAliasByNormalizedKey } = await import('./aliases');

    const alias = await findAliasByNormalizedKey(bookTitle);
    if (alias) {
        const sessions = await getSessionsByCanonicalBookId(alias.canonicalBookId);
        const canonical = await getCanonicalBook(alias.canonicalBookId);
        return { sessions, canonical: canonical || undefined };
    }

    // No alias found — check if any sessions directly reference this canonical ID
    const directSessions = await getSessionsByCanonicalBookId(bookId);
    if (directSessions.length > 0) {
        const canonical = await getCanonicalBook(bookId);
        return { sessions: directSessions, canonical: canonical || undefined };
    }

    return { sessions: [] };
}
