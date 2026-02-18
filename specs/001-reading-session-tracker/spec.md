# Feature Specification: Reading Session Tracker & Book Standardization

**Feature Branch**: `001-reading-session-tracker`  
**Created**: 2026-02-17  
**Status**: Updated (Implementation-aligned)  
**Input**: User description: "Change library header to a reading tracker that shows current or yesterday reading session details (book cover, page, insight), add a page to browse and create daily reading session entries, include streak gamification, standardize book names and IDs via an external book metadata source for both Kindle uploads and manual reading entries, and show reading session entries on each book page."

## Clarifications

### Session 2026-02-17

- Q: What persistence model should be used for static-first reading sessions and catalog data? → A: IndexedDB via Dexie.
- Q: What defines a “confident” canonical match? → A: Score >= 0.90 auto-links, 0.70–0.89 requires user confirmation, <0.70 creates provisional record.
- Q: How should canonical-link traceability be captured? → A: Persist per-session canonical link audit metadata (source flow, resolution mode, confidence/provider, timestamp).

### Session 2026-02-19

- Q: How should low-confidence manual search results be handled during session entry? → A: Always show metadata candidates when any exist; auto-link only at >= 0.90, and allow explicit user selection or explicit "none of these" fallback.
- Q: How should Kindle upload canonicalization align with reading-session canonicalization? → A: Upload flow must hydrate IndexedDB (`books`, `notes`) and run canonicalization so import and manual flows share one canonical identity model.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log daily reading quickly (Priority: P1)

As a reader, I want to add a daily reading session entry with book, pages read, and optional insight so I can maintain a reliable record of what I read each day.

**Why this priority**: Capturing sessions is the core action that creates all feature value; without logging, there is no tracker, history, or streak.

**Independent Test**: Can be fully tested by creating a new reading session from the reading sessions page and confirming it appears in session history with the saved details.

**Acceptance Scenarios**:

1. **Given** I open the reading sessions page, **When** I submit a valid new session with date, selected book, and page progress, **Then** the entry is saved and shown in the sessions list.
2. **Given** I add an optional insight while creating a session, **When** the session is saved, **Then** the insight is displayed with that session entry.
3. **Given** I try to save a session without required fields, **When** I submit, **Then** I see clear validation feedback and the session is not saved.

---

### User Story 2 - See reading context on the library home (Priority: P1)

As a reader, I want the library header replaced with a reading tracker summary showing my current or most recent daily session (including cover, page progress, and insight) so I can immediately resume or reflect when I open the app.

**Why this priority**: The user explicitly wants the current header replaced with actionable reading context, making this a primary entry-point experience.

**Independent Test**: Can be fully tested by creating recent sessions and verifying the homepage summary presents the correct latest session context and fallback behavior.

**Acceptance Scenarios**:

1. **Given** I have a session logged for today, **When** I open the library page, **Then** the tracker summary displays today’s session details and book cover.
2. **Given** I have no session for today but one for yesterday, **When** I open the library page, **Then** the summary displays yesterday’s session details.
3. **Given** I have no prior sessions, **When** I open the library page, **Then** I see an empty-state prompt to add my first reading session.

---

### User Story 3 - Keep one canonical book catalog (Priority: P2)

As a reader, I want books from Kindle imports and manual reading-session entries to be matched to canonical book records so each real-world book has one standardized title and identifier in my library.

**Why this priority**: Consistent book identity prevents duplicates and ensures sessions and notes correctly roll up under the same book.

**Independent Test**: Can be fully tested by importing notes and creating manual sessions for the same book with slightly different names, then verifying they resolve to one catalog record.

**Acceptance Scenarios**:

1. **Given** a Kindle upload includes a book with variant title formatting, **When** the import is processed, **Then** the book is matched to a canonical catalog entry when a confident match exists.
2. **Given** I type a book while creating a session, **When** I search/select from metadata suggestions, **Then** the saved session is linked to the same canonical book record used elsewhere.
3. **Given** no confident match can be found, **When** a book is being added, **Then** the system creates a new catalog record and flags it as user-confirmed.
4. **Given** metadata search returns candidates below auto-link threshold, **When** I type a partial title during manual session entry, **Then** candidate options are still shown for selection instead of forcing immediate provisional creation.
5. **Given** I explicitly choose "none of these" in manual matching, **When** the session is saved, **Then** a provisional catalog path is used and audit metadata records the manual fallback choice.

---

### User Story 4 - Track motivation with streaks and per-book history (Priority: P3)

As a reader, I want to see my reading streak and view reading sessions on each book’s detail page so I stay motivated and can review progress for each title.

**Why this priority**: Gamification and contextual history increase engagement but depend on session logging and canonical matching.

**Independent Test**: Can be fully tested by logging sessions across consecutive days and opening a book page to verify streak calculation and filtered session history.

**Acceptance Scenarios**:

1. **Given** I log sessions on consecutive days, **When** I view tracker surfaces, **Then** the current streak reflects the number of uninterrupted reading days.
2. **Given** I skip a day, **When** I log in the next day, **Then** the streak resets according to the defined streak rules.
3. **Given** a book has related sessions, **When** I open that book’s page, **Then** I can see only sessions linked to that book.

