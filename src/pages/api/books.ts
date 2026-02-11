import type { APIRoute } from 'astro';
import { getAllBooks } from '../../lib/server/storage';

export const GET: APIRoute = async () => {
  try {
    const books = await getAllBooks();
    
    return new Response(JSON.stringify(books), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch books' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
