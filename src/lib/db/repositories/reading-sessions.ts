/**
 * Reading Sessions Repository
 * 
 * CRUD and query operations for ReadingSession records in Dexie.
 */
import { getDB } from '../index';
import type { ReadingSession } from '../../types';

/**
 * Create a new reading session.
 */
export async function createReadingSession(
    input: Omit<ReadingSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ReadingSession> {
    const db = getDB();
    const now = new Date();
    const session: ReadingSession = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
    };
    await db.readingSessions.put(session);
    return session;
}

/**
 * Get a reading session by ID.
 */
export async function getReadingSession(id: string): Promise<ReadingSession | undefined> {
    const db = getDB();
    return db.readingSessions.get(id);
}

/**
 * List all reading sessions, ordered by sessionDate descending (most recent first).
 */
export async function listReadingSessions(limit?: number): Promise<ReadingSession[]> {
    const db = getDB();
    let collection = db.readingSessions.orderBy('sessionDate').reverse();
    if (limit) {
        collection = collection.limit(limit);
    }
    return collection.toArray();
}

/**
 * Get reading sessions for a specific canonical book.
 */
export async function getSessionsByCanonicalBookId(canonicalBookId: string): Promise<ReadingSession[]> {
    const db = getDB();
    return db.readingSessions
        .where('canonicalBookId')
        .equals(canonicalBookId)
        .reverse()
        .sortBy('sessionDate');
}

/**
 * Get reading sessions for a specific date.
 */
export async function getSessionsByDate(sessionDate: string): Promise<ReadingSession[]> {
    const db = getDB();
    return db.readingSessions.where('sessionDate').equals(sessionDate).toArray();
}

/**
 * Get all distinct session dates, sorted descending.
 */
export async function getDistinctSessionDates(): Promise<string[]> {
    const db = getDB();
    const sessions = await db.readingSessions.orderBy('sessionDate').reverse().toArray();
    const dateSet = new Set<string>();
    for (const s of sessions) {
        dateSet.add(s.sessionDate);
    }
    return Array.from(dateSet);
}

/**
 * Get the most recent reading session.
 */
export async function getMostRecentSession(): Promise<ReadingSession | undefined> {
    const db = getDB();
    return db.readingSessions.orderBy('sessionDate').reverse().first();
}

/**
 * Get sessions for today and yesterday (for tracker header).
 */
export async function getTrackerSessions(today: string, yesterday: string): Promise<{
    todaySession?: ReadingSession;
    yesterdaySession?: ReadingSession;
    latestSession?: ReadingSession;
}> {
    const db = getDB();

    const todaySessions = await db.readingSessions.where('sessionDate').equals(today).toArray();
    const yesterdaySessions = await db.readingSessions.where('sessionDate').equals(yesterday).toArray();

    let latestSession: ReadingSession | undefined;
    if (todaySessions.length === 0 && yesterdaySessions.length === 0) {
        latestSession = await db.readingSessions.orderBy('sessionDate').reverse().first();
    }

    return {
        todaySession: todaySessions[0],
        yesterdaySession: yesterdaySessions[0],
        latestSession,
    };
}

/**
 * Count total reading sessions.
 */
export async function countReadingSessions(): Promise<number> {
    const db = getDB();
    return db.readingSessions.count();
}

/**
 * Get all reading sessions (for streak calculation).
 */
export async function getAllReadingSessions(): Promise<ReadingSession[]> {
    const db = getDB();
    return db.readingSessions.orderBy('sessionDate').toArray();
}
