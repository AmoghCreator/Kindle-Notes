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
    const sortedHighlights = [...highlights].sort(
        (a, b) => (a.location?.start ?? 0) - (b.location?.start ?? 0)
    );

    const usedNoteIds = new Set<string>();

    const pairs: HighlightNotePair[] = sortedHighlights.map(highlight => {
        // 1) Prefer explicit parser association
        let associatedNote = noteEntries.find(
            n => n.associatedHighlightId === highlight.id && !usedNoteIds.has(n.id)
        );

        // 2) Fallback: location-based association
        // Associate note if note.start is at highlight.end ±1
        if (!associatedNote && highlight.location) {
            const highlightEnd = highlight.location.end ?? highlight.location.start;
            associatedNote = noteEntries.find(n => {
                if (usedNoteIds.has(n.id)) return false;
                if (!n.location?.start) return false;
                return Math.abs(n.location.start - highlightEnd) <= 1;
            });
        }

        if (associatedNote) {
            usedNoteIds.add(associatedNote.id);
        }

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
    const associatedNoteIds = new Set(
        pairs
            .map(p => p.associatedNote?.id)
            .filter((id): id is string => Boolean(id))
    );

    const standaloneNotes = noteEntries.filter(n => !associatedNoteIds.has(n.id));

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
