import type { APIRoute } from 'astro';
import { fetchBookCover } from '../../lib/utils/google-books';
import { getAllBooks, saveBooks } from '../../lib/server/storage';

// Endpoint to fetch missing book covers for existing books
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const books = await getAllBooks();
        const booksWithoutCovers = books.filter(book => !book.cover);

        if (booksWithoutCovers.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'All books already have covers',
                    updated: 0
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        console.log(`Fetching covers for ${booksWithoutCovers.length} books...`);
        let updated = 0;

        for (const book of booksWithoutCovers) {
            const coverUrl = await fetchBookCover(book.title, book.author);

            if (coverUrl) {
                book.cover = coverUrl;
                book.lastModifiedAt = new Date();
                updated++;
                console.log(`Updated cover for: ${book.title}`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await saveBooks(books);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Updated ${updated} book covers`,
                updated,
                total: booksWithoutCovers.length
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Error fetching book covers:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: 'Failed to fetch book covers',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
