import { describe, it, expect } from 'vitest';
import { buildShareText, resolveShareableItem } from '../../src/lib/export/share-format';

describe('share flow integration', () => {
    const books = [
        { id: 'book-1', title: 'Atomic Habits', author: 'James Clear' },
    ];

    const notes = [
        {
            id: 'highlight-1',
            type: 'highlight',
            content: 'You do not rise to the level of your goals.',
            bookId: 'book-1',
        },
        {
            id: 'note-1',
            type: 'note',
            content: 'Systems make progress inevitable.',
            associatedHighlightId: 'highlight-1',
            bookId: 'book-1',
        },
    ];

    it('generates matching copy/share payload foundations', () => {
        const item = resolveShareableItem('note-1', notes, books);
        expect(item).toBeTruthy();

        const sharePayload = buildShareText(item, { mode: 'share', maxLength: 280 });
        const copyPayload = buildShareText(item, { mode: 'copy' });

        expect(sharePayload.text).toContain('"You do not rise to the level of your goals."');
        expect(sharePayload.text).toContain('Note: Systems make progress inevitable.');
        expect(sharePayload.text).toContain('- Atomic Habits');

        expect(copyPayload.text).toContain('"You do not rise to the level of your goals."');
        expect(copyPayload.text).toContain('Note: Systems make progress inevitable.');
        expect(copyPayload.text).toContain('- Atomic Habits');
    });

    it('keeps attribution under truncation pressure', () => {
        const longNote = {
            id: 'note-2',
            type: 'note',
            bookId: 'book-1',
            content: 'x '.repeat(300),
        };

        const item = resolveShareableItem('note-2', [...notes, longNote], books);
        const payload = buildShareText(item, { mode: 'share', maxLength: 120 });

        expect(payload.truncated).toBe(true);
        expect(payload.text).toContain('- Atomic Habits');
        expect(payload.text.length).toBeLessThanOrEqual(120);
    });
});
