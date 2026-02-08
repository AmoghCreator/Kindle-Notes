import type { KindleNotesDatabase } from './database';
import type { Book } from '../types';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { validateBook } from '../utils/validation';

export class BooksStorage {
    constructor(private db: KindleNotesDatabase) { }

    async create(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
        // Validate input data
        const validation = validateBook(data);
        if (!validation.isValid) {
            throw new ValidationError('Invalid book data', validation.errors, 404);
        }

        const now = new Date();
        const book: Book = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: now,
            updatedAt: now
        };

        try {
            await this.db.books.add(book);
            return book;
        } catch (error) {
            throw new Error(`Failed to create book: ${error}`);
        }
    }

    async findById(id: string): Promise<Book | undefined> {
        try {
            return await this.db.books.get(id);
        } catch (error) {
            throw new Error(`Failed to find book: ${error}`);
        }
    }

    async findAll(): Promise<Book[]> {
        try {
            return await this.db.books.orderBy('title').toArray();
        } catch (error) {
            throw new Error(`Failed to fetch books: ${error}`);
        }
    }

    async findByAuthor(author: string): Promise<Book[]> {
        try {
            return await this.db.books.where('author').equals(author).toArray();
        } catch (error) {
            throw new Error(`Failed to find books by author: ${error}`);
        }
    }

    async findByTitle(title: string): Promise<Book | undefined> {
        try {
            return await this.db.books.where('title').equals(title).first();
        } catch (error) {
            throw new Error(`Failed to find book by title: ${error}`);
        }
    }

    async findByTitleAndAuthor(title: string, author: string): Promise<Book | undefined> {
        try {
            return await this.db.books
                .where(['title', 'author'])
                .equals([title, author])
                .first();
        } catch (error) {
            throw new Error(`Failed to find book by title and author: ${error}`);
        }
    }

    async update(id: string, updates: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Book> {
        const existingBook = await this.findById(id);
        if (!existingBook) {
            throw new NotFoundError('Book not found');
        }

        // Validate updated data
        const updatedData = { ...existingBook, ...updates };
        const validation = validateBook(updatedData);
        if (!validation.isValid) {
            throw new ValidationError('Invalid book update data', validation.errors);
        }

        const updatedBook: Book = {
            ...existingBook,
            ...updates,
            updatedAt: new Date()
        };

        try {
            await this.db.books.put(updatedBook);
            return updatedBook;
        } catch (error) {
            throw new Error(`Failed to update book: ${error}`);
        }
    }

    async delete(id: string): Promise<void> {
        const book = await this.findById(id);
        if (!book) {
            throw new NotFoundError('Book not found');
        }

        try {
            // Start transaction to delete book and all associated notes
            await this.db.transaction('rw', [this.db.books, this.db.notes], async () => {
                // Delete all notes for this book
                await this.db.notes.where('bookId').equals(id).delete();

                // Delete the book
                await this.db.books.delete(id);
            });
        } catch (error) {
            throw new Error(`Failed to delete book: ${error}`);
        }
    }

    async search(query: string): Promise<Book[]> {
        try {
            const normalizedQuery = query.toLowerCase();
            return await this.db.books
                .filter(book =>
                    book.title.toLowerCase().includes(normalizedQuery) ||
                    book.author.toLowerCase().includes(normalizedQuery) ||
                    (book.description && book.description.toLowerCase().includes(normalizedQuery)) ||
                    (book.genre && book.genre.toLowerCase().includes(normalizedQuery))
                )
                .toArray();
        } catch (error) {
            throw new Error(`Failed to search books: ${error}`);
        }
    }

    async getStatistics(): Promise<{
        totalBooks: number;
        totalAuthors: number;
        genres: { name: string; count: number }[];
        recentBooks: Book[];
    }> {
        try {
            const allBooks = await this.findAll();
            const totalBooks = allBooks.length;

            const uniqueAuthors = new Set(allBooks.map(book => book.author));
            const totalAuthors = uniqueAuthors.size;

            const genreCounts = allBooks.reduce((acc, book) => {
                if (book.genre) {
                    acc[book.genre] = (acc[book.genre] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const genres = Object.entries(genreCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            const recentBooks = allBooks
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5);

            return {
                totalBooks,
                totalAuthors,
                genres,
                recentBooks
            };
        } catch (error) {
            throw new Error(`Failed to get book statistics: ${error}`);
        }
    }

    async bulkCreate(books: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Book[]> {
        const now = new Date();
        const booksWithIds = books.map(book => {
            // Validate each book
            const validation = validateBook(book);
            if (!validation.isValid) {
                throw new ValidationError(`Invalid book data for "${book.title}"`, validation.errors);
            }

            return {
                id: crypto.randomUUID(),
                ...book,
                createdAt: now,
                updatedAt: now
            } as Book;
        });

        try {
            await this.db.books.bulkAdd(booksWithIds);
            return booksWithIds;
        } catch (error) {
            throw new Error(`Failed to bulk create books: ${error}`);
        }
    }

    async exists(title: string, author: string): Promise<boolean> {
        try {
            const book = await this.findByTitleAndAuthor(title, author);
            return book !== undefined;
        } catch (error) {
            throw new Error(`Failed to check if book exists: ${error}`);
        }
    }
}