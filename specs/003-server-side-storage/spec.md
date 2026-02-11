# Feature Specification: Server-Side Storage for Kindle Clippings

**Feature Branch**: `003-server-side-storage`  
**Created**: February 11, 2026  
**Status**: Draft  
**Input**: User description: "Remove client-side database, implement server-side storage for uploaded Kindle clippings with future support for user comments"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload and View Kindle Clippings (Priority: P1)

A user uploads their Kindle clippings file and immediately sees their books and notes displayed in the library without relying on any client-side database. All data is stored server-side and rendered at build time or request time.

**Why this priority**: This is the core functionality - users must be able to upload and view their clippings. Without this, the application has no value.

**Independent Test**: Can be fully tested by uploading a clippings file and verifying that the library page displays all books with their notes correctly.

**Acceptance Scenarios**:

1. **Given** a user has a Kindle clippings file, **When** they upload it through the upload interface, **Then** the file is stored server-side and the library displays all parsed books and notes
2. **Given** a user has uploaded clippings, **When** they navigate to the library page, **Then** all books are displayed with accurate note counts and metadata
3. **Given** a user selects a specific book, **When** they view the book details, **Then** all notes for that book are displayed with their content and location information

---

### User Story 2 - Build-Time Rendering of Library Components (Priority: P2)

The library page uses book cards and note cards that are populated with server-stored data at build time, ensuring fast page loads and eliminating client-side database queries.

**Why this priority**: Performance is critical for user experience. Build-time rendering ensures instant page loads and better SEO.

**Independent Test**: Can be tested by building the site and verifying that the library HTML contains pre-rendered book and note cards without client-side hydration for data loading.

**Acceptance Scenarios**:

1. **Given** clippings data exists in server storage, **When** the site is built, **Then** library pages are generated with complete book and note information
2. **Given** a pre-rendered library page, **When** a user loads it, **Then** all content is immediately visible without loading states
3. **Given** multiple books in storage, **When** the library page loads, **Then** books are organized and filterable without client-side database operations

---

### User Story 3 - Foundation for User Annotations (Priority: P3)

The system uses note location (starting position) as a stable identifier, establishing the foundation for future functionality where users can add comments and supplements to their Kindle notes.

**Why this priority**: While not immediately user-facing, this architectural decision enables future enhancement without requiring data migration or refactoring.

**Independent Test**: Can be tested by verifying that each note has a stable location identifier that persists across page loads and can serve as a unique reference point.

**Acceptance Scenarios**:

1. **Given** a parsed Kindle note, **When** it is stored, **Then** its starting location is preserved as a unique identifier
2. **Given** notes from multiple upload sessions, **When** duplicate notes are detected (same location), **Then** they are properly deduplicated using location as the key
3. **Given** the data structure, **When** future user annotation features are planned, **Then** note locations can serve as foreign keys to a separate annotations store

---

### Edge Cases

- What happens when a user uploads the same clippings file multiple times?
- How does the system handle corrupted or malformed clippings files?
- What if a clippings file contains no valid notes or books?
- How are notes without location information handled?
- What happens when two notes have the same location identifier?
- How does the system handle extremely large clippings files (thousands of notes)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove all client-side database implementations and dependencies
- **FR-002**: System MUST store uploaded Kindle clippings files server-side
- **FR-003**: System MUST parse uploaded clippings and extract books, notes, and metadata
- **FR-004**: System MUST use note starting location as a stable identifier for each note
- **FR-005**: System MUST pass parsed clippings data to library, book card, and note card components
- **FR-006**: System MUST render book cards and note cards at build time using server-stored data
- **FR-007**: System MUST deduplicate notes based on their location identifier
- **FR-008**: System MUST preserve note location information for future annotation functionality
- **FR-009**: System MUST handle upload errors gracefully with clear user feedback
- **FR-010**: System MUST maintain data integrity across multiple upload sessions
- **FR-011**: System MUST support viewing all books in the library without client-side queries
- **FR-012**: System MUST support viewing individual book details with all associated notes
- **FR-013**: System MUST provide a clear separation between core note data (server-stored) and future user annotations (separate data store)

### Key Entities

- **Kindle Clippings File**: The uploaded text file containing all Kindle highlights, notes, and bookmarks from the user's device
- **Book**: Represents a book or document from which clippings were taken, including title, author, and metadata
- **Note**: An individual highlight, note, or bookmark from a Kindle book, with content, type, location, and timestamp
- **Note Location**: The starting position identifier from the Kindle clippings format, serving as a unique reference for each note
- **Upload Session**: The context of a single file upload, including timestamp, file information, and processing status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a clippings file and see their complete library within 5 seconds
- **SC-002**: Library pages load instantly (under 500ms) without loading states or spinners for data fetching
- **SC-003**: All client-side database code is removed, reducing client-side bundle size by at least 50KB
- **SC-004**: System correctly handles clippings files with up to 10,000 notes without performance degradation
- **SC-005**: Duplicate notes from multiple uploads are automatically deduplicated with 100% accuracy
- **SC-006**: Every note has a stable location identifier that persists across page navigation and sessions
- **SC-007**: Build time for the site remains under 30 seconds even with 1,000+ books
- **SC-008**: Zero client-side database initialization or query errors in browser console

## Scope Boundaries

### In Scope

- Removing client-side database implementation
- Server-side storage of uploaded clippings
- Parsing and storing note location identifiers
- Build-time rendering of library components
- Data architecture supporting future user annotations

### Out of Scope

- Implementation of user comment/annotation features (future work)
- User authentication or multi-user support
- Editing or modifying original Kindle clippings
- Export functionality for modified clippings
- Real-time collaborative features

## Assumptions

1. Server-side storage solution already exists or will be implemented as part of this feature
2. Existing upload, book card, and note card components can be adapted to use server-provided data
3. Build process can efficiently handle data injection for static site generation
4. Note location identifiers from Kindle are sufficiently unique within a book
5. Future user annotations will be stored in a separate data store (not part of this feature)
6. Single-user application - no concurrent access conflicts expected
7. Browser local storage may still be used for temporary UI state (not data persistence)

## Dependencies

- Existing upload functionality must be preserved or adapted
- Parser logic must extract and preserve note location information
- Build system must support data-driven page generation
- Server storage infrastructure must be available and configured
