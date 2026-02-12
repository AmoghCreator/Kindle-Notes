# Feature Specification: Highlight-Note Association

**Feature Branch**: `004-highlight-note-link`  
**Created**: February 12, 2026  
**Status**: Draft  
**Input**: User description: "Add a parsing rule where if a note immediately follows a highlight, that note is associated with that highlighted section, modify the UI logic to club note and highlight together"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Associated Notes with Highlights (Priority: P1)

Users viewing their Kindle highlights can see their personal notes displayed directly beneath or alongside the highlighted text, making the connection between highlight and annotation immediately clear.

**Why this priority**: This is the core user value - understanding what they thought when they highlighted something. Without this association, users must mentally connect highlights with notes themselves.

**Independent Test**: Can be fully tested by importing a Kindle file containing highlight-note pairs, then viewing a book in the UI to verify notes appear associated with their highlights.

**Acceptance Scenarios**:

1. **Given** a user has imported Kindle notes where a note immediately follows a highlight, **When** they view that book in the library, **Then** the note appears directly beneath or alongside its associated highlight
2. **Given** a highlight has an associated note, **When** displayed in the UI, **Then** the note and highlight are visually grouped together to show their relationship
3. **Given** a highlight has no associated note, **When** displayed in the UI, **Then** the highlight appears normally without any note attachment

---

### User Story 2 - Distinguish Standalone Notes (Priority: P2)

Users can distinguish between notes attached to highlights and standalone notes that were created independently in Kindle.

**Why this priority**: Maintains clarity for users who use both types of annotations - some notes comment on highlights, others are standalone thoughts.

**Independent Test**: Can be tested by importing a file with both associated and standalone notes, then verifying they are displayed differently in the UI.

**Acceptance Scenarios**:

1. **Given** a note is not associated with any highlight (standalone), **When** displayed in the UI, **Then** it appears as a distinct entry separate from highlights
2. **Given** a book has both associated notes and standalone notes, **When** viewing the book, **Then** users can clearly distinguish between the two types
3. **Given** notes are sorted by location, **When** displayed, **Then** associated notes stay grouped with their highlights while standalone notes appear in their correct location order

---

### User Story 3 - Handle Complex Sequences (Priority: P2)

The system correctly handles various sequences of highlights and notes, such as multiple highlights in a row, multiple notes without highlights, or alternating patterns.

**Why this priority**: Real Kindle exports have irregular patterns - users don't always follow highlight-then-note order, and the system needs to handle all cases gracefully.

**Independent Test**: Can be tested by creating a Kindle export with various patterns (highlight-highlight-note, note-note-highlight, etc.) and verifying correct associations.

**Acceptance Scenarios**:

1. **Given** two highlights appear consecutively followed by a note, **When** processed, **Then** the note associates only with the immediately preceding highlight
2. **Given** multiple notes appear without any highlights between them, **When** processed, **Then** each note is treated as standalone
3. **Given** an alternating pattern of highlight-note-highlight-note, **When** processed, **Then** each note correctly associates with its preceding highlight

---

### Edge Cases

- What happens when the last item in a book is a highlight with no following note?
- How does the system handle a note at the beginning of a file before any highlights?
- What occurs when location data suggests a note doesn't sequentially follow a highlight?
- How are associations preserved when notes are updated during re-import?
- What happens when a single note appears to reference multiple consecutive highlights?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when a note immediately follows a highlight in the Kindle export sequence
- **FR-002**: System MUST create an association between a note and its preceding highlight when detected sequentially
- **FR-003**: System MUST store the association in a way that links the note ID to the highlight ID
- **FR-004**: UI MUST display associated notes directly beneath or alongside their linked highlights
- **FR-005**: UI MUST visually group highlight-note pairs to show their relationship (e.g., indentation, connecting line, container)
- **FR-006**: UI MUST display standalone notes (without associated highlights) as distinct entries
- **FR-007**: System MUST handle the case where a highlight has no following note (display as standalone highlight)
- **FR-008**: System MUST handle the case where multiple highlights appear before a note (associate note only with immediately preceding highlight)
- **FR-009**: System MUST preserve highlight-note associations when updating existing entries during re-import
- **FR-010**: System MUST maintain correct location-based sorting while keeping highlight-note pairs visually grouped
- **FR-011**: System MUST allow users to view highlights and notes in both grouped (by association) and sequential (by location) modes
- **FR-012**: System MUST ensure duplicate detection still works correctly for both associated and standalone notes

### Key Entities *(include if feature involves data)*

- **Highlight**: A highlighted text passage, can optionally have one associated note
- **Note**: An annotation, can be either associated with a highlight or standalone
- **HighlightNotePair**: Represents the association between a highlight and its note, preserving their relationship for display
- **AssociationMetadata**: Information about how the association was determined (sequential parsing, location proximity, user manual linking)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When viewing a book with highlight-note pairs, users can identify which notes belong to which highlights in under 2 seconds without reading content
- **SC-002**: System correctly associates 95% or more of sequential highlight-note pairs from standard Kindle exports
- **SC-003**: Users can distinguish between associated notes and standalone notes within 1 second of viewing a book page
- **SC-004**: Display of highlight-note pairs reduces the time users spend searching for related annotations by 60% compared to separate display
- **SC-005**: Association logic processes Kindle files containing 1000+ entries without performance degradation (under 30 seconds total)
- **SC-006**: Re-importing updated Kindle files preserves existing highlight-note associations in 100% of unchanged entries

## Scope and Constraints

### In Scope

- Detecting sequential highlight-note patterns during import
- Storing associations between highlights and notes
- UI modifications to display associated pairs together
- Handling various sequence patterns (standalone notes, standalone highlights, multiple items)
- Preserving associations during re-import and updates

### Out of Scope

- Manual editing of associations by users (future feature)
- Associating notes with highlights based on content similarity rather than sequence
- Supporting multiple notes per highlight or multiple highlights per note
- Retroactively creating associations for previously imported data (would require re-import)
- Merging overlapping highlights with associated notes

## Assumptions

1. Kindle export format consistently places notes immediately after their associated highlights in the file sequence
2. Location data in Kindle exports is reliable for determining entry sequence
3. Users understand that associations are created based on import sequence, not semantic content
4. The visual grouping approach will be consistent with existing UI design patterns
5. Existing data model can be extended to include highlight-note associations without breaking changes
6. Performance impact of displaying grouped pairs is negligible compared to current note display

## Dependencies

- Feature 002 (Kindle Text Parser): Must be operational to provide parsed highlight and note data
- Feature 001 (Kindle Notes Library): UI components must support display modifications
- Existing data storage: JSON storage structure must support association metadata
- Current type definitions: Note and Highlight types may need extension to include association references

## Open Questions

None at this time. All critical decisions have reasonable defaults based on Kindle export format conventions and existing UI patterns.
