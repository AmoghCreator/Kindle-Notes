/**
 * Canonical Match Scoring Policy
 * 
 * Implements confidence-based matching with thresholded auto-linking:
 *   - score >= 0.90: auto-link as verified
 *   - 0.70 <= score < 0.90: user confirmation required
 *   - score < 0.70: provisional record
 * 
 * Scoring weights:
 *   - Title similarity: 0.60
 *   - Author similarity: 0.25
 *   - ISBN/identifier agreement: 0.15
 */
import type { BookMatchCandidate, CanonicalThresholdBand } from '../types';

// Threshold constants
export const AUTO_LINK_THRESHOLD = 0.90;
export const CONFIRM_THRESHOLD = 0.70;

// Scoring weights
const TITLE_WEIGHT = 0.60;
const AUTHOR_WEIGHT = 0.25;
const ISBN_WEIGHT = 0.15;

/**
 * Normalize a title for comparison/storage.
 * Lowercases, removes punctuation, collapses whitespace.
 */
export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalize an author name for comparison.
 */
export function normalizeAuthor(author: string): string {
    return author
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Compute Levenshtein-based similarity between two strings (0..1).
 */
export function stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const na = a.toLowerCase();
    const nb = b.toLowerCase();
    if (na === nb) return 1;

    const len = Math.max(na.length, nb.length);
    const dist = levenshteinDistance(na, nb);
    return 1 - dist / len;
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

/**
 * Score a candidate against input title/author/isbn.
 */
export function scoreCandidate(
    candidate: BookMatchCandidate,
    inputTitle: string,
    inputAuthor?: string,
    inputIsbn?: string
): number {
    // Title score
    const titleScore = stringSimilarity(
        normalizeTitle(inputTitle),
        normalizeTitle(candidate.title)
    );

    // Author score
    let authorScore = 0;
    if (inputAuthor && candidate.authors && candidate.authors.length > 0) {
        const normalizedInput = normalizeAuthor(inputAuthor);
        const bestAuthorMatch = Math.max(
            ...candidate.authors.map(a => stringSimilarity(normalizedInput, normalizeAuthor(a)))
        );
        authorScore = bestAuthorMatch;
    } else if (!inputAuthor && (!candidate.authors || candidate.authors.length === 0)) {
        // Both missing author — neutral (not penalized)
        authorScore = 0.5;
    }

    // ISBN score
    let isbnScore = 0;
    if (inputIsbn && candidate.isbn13) {
        isbnScore = inputIsbn === candidate.isbn13 ? 1 : 0;
    }

    // Weighted combination
    return titleScore * TITLE_WEIGHT + authorScore * AUTHOR_WEIGHT + isbnScore * ISBN_WEIGHT;
}

/**
 * Score and rank all candidates against input.
 * Returns candidates sorted by confidence (descending) with scores applied.
 */
export function rankCandidates(
    candidates: BookMatchCandidate[],
    inputTitle: string,
    inputAuthor?: string,
    inputIsbn?: string
): BookMatchCandidate[] {
    return candidates
        .map(c => ({
            ...c,
            confidence: scoreCandidate(c, inputTitle, inputAuthor, inputIsbn),
        }))
        .sort((a, b) => {
            // Tie-breaker 1: exact ISBN match wins
            if (inputIsbn) {
                if (a.isbn13 === inputIsbn && b.isbn13 !== inputIsbn) return -1;
                if (b.isbn13 === inputIsbn && a.isbn13 !== inputIsbn) return 1;
            }
            // Tie-breaker 2: highest confidence
            return b.confidence - a.confidence;
        });
}

/**
 * Determine the threshold band for a given confidence score.
 */
export function getThresholdBand(confidence: number): CanonicalThresholdBand {
    if (confidence >= AUTO_LINK_THRESHOLD) return 'auto';
    if (confidence >= CONFIRM_THRESHOLD) return 'confirm';
    return 'provisional';
}

/**
 * Resolve the best match from scored candidates and return the resolution.
 */
export function resolveMatch(
    candidates: BookMatchCandidate[]
): {
    bestCandidate: BookMatchCandidate | null;
    band: CanonicalThresholdBand;
    requiresConfirmation: boolean;
} {
    if (candidates.length === 0) {
        return { bestCandidate: null, band: 'provisional', requiresConfirmation: false };
    }

    const best = candidates[0];
    const band = getThresholdBand(best.confidence);

    return {
        bestCandidate: best,
        band,
        requiresConfirmation: band === 'confirm',
    };
}
