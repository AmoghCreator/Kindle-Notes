import { describe, it, expect } from 'vitest';
import {
    buildShareText,
    formatAttribution,
    resolveShareableItem,
} from '../../src/lib/export/share-format';

describe('share formatter', () => {
    const books = [
        { id: 'b1', title: 'Deep Work', author: 'Cal Newport' },
        { id: 'b2', title: 'Untitled Source' },
    ];

    const notes = [
        {
            id: 'h1',
            bookId: 'b1',
            type: 'highlight',
            content: 'Focus is the new IQ.',
        },
        {
            id: 'n1',
            bookId: 'b1',
            type: 'note',
            content: 'This is why I block calendar time.',
            associatedHighlightId: 'h1',
        },
        {
            id: 'n2',
            bookId: 'b2',
            type: 'note',
            content: 'A standalone note with no author metadata.',
        },
    ];

    it('formats attribution with title and optional author', () => {
        expect(formatAttribution('Deep Work', 'Cal Newport')).toBe('— Deep Work, Cal Newport');
        expect(formatAttribution('Untitled Source')).toBe('— Untitled Source');
    });

    it('resolves note with associated highlight for sharing', () => {
        const item = resolveShareableItem('n1', notes, books);
        expect(item).toBeTruthy();
        expect(item.associatedHighlightId).toBe('h1');
        expect(item.associatedHighlightText).toContain('Focus is the new IQ');
    });

    it('builds twitter-friendly share text with associated highlight', () => {
        const item = resolveShareableItem('n1', notes, books);
        const payload = buildShareText(item, { mode: 'share', maxLength: 280 });

        expect(payload.text).toContain('"This is why I block calendar time."');
        expect(payload.text).toContain('"Focus is the new IQ."');
        expect(payload.text).toContain('— Deep Work, Cal Newport');
        expect(payload.includesAssociatedHighlight).toBe(true);
    });

    it('omits empty associated highlight content', () => {
        const withEmptyHighlight = {
            id: 'n3',
            bookId: 'b1',
            type: 'note',
            content: 'A note with bad highlight link.',
            associatedHighlightId: 'h2',
        };
        const noteSet = [...notes, { id: 'h2', bookId: 'b1', type: 'highlight', content: '   ' }, withEmptyHighlight];
        const item = resolveShareableItem('n3', noteSet, books);
        const payload = buildShareText(item, { mode: 'share' });

        expect(payload.text).toContain('"A note with bad highlight link."');
        expect(payload.includesAssociatedHighlight).toBe(false);
    });

    it('builds copy-mode payload with quote + attribution for highlight', () => {
        const item = resolveShareableItem('h1', notes, books);
        const payload = buildShareText(item, { mode: 'copy' });

        expect(payload.truncated).toBe(false);
        expect(payload.text).toBe('"Focus is the new IQ."\n— Deep Work, Cal Newport');
    });

    it('falls back to title-only attribution when author is missing', () => {
        const item = resolveShareableItem('n2', notes, books);
        const payload = buildShareText(item, { mode: 'copy' });

        expect(payload.text).toContain('— Untitled Source');
        expect(payload.text).not.toContain(', undefined');
    });
});
