import type { Book, RandomSuggestion, ShareTextPayload, ShareableItem, ShareableItemType } from '../types';
import { truncateForTwitter } from './twitter-exporter';

export interface ShareFormatOptions {
    mode?: 'share' | 'copy';
    includeAssociatedHighlight?: boolean;
    maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 280;

export function normalizeItemText(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function formatAttribution(bookTitle: string, bookAuthor?: string): string {
    const safeTitle = normalizeItemText(bookTitle) || 'Unknown Book';
    const safeAuthor = normalizeItemText(bookAuthor);
    return safeAuthor ? `— ${safeTitle}, ${safeAuthor}` : `— ${safeTitle}`;
}

export function quoteText(value: string): string {
    return `"${value}"`;
}

function getNoteContent(note: any): string {
    return normalizeItemText(note?.content ?? note?.text ?? '');
}

export function resolveShareableItem(
    noteId: string,
    notes: any[],
    books: Book[],
): ShareableItem | null {
    const note = notes.find((entry) => entry?.id === noteId);
    if (!note) return null;

    const itemType: ShareableItemType = note.type === 'highlight' ? 'highlight' : 'note';
    const text = getNoteContent(note);
    if (!text) return null;

    const book = books.find((candidate) => candidate.id === note.bookId);
    if (!book) return null;

    const associatedHighlight =
        note.associatedHighlightId && itemType === 'note'
            ? notes.find(
                (entry) =>
                    entry?.id === note.associatedHighlightId &&
                    entry?.type === 'highlight' &&
                    entry?.bookId === note.bookId,
            )
            : null;

    const associatedHighlightText = associatedHighlight
        ? getNoteContent(associatedHighlight)
        : undefined;

    return {
        itemId: note.id,
        itemType,
        text,
        bookId: note.bookId,
        bookTitle: normalizeItemText(book.title),
        bookAuthor: normalizeItemText(book.author),
        associatedHighlightId: associatedHighlight?.id,
        associatedHighlightText,
    };
}

export function buildShareText(
    item: ShareableItem,
    options: ShareFormatOptions = {},
): ShareTextPayload {
    const mode = options.mode ?? 'share';
    const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
    const includeAssociatedHighlight = options.includeAssociatedHighlight ?? true;

    const text = normalizeItemText(item.text);
    if (!text) {
        throw new Error('Cannot generate share text for empty note/highlight content');
    }

    const attribution = formatAttribution(item.bookTitle, item.bookAuthor);
    const primaryQuote = quoteText(text);

    const secondaryCandidate =
        includeAssociatedHighlight &&
            item.itemType === 'note' &&
            normalizeItemText(item.associatedHighlightText)
            ? quoteText(normalizeItemText(item.associatedHighlightText))
            : undefined;

    const payload =
        mode === 'share'
            ? truncateForTwitter({
                primaryQuote,
                secondaryQuote: secondaryCandidate,
                attribution,
                maxLength,
            })
            : {
                text: [primaryQuote, secondaryCandidate, attribution]
                    .filter(Boolean)
                    .join('\n'),
                charCount: [primaryQuote, secondaryCandidate, attribution]
                    .filter(Boolean)
                    .join('\n').length,
                truncated: false,
                includesAssociatedHighlight: Boolean(secondaryCandidate),
                attribution,
            };

    return payload;
}

export function buildShareableFromSuggestion(
    suggestion: RandomSuggestion,
    notes: any[],
    books: Book[],
): ShareableItem | null {
    return resolveShareableItem(suggestion.itemId, notes, books);
}
