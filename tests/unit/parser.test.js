import { describe, it, expect, beforeEach } from 'vitest';
import { parseKindleFile, parseKindleEntry, extractMetadata } from '../../src/lib/parsers/kindle-parser';
import type { Book, Note, NoteType } from '../../src/lib/types';

describe('Kindle Parser', () => {
    const sampleKindleContent = `
My Clippings.txt

==========
Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 12 | location 180-181 | Added on Sunday, December 15, 2024 3:45:00 PM

In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.

==========
Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Note on page 25 | location 380 | Added on Sunday, December 15, 2024 4:15:00 PM

This represents the excessive wealth and superficiality of the Jazz Age.

==========
Book Title: 1984 (George Orwell)
- Your Highlight on page 45 | location 680-682 | Added on Monday, December 16, 2024 10:30:00 AM

War is peace. Freedom is slavery. Ignorance is strength.

==========
Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Bookmark on page 30 | location 450 | Added on Sunday, December 15, 2024 5:00:00 PM


==========
`;

    describe('parseKindleFile', () => {
        it('should parse a complete Kindle file and return structured data', async () => {
            const result = await parseKindleFile(sampleKindleContent);

            expect(result).toHaveProperty('books');
            expect(result).toHaveProperty('notes');
            expect(result).toHaveProperty('metadata');

            expect(result.books).toHaveLength(2);
            expect(result.notes).toHaveLength(4);
        });

        it('should correctly group notes by book', async () => {
            const result = await parseKindleFile(sampleKindleContent);

            const gatsbyBook = result.books.find(book => book.title === 'The Great Gatsby');
            const orwellBook = result.books.find(book => book.title === '1984');

            expect(gatsbyBook).toBeDefined();
            expect(orwellBook).toBeDefined();

            expect(gatsbyBook?.author).toBe('F. Scott Fitzgerald');
            expect(orwellBook?.author).toBe('George Orwell');

            const gatsbyNotes = result.notes.filter(note => note.bookId === gatsbyBook?.id);
            const orwellNotes = result.notes.filter(note => note.bookId === orwellBook?.id);

            expect(gatsbyNotes).toHaveLength(3);
            expect(orwellNotes).toHaveLength(1);
        });

        it('should handle different note types correctly', async () => {
            const result = await parseKindleFile(sampleKindleContent);

            const highlights = result.notes.filter(note => note.type === 'highlight');
            const notes = result.notes.filter(note => note.type === 'note');
            const bookmarks = result.notes.filter(note => note.type === 'bookmark');

            expect(highlights).toHaveLength(2);
            expect(notes).toHaveLength(1);
            expect(bookmarks).toHaveLength(1);
        });

        it('should parse dates correctly', async () => {
            const result = await parseKindleFile(sampleKindleContent);

            const firstNote = result.notes[0];
            expect(firstNote.createdAt).toBeInstanceOf(Date);
            expect(firstNote.createdAt.getFullYear()).toBe(2024);
            expect(firstNote.createdAt.getMonth()).toBe(11); // December (0-indexed)
        });
    });

    describe('parseKindleEntry', () => {
        it('should parse a highlight entry correctly', () => {
            const entryText = `Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 12 | location 180-181 | Added on Sunday, December 15, 2024 3:45:00 PM

In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.`;

            const result = parseKindleEntry(entryText);

            expect(result.book.title).toBe('The Great Gatsby');
            expect(result.book.author).toBe('F. Scott Fitzgerald');
            expect(result.note.type).toBe('highlight');
            expect(result.note.page).toBe(12);
            expect(result.note.location).toBe('180-181');
            expect(result.note.content).toBe('In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.');
        });

        it('should parse a note entry correctly', () => {
            const entryText = `Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Note on page 25 | location 380 | Added on Sunday, December 15, 2024 4:15:00 PM

This represents the excessive wealth and superficiality of the Jazz Age.`;

            const result = parseKindleEntry(entryText);

            expect(result.note.type).toBe('note');
            expect(result.note.page).toBe(25);
            expect(result.note.location).toBe('380');
            expect(result.note.content).toBe('This represents the excessive wealth and superficiality of the Jazz Age.');
        });

        it('should parse a bookmark entry correctly', () => {
            const entryText = `Book Title: The Great Gatsby (F. Scott Fitzgerald)
- Your Bookmark on page 30 | location 450 | Added on Sunday, December 15, 2024 5:00:00 PM

`;

            const result = parseKindleEntry(entryText);

            expect(result.note.type).toBe('bookmark');
            expect(result.note.page).toBe(30);
            expect(result.note.location).toBe('450');
            expect(result.note.content).toBe('');
        });

        it('should handle malformed entries gracefully', () => {
            const malformedEntry = 'This is not a valid Kindle entry';

            expect(() => parseKindleEntry(malformedEntry)).toThrow('Invalid Kindle entry format');
        });

        it('should handle entries with missing information', () => {
            const incompleteEntry = `Book Title: Incomplete Book
- Your Highlight | Added on Sunday, December 15, 2024 3:45:00 PM

Some content here.`;

            const result = parseKindleEntry(incompleteEntry);

            expect(result.note.page).toBeNull();
            expect(result.note.location).toBeNull();
            expect(result.note.content).toBe('Some content here.');
        });
    });

    describe('extractMetadata', () => {
        it('should extract parsing metadata correctly', () => {
            const result = extractMetadata(sampleKindleContent);

            expect(result).toHaveProperty('totalEntries');
            expect(result).toHaveProperty('parsedAt');
            expect(result).toHaveProperty('fileSize');
            expect(result).toHaveProperty('statistics');

            expect(result.totalEntries).toBe(4);
            expect(result.parsedAt).toBeInstanceOf(Date);
            expect(result.statistics.highlights).toBe(2);
            expect(result.statistics.notes).toBe(1);
            expect(result.statistics.bookmarks).toBe(1);
        });

        it('should calculate unique books count', () => {
            const result = extractMetadata(sampleKindleContent);

            expect(result.statistics.uniqueBooks).toBe(2);
        });

        it('should handle empty content', () => {
            const result = extractMetadata('');

            expect(result.totalEntries).toBe(0);
            expect(result.statistics.highlights).toBe(0);
            expect(result.statistics.notes).toBe(0);
            expect(result.statistics.bookmarks).toBe(0);
            expect(result.statistics.uniqueBooks).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle books with special characters in titles', () => {
            const specialContent = `
==========
Book Title: The "Smart" Guide: How to Win & Succeed (John O'Connor)
- Your Highlight on page 1 | location 10 | Added on Sunday, December 15, 2024 3:45:00 PM

Test content.
==========
`;

            const result = parseKindleEntry(specialContent.trim());

            expect(result.book.title).toBe('The "Smart" Guide: How to Win & Succeed');
            expect(result.book.author).toBe('John O\'Connor');
        });

        it('should handle multi-line highlights', () => {
            const multilineContent = `
==========
Book Title: Test Book (Test Author)
- Your Highlight on page 1 | location 10-15 | Added on Sunday, December 15, 2024 3:45:00 PM

This is a very long highlight that spans
multiple lines and should be preserved
exactly as it appears.
==========
`;

            const result = parseKindleEntry(multilineContent.trim());

            expect(result.note.content).toContain('This is a very long highlight');
            expect(result.note.content).toContain('multiple lines');
            expect(result.note.content).toContain('exactly as it appears.');
        });

        it('should handle books without authors', () => {
            const noAuthorContent = `
==========
Book Title: Standalone Book
- Your Highlight on page 1 | location 10 | Added on Sunday, December 15, 2024 3:45:00 PM

Test content.
==========
`;

            const result = parseKindleEntry(noAuthorContent.trim());

            expect(result.book.title).toBe('Standalone Book');
            expect(result.book.author).toBe('Unknown Author');
        });
    });
});