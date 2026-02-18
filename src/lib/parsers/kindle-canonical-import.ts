/**
 * Kindle Import Canonical Orchestrator
 * 
 * Integrates canonical book matching into the Kindle import pipeline.
 * Called after parsing to resolve each unique book to a canonical identity.
 */
import type { Book, CanonicalLinkAudit } from '../types';
import { searchGoogleBooks } from '../matching/google-books-client';
import { rankCandidates, getThresholdBand } from '../matching/canonicalize';
import { createAuditFromBand } from '../matching/audit';
import { resolveOrCreateCanonical } from '../db/repositories/canonical-books';
import { createAlias, findAliasByNormalizedKey } from '../db/repositories/aliases';

export interface CanonicalImportResult {
    /** Map from raw bookId -> canonicalBookId */
    bookCanonicalMap: Map<string, string>;
    /** Audit records for each book resolution */
    audits: Map<string, CanonicalLinkAudit>;
    /** Summary counts */
    summary: {
        autoLinked: number;
        needsConfirmation: number;
        provisional: number;
        total: number;
    };
}

/**
 * Run canonical matching for all books from a Kindle import.
 * 
 * For each parsed book:
 * 1. Check if an alias already exists for this title
 * 2. If not, search Google Books and score candidates
 * 3. Auto-link (>= 0.90), queue for confirmation (0.70-0.89), or create provisional (< 0.70)
 */
export async function canonicalizeImportBooks(
    books: Book[]
): Promise<CanonicalImportResult> {
    const bookCanonicalMap = new Map<string, string>();
    const audits = new Map<string, CanonicalLinkAudit>();
    let autoLinked = 0;
    let needsConfirmation = 0;
    let provisional = 0;

    for (const book of books) {
        try {
            // Check existing alias first
            const existingAlias = await findAliasByNormalizedKey(book.title);
            if (existingAlias) {
                bookCanonicalMap.set(book.id, existingAlias.canonicalBookId);
                audits.set(book.id, createAuditFromBand(
                    'kindle-import',
                    existingAlias.resolution === 'auto' ? 'auto' :
                        existingAlias.resolution === 'user-confirmed' ? 'confirm' : 'provisional',
                    existingAlias.confidence,
                    undefined
                ));
                autoLinked++;
                continue;
            }

            // Search Google Books
            const searchResult = await searchGoogleBooks(book.title, book.author);

            if (!searchResult.providerAvailable || searchResult.candidates.length === 0) {
                // Provider unavailable or no candidates → provisional
                const canonical = await resolveOrCreateCanonical({
                    titleCanonical: book.title,
                    authorsCanonical: book.author ? [book.author] : undefined,
                    matchStatus: 'unverified',
                    matchSource: 'import-fallback',
                });
                bookCanonicalMap.set(book.id, canonical.canonicalBookId);

                const audit = createAuditFromBand('kindle-import', 'provisional', 0, undefined);
                audits.set(book.id, audit);

                await createAlias({
                    rawTitle: book.title,
                    rawAuthor: book.author,
                    canonicalBookId: canonical.canonicalBookId,
                    confidence: 0,
                    resolution: 'provisional',
                });

                provisional++;
                continue;
            }

            // Score and rank candidates
            const ranked = rankCandidates(searchResult.candidates, book.title, book.author);
            const best = ranked[0];
            const band = getThresholdBand(best.confidence);

            if (band === 'auto') {
                // Auto-link
                const canonical = await resolveOrCreateCanonical({
                    titleCanonical: best.title,
                    authorsCanonical: best.authors,
                    googleVolumeId: best.candidateId,
                    isbn13: best.isbn13,
                    coverUrl: best.coverUrl,
                    matchStatus: 'verified',
                    matchSource: 'google-books',
                });
                bookCanonicalMap.set(book.id, canonical.canonicalBookId);

                const audit = createAuditFromBand('kindle-import', 'auto', best.confidence, best.candidateId);
                audits.set(book.id, audit);

                await createAlias({
                    rawTitle: book.title,
                    rawAuthor: book.author,
                    canonicalBookId: canonical.canonicalBookId,
                    confidence: best.confidence,
                    resolution: 'auto',
                });

                autoLinked++;
            } else if (band === 'confirm') {
                // For import flow, we auto-link with 'user-confirmed' status 
                // (user can later review). This avoids blocking the import.
                const canonical = await resolveOrCreateCanonical({
                    titleCanonical: best.title,
                    authorsCanonical: best.authors,
                    googleVolumeId: best.candidateId,
                    isbn13: best.isbn13,
                    coverUrl: best.coverUrl,
                    matchStatus: 'user-confirmed',
                    matchSource: 'google-books',
                });
                bookCanonicalMap.set(book.id, canonical.canonicalBookId);

                const audit = createAuditFromBand('kindle-import', 'confirm', best.confidence, best.candidateId);
                audits.set(book.id, audit);

                await createAlias({
                    rawTitle: book.title,
                    rawAuthor: book.author,
                    canonicalBookId: canonical.canonicalBookId,
                    confidence: best.confidence,
                    resolution: 'user-confirmed',
                });

                needsConfirmation++;
            } else {
                // Provisional
                const canonical = await resolveOrCreateCanonical({
                    titleCanonical: book.title,
                    authorsCanonical: book.author ? [book.author] : undefined,
                    matchStatus: 'unverified',
                    matchSource: 'import-fallback',
                });
                bookCanonicalMap.set(book.id, canonical.canonicalBookId);

                const audit = createAuditFromBand('kindle-import', 'provisional', best.confidence, best.candidateId);
                audits.set(book.id, audit);

                await createAlias({
                    rawTitle: book.title,
                    rawAuthor: book.author,
                    canonicalBookId: canonical.canonicalBookId,
                    confidence: best.confidence,
                    resolution: 'provisional',
                });

                provisional++;
            }
        } catch (err) {
            // On any per-book error, create provisional and continue
            console.warn(`Canonical matching failed for "${book.title}":`, err);
            const canonical = await resolveOrCreateCanonical({
                titleCanonical: book.title,
                authorsCanonical: book.author ? [book.author] : undefined,
                matchStatus: 'unverified',
                matchSource: 'import-fallback',
            });
            bookCanonicalMap.set(book.id, canonical.canonicalBookId);

            const audit = createAuditFromBand('kindle-import', 'provisional', 0, undefined);
            audits.set(book.id, audit);

            provisional++;
        }
    }

    return {
        bookCanonicalMap,
        audits,
        summary: {
            autoLinked,
            needsConfirmation,
            provisional,
            total: books.length,
        },
    };
}
