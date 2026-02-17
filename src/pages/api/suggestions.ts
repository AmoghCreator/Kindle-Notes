import type { APIRoute } from 'astro';
import { getAllBooks, getAllNotes } from '../../lib/server/storage';
import { selectRandomSuggestion, toSuggestionPool } from '../../lib/export/random-suggestion';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    try {
        const includeTypes = url.searchParams.get('includeTypes') || 'all';
        // Support either a single comma-separated `excludeIds` value or repeated params
        const rawExcludeParams = url.searchParams.getAll('excludeIds');
        const excludeIds: string[] = rawExcludeParams
            .flatMap((val) => val.split(','))
            .map((entry) => entry.trim())
            .filter(Boolean);

        const [notes, books] = await Promise.all([getAllNotes(), getAllBooks()]);
        let pool = toSuggestionPool(notes, books);

        if (includeTypes !== 'all') {
            pool = pool.filter((entry) => entry.itemType === includeTypes);
        }

        const suggestion = selectRandomSuggestion(pool, { excludeIds });
        if (!suggestion) {
            return new Response(null, { status: 204 });
        }

        return new Response(JSON.stringify(suggestion), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ code: 'SERVER_ERROR', message: 'Failed to generate suggestion' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
