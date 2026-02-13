import { describe, it, expect } from 'vitest';
import { selectRandomSuggestion, toSuggestionPool } from '../../src/lib/export/random-suggestion';

describe('random suggestion selector', () => {
    const books = [
        { id: 'b1', title: 'Book One', author: 'Author One' },
        { id: 'b2', title: 'Book Two' },
    ];

    const notes = [
        { id: 'n1', type: 'note', content: 'First note', bookId: 'b1' },
        { id: 'h1', type: 'highlight', content: 'First highlight', bookId: 'b1' },
        {
            id: 'n2',
            type: 'note',
            content: 'Second note',
            bookId: 'b2',
            associatedHighlightId: 'h1',
        },
    ];

    it('builds suggestion pool from notes and books', () => {
        const pool = toSuggestionPool(notes, books);
        expect(pool).toHaveLength(3);
        expect(pool[0].bookTitle).toBeTruthy();
        expect(['note', 'highlight']).toContain(pool[0].itemType);

        const linkedNoteSuggestion = pool.find((entry) => entry.itemId === 'n2');
        expect(linkedNoteSuggestion?.associatedHighlightText).toContain('First highlight');
    });

    it('avoids recent IDs when alternatives exist', () => {
        const pool = toSuggestionPool(notes, books);
        const suggestion = selectRandomSuggestion(pool, {
            recentIds: ['n1'],
            rng: () => 0,
        });

        expect(suggestion.itemId).not.toBe('n1');
    });

    it('falls back gracefully if all entries are excluded by recency', () => {
        const pool = toSuggestionPool(notes, books);
        const suggestion = selectRandomSuggestion(pool, {
            recentIds: ['n1', 'h1', 'n2'],
            rng: () => 0,
        });

        expect(suggestion).toBeTruthy();
    });
});
