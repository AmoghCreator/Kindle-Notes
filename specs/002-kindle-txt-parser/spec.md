# Feature Specification: Kindle Text File Parser

**Feature Branch**: `002-kindle-txt-parser`  
**Created**: February 8, 2026  
**Status**: Draft  
**Input**: User description: "I need to parse a .txt file where we will have notes in following format, here is a sample of large set of notes I have, I dont need a db for indexing all this, all the data can exist in a JSON storage file rn, and we need to make sure that no two notes or highlights that are EXACTLY THE SAME are not indexed again, there might be cases where the notes have been updated, in that case if the location is exactly the same, the notes can be updated in the JSON storage. We need to reflect the extracted notes / highlights / books etc. in the UI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Kindle Notes File (Priority: P1)

Users can upload their exported Kindle notes text file and have all notes, highlights, and book metadata automatically parsed and stored.

**Why this priority**: This is the core functionality - without the ability to import notes, the feature has no value.

**Independent Test**: Can be fully tested by uploading a Kindle notes text file and verifying that books, highlights, and notes are correctly extracted and stored in JSON format.

**Acceptance Scenarios**:

1. **Given** a user has a Kindle notes export file, **When** they upload the file, **Then** the system parses all books, highlights, and notes from the file
2. **Given** the file contains multiple books, **When** parsing completes, **Then** each book is stored separately with its associated notes and highlights
3. **Given** the file contains timestamps and location data, **When** parsing completes, **Then** all metadata is preserved and stored with each note/highlight

---

### User Story 2 - Duplicate Detection and Prevention (Priority: P1)

When importing notes that already exist in the system, duplicate highlights and notes are not created again.

**Why this priority**: Critical for data integrity - users may import the same file multiple times or export incremental updates.

**Independent Test**: Can be tested by importing the same file twice and verifying no duplicate entries are created.

**Acceptance Scenarios**:

1. **Given** a highlight already exists in the system, **When** the same highlight is imported again, **Then** no duplicate entry is created
2. **Given** a note already exists with identical text and location, **When** the same note is imported, **Then** no duplicate is created
3. **Given** a note exists but has been updated (same location, different text), **When** the updated version is imported, **Then** the existing note is updated with the new content

---

### User Story 3 - View Parsed Notes in Library (Priority: P2)

Users can view all imported books, highlights, and notes in the existing library interface.

**Why this priority**: Makes the imported data useful by displaying it in the UI - builds on existing library functionality.

**Independent Test**: Can be tested by importing notes and then navigating to the library to see books and notes displayed correctly.

**Acceptance Scenarios**:

1. **Given** notes have been imported from a text file, **When** users visit the library, **Then** all books from the text file appear alongside existing books
2. **Given** a book has both highlights and notes, **When** users view the book details, **Then** both types of content are displayed appropriately
3. **Given** notes have timestamps and locations, **When** displayed in the UI, **Then** metadata is shown to help users identify and organize their notes

---

### Edge Cases

- What happens when the text file format is malformed or incomplete?
- How does the system handle special characters or non-standard formatting in notes?
- What occurs when a text file contains books that partially overlap with existing library content?
- How are notes handled when they contain formatting or special characters from the Kindle export?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse Kindle exported text files containing book metadata, highlights, and user notes
- **FR-002**: System MUST extract book titles, authors, and identifiers from the text file format
- **FR-003**: System MUST capture highlight text, page numbers, locations, and timestamps from each entry
- **FR-004**: System MUST capture user note text, locations, and timestamps from each entry
- **FR-005**: System MUST store all parsed data in JSON format without requiring a database
- **FR-006**: System MUST prevent duplicate highlights by comparing exact text and location matches
- **FR-007**: System MUST prevent duplicate notes by comparing exact text and location matches
- **FR-008**: System MUST update existing notes when the same location has different content (indicating an edit)
- **FR-009**: System MUST display imported books in the existing library interface
- **FR-010**: System MUST display imported highlights and notes in the existing book detail views
- **FR-011**: System MUST handle text files with multiple books and preserve the association between notes and their source books
- **FR-012**: System MUST preserve all original metadata including dates, page numbers, and location references

### Key Entities *(include if feature involves data)*

- **ImportedBook**: Represents a book identified in the text file, containing title, author, and unique identifier
- **ImportedHighlight**: Text highlighted by user, including content, location, page, and timestamp
- **ImportedNote**: User-created annotations, including content, location, page, and timestamp
- **ParsedEntry**: Individual entries from the text file before being categorized as highlights or notes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully import a complete Kindle notes text file in under 30 seconds
- **SC-002**: System correctly identifies and separates 100% of books, highlights, and notes from properly formatted files
- **SC-003**: Duplicate detection prevents 100% of exact duplicate highlights and notes from being stored
- **SC-004**: Updated notes (same location, different content) are correctly replaced in 100% of cases
- **SC-005**: All imported content appears correctly in the existing library interface within 5 seconds of import completion
- **SC-006**: System handles text files containing up to 10,000 individual notes and highlights without performance degradation
