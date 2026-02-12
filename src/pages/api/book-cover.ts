import type { APIRoute } from 'astro';
import { fetchBookCover } from '../../lib/utils/google-books';
import { getBookById, addBook } from '../../lib/server/storage';

// Endpoint to fetch cover for a single book
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { bookId } = await request.json();

        if (!bookId) {
            return new Response(
                JSON.stringify({ error: 'Book ID required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const book = await getBookById(bookId);

        if (!book) {
            return new Response(
                JSON.stringify({ error: 'Book not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Skip if already has cover
        if (book.cover) {
            return new Response(
                JSON.stringify({ success: true, cover: book.cover, cached: true }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Fetch cover from Google Books
        const coverUrl = await fetchBookCover(book.title, book.author);

        if (coverUrl) {
            book.cover = coverUrl;
            book.lastModifiedAt = new Date();
            await addBook(book);

            return new Response(
                JSON.stringify({ success: true, cover: coverUrl }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: false, message: 'No cover found' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error fetching book cover:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
