// Utility functions for highlight-note association grouping
// Feature: 004-highlight-note-link

import type { Note, HighlightNotePair, GroupedBookEntries } from '../types';

/**
 * T006: Type guard to check if a note is associated with a highlight
 */
export function isAssociatedNote(note: Note): boolean {
    return note.type === 'note' && note.associatedHighlightId !== undefined;
}

/**
 * T007: Validates that an association reference is valid
 */
export function isValidAssociation(note: Note, allNotes: Note[]): boolean {
    // Must be a note type
    if (note.type !== 'note') return false;

    // Must have association ID
    if (!note.associatedHighlightId) return false;

    // Cannot reference itself
    if (note.associatedHighlightId === note.id) return false;

    // Referenced highlight must exist
    const highlight = allNotes.find(n => n.id === note.associatedHighlightId);
    if (!highlight) return false;

    // Referenced note must be a highlight
    if (highlight.type !== 'highlight') return false;

    // Both must be in same book
    if (highlight.bookId !== note.bookId) return false;

    return true;
}

/**
 * T008: Finds the highlight associated with a note
 */
export function findAssociatedHighlight(
    note: Note,
    allNotes: Note[]
): Note | undefined {
    if (!note.associatedHighlightId) return undefined;

    return allNotes.find(n => n.id === note.associatedHighlightId);
}

/**
 * T009: Builds highlight-note pairs from filtered notes
 */
export function buildHighlightPairs(
    highlights: Note[],
    noteEntries: Note[]
): HighlightNotePair[] {
    const pairs: HighlightNotePair[] = highlights.map(highlight => {
        const associatedNote = noteEntries.find(
            n => n.associatedHighlightId === highlight.id
        );

        return {
            highlight: highlight as Note & { type: 'highlight' },
            associatedNote: associatedNote as (Note & { type: 'note' }) | undefined,
            displayOrder: highlight.location?.start ?? 0
        };
    });

    // Sort by location
    pairs.sort((a, b) => a.displayOrder - b.displayOrder);

    return pairs;
}

/**
 * T010: Groups raw notes into display structure with associations
 */
export function groupEntriesByAssociation(
    bookId: string,
    notes: Note[]
): GroupedBookEntries {
    // Filter to specific book
    const bookNotes = notes.filter(n => n.bookId === bookId);

    // Separate by type
    const highlights = bookNotes.filter(n => n.type === 'highlight');
    const noteEntries = bookNotes.filter(n => n.type === 'note');
    const bookmarks = bookNotes.filter(n => n.type === 'bookmark');

    // Build pairs
    const pairs = buildHighlightPairs(highlights, noteEntries);

    // Find standalone notes (not associated with any highlight)
    const standaloneNotes = noteEntries.filter(n => !n.associatedHighlightId);

    // Sort standalone notes by location
    standaloneNotes.sort((a, b) => {
        const aLoc = a.location?.start ?? 0;
        const bLoc = b.location?.start ?? 0;
        return aLoc - bLoc;
    });

    return {
        pairs,
        standaloneNotes,
        bookmarks
    };
}