### Edge Cases

- Multiple sessions for the same day should be allowed and ordered by most recent update, while streak counting still treats that date as a single reading day.
- Sessions with reversed or invalid page ranges (e.g., end before start) must be rejected with clear correction guidance.
- If book-cover metadata is unavailable, the tracker should show a consistent fallback cover placeholder without blocking session visibility.
- If external metadata lookup is temporarily unavailable, users must still be able to save entries with a provisional title and later reconcile to canonical records.
- Imported Kindle books with near-identical names and different authors must not be auto-merged unless match confidence meets threshold rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated reading sessions page where users can browse past sessions in reverse chronological order.
- **FR-002**: The system MUST allow users to create a new reading session entry with required fields: reading date, selected book, and page progress.
- **FR-003**: The system MUST allow users to add an optional insight/note to a reading session entry.
- **FR-004**: The system MUST validate reading-session input and prevent saving invalid entries (including missing required fields and invalid page ranges).
- **FR-005**: The system MUST replace the current library-page header area with a reading tracker summary component.
- **FR-006**: The tracker summary MUST display the most relevant recent session (today first, otherwise yesterday, otherwise latest historical session).
- **FR-007**: The tracker summary MUST include linked book display data for the session, including cover image when available, page progress context, and insight excerpt when present.
- **FR-008**: The system MUST show a clear call-to-action in the tracker area when no reading sessions exist.
- **FR-009**: The system MUST calculate and display a current-day streak count based on consecutive calendar days with at least one reading session.
- **FR-010**: The system MUST reset streak progression after a missed reading day while preserving historical session records.
- **FR-011**: The system MUST maintain canonical book records with standardized naming so each logical book is represented by one primary catalog identity.
- **FR-012**: The system MUST attempt canonical matching for books during Kindle-note ingestion and during manual session entry book selection.
- **FR-013**: The system MUST support user selection from metadata suggestions when adding a book during session entry to reduce duplicate catalog entries.
- **FR-014**: The system MUST create a provisional or user-confirmed catalog record when no confident canonical match is found.
- **FR-015**: The system MUST show reading sessions associated with a specific canonical book on that book’s detail page.
- **FR-016**: The system MUST ensure sessions and imported notes linked to the same canonical book appear under one unified book history view.
- **FR-017**: The system MUST preserve an auditable link from each session entry to its canonical book identifier.
- **FR-018**: The system MUST operate in a static-first architecture with no required project-owned backend service for reading-session persistence or canonical catalog management.
- **FR-019**: The system MUST persist reading sessions and canonical book catalog data in browser-side IndexedDB using Dexie.
- **FR-020**: The system MUST provide explicit loading states, actionable error messages, and accessible empty-state guidance for tracker, session-entry, and canonical matching workflows.
- **FR-021**: During manual session entry, the system MUST present match candidates whenever any candidate results are returned, regardless of confidence band, and reserve auto-link behavior for scores >= 0.90 only.
- **FR-022**: The upload flow MUST write imported `books` and `notes` into Dexie after server import success and then execute canonicalization so import metadata and session metadata remain consistent.
- **FR-023**: Upload success feedback MUST include canonicalization outcomes (auto-matched, needs-review, provisional) to make post-import matching status visible.

### Key Entities *(include if feature involves data)*

- **Reading Session**: A dated record of reading activity with attributes such as session date, canonical book reference, page start/end (or equivalent page progress), optional insight text, and timestamps.
- **Canonical Book**: The standardized book catalog record used across imports and manual entries, with attributes such as canonical title, author(s), external catalog reference, cover reference, and matching status.
- **Book Match Candidate**: A suggested metadata result considered during matching, with attributes such as candidate title/author, confidence score, source label, and user selection state.
- **Reading Streak Summary**: A derived user-progress view containing current streak count, longest streak count, last reading date, and streak status.

### Assumptions

- Reading sessions are user-specific and scoped to the single library owner in this product context.
- A “reading day” is determined by the user’s local calendar date.
- Users may log more than one session per day.
- Canonical matching uses an external metadata provider and confidence-based matching rules.
- Users can proceed with provisional book records if automated matching is unavailable.
- Browser local storage durability is provided through IndexedDB (Dexie).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of users can create and save a valid reading-session entry in under 60 seconds on first attempt.
- **SC-002**: At least 95% of library page loads with existing session data display a reading tracker summary without missing required session fields.
- **SC-003**: At least 90% of duplicate-book incidents (same real-world book represented multiple times) are prevented or consolidated through canonical matching workflows.
- **SC-004**: At least 80% of users who log sessions on day 1 return to log at least one additional session within 7 days.
- **SC-005**: For books with both notes and sessions, 100% of related session entries are visible from that book’s detail page.
- **SC-006**: For manual book lookup queries with at least one metadata candidate, 100% of flows present selectable candidate options before provisional fallback.
- **SC-007**: After successful upload, 100% of imported books and notes are available in Dexie-backed views without requiring a separate re-import.
