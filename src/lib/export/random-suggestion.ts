import type { RandomSuggestion } from '../types';

function normalizeText(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function buildPreview(content: string, max = 140): string {
    const clean = normalizeText(content);
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trim()}…`;
}

export function toSuggestionPool(notes: any[], books: any[]): RandomSuggestion[] {
    const bookMap = new Map(books.map((book) => [book.id, book]));
    const noteMap = new Map(notes.map((note) => [note.id, note]));

    return notes
        .filter((note) => ['note', 'highlight'].includes(note?.type))
        .map((note) => {
            const book = bookMap.get(note.bookId);
            const text = normalizeText(note.content ?? note.text);
            const linkedHighlight =
                note.type === 'note' && note.associatedHighlightId
                    ? noteMap.get(note.associatedHighlightId)
                    : null;
            const linkedHighlightText = normalizeText(linkedHighlight?.content ?? linkedHighlight?.text);
            return {
                suggestionId: `suggestion-${note.id}`,
                itemId: note.id,
                itemType: note.type === 'highlight' ? 'highlight' : 'note',
                previewText: buildPreview(text),
                associatedHighlightId: linkedHighlight?.id,
                associatedHighlightText: linkedHighlightText ? buildPreview(linkedHighlightText) : undefined,
                bookId: note.bookId,
                bookTitle: normalizeText(book?.title) || 'Unknown Book',
                bookAuthor: normalizeText(book?.author) || undefined,
                canShare: Boolean(text),
            } as RandomSuggestion;
        })
        .filter((entry) => entry.canShare);
}

export interface SuggestionSelectOptions {
    excludeIds?: string[];
    recentIds?: string[];
    rng?: () => number;
}

export function selectRandomSuggestion(
    pool: RandomSuggestion[],
    options: SuggestionSelectOptions = {},
): RandomSuggestion | null {
    if (!pool.length) return null;

    const exclude = new Set(options.excludeIds ?? []);
    const recent = new Set(options.recentIds ?? []);
    const rng = options.rng ?? Math.random;

    let candidates = pool.filter((item) => !exclude.has(item.itemId) && !recent.has(item.itemId));
    if (!candidates.length) {
        candidates = pool.filter((item) => !exclude.has(item.itemId));
    }
    if (!candidates.length) {
        candidates = [...pool];
    }

    const index = Math.floor(rng() * candidates.length);
    return candidates[index] ?? null;
}
