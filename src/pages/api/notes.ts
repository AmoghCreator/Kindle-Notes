import type { APIRoute } from 'astro';
import { getAllNotes, getNotesByBookId, getRecentNotes } from '../../lib/server/storage';

export const GET: APIRoute = async ({ url }) => {
    try {
        const bookId = url.searchParams.get('bookId');
        const recent = url.searchParams.get('recent');
        const limit = parseInt(url.searchParams.get('limit') || '10');

        let notes;
        if (bookId) {
            notes = await getNotesByBookId(bookId);
        } else if (recent === 'true') {
            notes = await getRecentNotes(limit);
        } else {
            notes = await getAllNotes();
        }

        return new Response(JSON.stringify(notes), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to fetch notes' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
