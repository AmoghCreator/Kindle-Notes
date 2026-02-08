import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/lib/storage/database';
import { BooksStorage } from '../../src/lib/storage/books';
import { NotesStorage } from '../../src/lib/storage/notes';
import { UploadsStorage } from '../../src/lib/storage/uploads';
import type { Book, Note, Upload } from '../../src/lib/types';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

describe('Storage Integration Tests', () => {
    let db: DatabaseService;
    let booksStorage: BooksStorage;
    let notesStorage: NotesStorage;
    let uploadsStorage: UploadsStorage;

    beforeEach(async () => {
        db = new DatabaseService();
        await db.initialize();

        booksStorage = new BooksStorage(db);
        notesStorage = new NotesStorage(db);
        uploadsStorage = new UploadsStorage(db);
    });

    afterEach(async () => {
        await db.clearAll();
        await db.close();
    });

    describe('Books Storage', () => {
        it('should create and retrieve a book', async () => {
            const bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'> = {
                title: 'Test Book',
                author: 'Test Author',
                isbn: '978-0123456789',
                publicationYear: 2024,
                genre: 'Fiction',
                totalPages: 300,
                coverImageUrl: 'https://example.com/cover.jpg',
                description: 'A test book for unit testing'
            };

            const createdBook = await booksStorage.create(bookData);

            expect(createdBook.id).toBeDefined();
            expect(createdBook.title).toBe(bookData.title);
            expect(createdBook.author).toBe(bookData.author);
            expect(createdBook.createdAt).toBeInstanceOf(Date);
            expect(createdBook.updatedAt).toBeInstanceOf(Date);

            const retrievedBook = await booksStorage.findById(createdBook.id);
            expect(retrievedBook).toEqual(createdBook);
        });

        it('should update a book', async () => {
            const book = await booksStorage.create({
                title: 'Original Title',
                author: 'Original Author'
            });

            const updatedBook = await booksStorage.update(book.id, {
                title: 'Updated Title',
                description: 'Updated description'
            });

            expect(updatedBook.title).toBe('Updated Title');
            expect(updatedBook.author).toBe('Original Author'); // Should remain unchanged
            expect(updatedBook.description).toBe('Updated description');
            expect(updatedBook.updatedAt.getTime()).toBeGreaterThan(book.updatedAt.getTime());
        });

        it('should delete a book and its associated notes', async () => {
            const book = await booksStorage.create({
                title: 'Book to Delete',
                author: 'Test Author'
            });

            // Add some notes to the book
            await notesStorage.create({
                bookId: book.id,
                type: 'highlight',
                content: 'Test highlight',
                page: 1
            });

            await notesStorage.create({
                bookId: book.id,
                type: 'note',
                content: 'Test note',
                page: 2
            });

            // Verify notes exist
            const notesBeforeDelete = await notesStorage.findByBookId(book.id);
            expect(notesBeforeDelete).toHaveLength(2);

            // Delete the book
            await booksStorage.delete(book.id);

            // Verify book is deleted
            const deletedBook = await booksStorage.findById(book.id);
            expect(deletedBook).toBeUndefined();

            // Verify associated notes are deleted
            const notesAfterDelete = await notesStorage.findByBookId(book.id);
            expect(notesAfterDelete).toHaveLength(0);
        });

        it('should find books by author', async () => {
            await booksStorage.create({
                title: 'Book One',
                author: 'Author A'
            });

            await booksStorage.create({
                title: 'Book Two',
                author: 'Author A'
            });

            await booksStorage.create({
                title: 'Book Three',
                author: 'Author B'
            });

            const authorABooks = await booksStorage.findByAuthor('Author A');
            expect(authorABooks).toHaveLength(2);
            expect(authorABooks.every(book => book.author === 'Author A')).toBe(true);
        });
    });

    describe('Notes Storage', () => {
        let testBook: Book;

        beforeEach(async () => {
            testBook = await booksStorage.create({
                title: 'Test Book for Notes',
                author: 'Test Author'
            });
        });

        it('should create and retrieve a note', async () => {
            const noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
                bookId: testBook.id,
                type: 'highlight',
                content: 'This is a test highlight',
                page: 42,
                location: '1205-1207',
                tags: ['important', 'philosophy']
            };

            const createdNote = await notesStorage.create(noteData);

            expect(createdNote.id).toBeDefined();
            expect(createdNote.bookId).toBe(testBook.id);
            expect(createdNote.content).toBe(noteData.content);
            expect(createdNote.tags).toEqual(noteData.tags);

            const retrievedNote = await notesStorage.findById(createdNote.id);
            expect(retrievedNote).toEqual(createdNote);
        });

        it('should find notes by book ID', async () => {
            await notesStorage.create({
                bookId: testBook.id,
                type: 'highlight',
                content: 'First highlight',
                page: 1
            });

            await notesStorage.create({
                bookId: testBook.id,
                type: 'note',
                content: 'First note',
                page: 2
            });

            // Create a note for a different book
            const otherBook = await booksStorage.create({
                title: 'Other Book',
                author: 'Other Author'
            });

            await notesStorage.create({
                bookId: otherBook.id,
                type: 'highlight',
                content: 'Other book highlight',
                page: 1
            });

            const testBookNotes = await notesStorage.findByBookId(testBook.id);
            expect(testBookNotes).toHaveLength(2);
            expect(testBookNotes.every(note => note.bookId === testBook.id)).toBe(true);
        });

        it('should update note content and tags', async () => {
            const note = await notesStorage.create({
                bookId: testBook.id,
                type: 'highlight',
                content: 'Original content',
                page: 1,
                tags: ['tag1']
            });

            const updatedNote = await notesStorage.update(note.id, {
                content: 'Updated content',
                tags: ['tag1', 'tag2', 'updated']
            });

            expect(updatedNote.content).toBe('Updated content');
            expect(updatedNote.tags).toEqual(['tag1', 'tag2', 'updated']);
            expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(note.updatedAt.getTime());
        });

        it('should find notes by tags', async () => {
            await notesStorage.create({
                bookId: testBook.id,
                type: 'highlight',
                content: 'First highlight',
                page: 1,
                tags: ['philosophy', 'important']
            });

            await notesStorage.create({
                bookId: testBook.id,
                type: 'note',
                content: 'Second note',
                page: 2,
                tags: ['philosophy', 'question']
            });

            await notesStorage.create({
                bookId: testBook.id,
                type: 'highlight',
                content: 'Third highlight',
                page: 3,
                tags: ['history']
            });

            const philosophyNotes = await notesStorage.findByTags(['philosophy']);
            expect(philosophyNotes).toHaveLength(2);

            const importantNotes = await notesStorage.findByTags(['important']);
            expect(importantNotes).toHaveLength(1);

            const multipleTagNotes = await notesStorage.findByTags(['philosophy', 'important']);
            expect(multipleTagNotes).toHaveLength(1); // Should find notes that have ALL tags
        });
    });

    describe('Uploads Storage', () => {
        it('should create and track upload records', async () => {
            const uploadData: Omit<Upload, 'id' | 'createdAt' | 'updatedAt'> = {
                fileName: 'My Clippings.txt',
                fileSize: 1024,
                mimeType: 'text/plain',
                status: 'processing',
                totalEntries: 0,
                processedEntries: 0
            };

            const createdUpload = await uploadsStorage.create(uploadData);

            expect(createdUpload.id).toBeDefined();
            expect(createdUpload.fileName).toBe(uploadData.fileName);
            expect(createdUpload.status).toBe('processing');

            const retrievedUpload = await uploadsStorage.findById(createdUpload.id);
            expect(retrievedUpload).toEqual(createdUpload);
        });

        it('should update upload progress', async () => {
            const upload = await uploadsStorage.create({
                fileName: 'test.txt',
                fileSize: 1024,
                mimeType: 'text/plain',
                status: 'processing',
                totalEntries: 100,
                processedEntries: 0
            });

            // Update progress
            const updatedUpload = await uploadsStorage.updateProgress(upload.id, 50);

            expect(updatedUpload.processedEntries).toBe(50);
            expect(updatedUpload.status).toBe('processing');

            // Complete the upload
            const completedUpload = await uploadsStorage.markComplete(upload.id, {
                booksCreated: 5,
                notesCreated: 50,
                duplicatesSkipped: 0
            });

            expect(completedUpload.status).toBe('completed');
            expect(completedUpload.result?.booksCreated).toBe(5);
            expect(completedUpload.result?.notesCreated).toBe(50);
        });

        it('should handle upload errors', async () => {
            const upload = await uploadsStorage.create({
                fileName: 'bad-file.txt',
                fileSize: 512,
                mimeType: 'text/plain',
                status: 'processing',
                totalEntries: 10,
                processedEntries: 5
            });

            const errorUpload = await uploadsStorage.markFailed(upload.id, 'Invalid file format');

            expect(errorUpload.status).toBe('failed');
            expect(errorUpload.errorMessage).toBe('Invalid file format');
        });
    });

    describe('Cross-Storage Operations', () => {
        it('should handle bulk import operations', async () => {
            const books = [
                { title: 'Book 1', author: 'Author 1' },
                { title: 'Book 2', author: 'Author 2' }
            ];

            const createdBooks = await Promise.all(
                books.map(book => booksStorage.create(book))
            );

            const notes = [
                { bookId: createdBooks[0].id, type: 'highlight' as const, content: 'Highlight 1', page: 1 },
                { bookId: createdBooks[0].id, type: 'note' as const, content: 'Note 1', page: 2 },
                { bookId: createdBooks[1].id, type: 'highlight' as const, content: 'Highlight 2', page: 1 }
            ];

            const createdNotes = await Promise.all(
                notes.map(note => notesStorage.create(note))
            );

            // Verify data integrity
            expect(createdBooks).toHaveLength(2);
            expect(createdNotes).toHaveLength(3);

            const book1Notes = await notesStorage.findByBookId(createdBooks[0].id);
            const book2Notes = await notesStorage.findByBookId(createdBooks[1].id);

            expect(book1Notes).toHaveLength(2);
            expect(book2Notes).toHaveLength(1);
        });

        it('should maintain referential integrity on cascade deletes', async () => {
            // Create a book with multiple notes
            const book = await booksStorage.create({
                title: 'Cascade Test Book',
                author: 'Test Author'
            });

            const notes = await Promise.all([
                notesStorage.create({ bookId: book.id, type: 'highlight', content: 'Test 1', page: 1 }),
                notesStorage.create({ bookId: book.id, type: 'note', content: 'Test 2', page: 2 }),
                notesStorage.create({ bookId: book.id, type: 'bookmark', content: '', page: 3 })
            ]);

            // Verify notes exist
            const initialNotes = await notesStorage.findByBookId(book.id);
            expect(initialNotes).toHaveLength(3);

            // Delete the book
            await booksStorage.delete(book.id);

            // Verify all notes are deleted
            const remainingNotes = await notesStorage.findByBookId(book.id);
            expect(remainingNotes).toHaveLength(0);

            // Verify individual note lookups return undefined
            for (const note of notes) {
                const deletedNote = await notesStorage.findById(note.id);
                expect(deletedNote).toBeUndefined();
            }
        });
    });
});