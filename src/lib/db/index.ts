/**
 * Dexie Database Bootstrap
 * 
 * Singleton database instance and initialization helper.
 * Import this module to access the shared database connection.
 */
import { KindleNotesDB } from './schema';

let dbInstance: KindleNotesDB | null = null;

/**
 * Get the singleton Dexie database instance.
 * Creates the instance on first call.
 */
export function getDB(): KindleNotesDB {
    if (!dbInstance) {
        dbInstance = new KindleNotesDB();
    }
    return dbInstance;
}

/**
 * Initialize the database and run any pending migrations.
 * Should be called once at app startup.
 */
export async function initDB(): Promise<KindleNotesDB> {
    const db = getDB();
    await db.open();
    return db;
}

/**
 * Close the database connection (useful for testing).
 */
export async function closeDB(): Promise<void> {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/**
 * Delete the entire database (useful for testing/reset).
 */
export async function deleteDB(): Promise<void> {
    await closeDB();
    await new KindleNotesDB().delete();
}
