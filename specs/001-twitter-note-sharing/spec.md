# Feature Specification: Twitter-First Note Sharing Enhancements

**Feature Branch**: `001-twitter-note-sharing`  
**Created**: 2026-02-13  
**Status**: Draft  
**Input**: User description: "Revisit note sharing: make sharing Twitter-friendly, include associated highlight automatically with quotes and book attribution when sharing notes, ensure copied highlights/notes include quotes and book context, and add a random highlight/note suggestion at the top of index page that can be shared directly."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Share Notes with Linked Highlight Context (Priority: P1)

As a reader, I can share a note in a Twitter-friendly format that automatically includes its associated highlight, with quote formatting and book attribution, so the shared content is understandable and complete.

**Why this priority**: This is the primary value request and directly impacts share quality and usability.

**Independent Test**: Can be fully tested by selecting a note with an associated highlight and verifying the generated share text includes the note, linked highlight, quotes, and book attribution in one flow.

**Acceptance Scenarios**:

1. **Given** a note that has an associated highlight, **When** the user selects share for that note, **Then** the share output includes both note and associated highlight in a Twitter-friendly format.
2. **Given** a note that has an associated highlight, **When** the share output is generated, **Then** both note text and highlight text are wrapped in quote styling and include the source book title.
3. **Given** a note without an associated highlight, **When** the user selects share, **Then** the system shares the note with quote styling and book attribution and clearly indicates no linked highlight was included.

---

### User Story 2 - Copy Share-Ready Quotes for Highlights and Notes (Priority: P2)

As a reader, I can copy either a highlight or a note in a consistent quote-ready format including book attribution, so I can paste it anywhere with minimal manual editing.

**Why this priority**: Consistent copy behavior supports the sharing workflow and reduces friction beyond one-click sharing.

**Independent Test**: Can be fully tested by using copy actions on both a highlight and a note and verifying clipboard content format and attribution.

**Acceptance Scenarios**:

1. **Given** a highlight is visible, **When** the user copies the highlight, **Then** clipboard text includes quote formatting and the source book attribution.
2. **Given** a note is visible, **When** the user copies the note, **Then** clipboard text includes quote formatting and the source book attribution.
3. **Given** a shared book context with title and author metadata, **When** content is copied, **Then** attribution includes available metadata in a consistent order.

---

### User Story 3 - Share Random Daily Suggestion from Home (Priority: P3)

As a returning visitor, I see a random highlight or note suggestion at the top of the index page and can share it directly, so I can quickly post meaningful content without searching.

**Why this priority**: This adds discovery and convenience, but depends on having robust sharing behavior first.

**Independent Test**: Can be fully tested by loading the index page, confirming one random suggestion appears, and triggering direct share from that suggestion.

**Acceptance Scenarios**:

1. **Given** at least one note or highlight exists, **When** the user opens the index page, **Then** one random suggestion appears at the top with clear content type labeling.
2. **Given** a random suggestion is displayed, **When** the user selects share from that suggestion, **Then** share content is generated immediately using the same formatting and attribution rules as standard share actions.
3. **Given** no notes or highlights exist, **When** the user opens the index page, **Then** the suggestion area shows an empty-state message and no share action.

---

### Edge Cases

- Associated highlight exists but is empty or whitespace-only
- Note or highlight text is very long and risks unreadable or truncated sharing output
- Book metadata is partially missing (for example, title present but author absent)
- User attempts to share from random suggestion after underlying note/highlight was deleted
- Random suggestion repeatedly returns the same item in short sessions where multiple items are available

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate Twitter-friendly share text for a selected note.
- **FR-002**: System MUST automatically include the associated highlight when sharing a note if an associated highlight exists.
- **FR-003**: System MUST apply quote styling to copied or shared note text.
- **FR-004**: System MUST apply quote styling to copied or shared highlight text.
- **FR-005**: System MUST include source book attribution in all copied and shared outputs for notes and highlights.
- **FR-006**: System MUST provide direct copy action for notes that places formatted text in the clipboard.
- **FR-007**: System MUST provide direct copy action for highlights that places formatted text in the clipboard.
- **FR-008**: System MUST show one random suggestion (note or highlight) at the top of the index page when content exists.
- **FR-009**: Users MUST be able to trigger share directly from the random suggestion module.
- **FR-010**: Random suggestion share output MUST follow the same quote and attribution rules as standard sharing.
- **FR-011**: System MUST display a clear empty state when no notes or highlights are available for random suggestion.
- **FR-012**: System MUST handle missing optional attribution fields gracefully while still providing available book context.
- **FR-013**: System MUST make copy/share action outcomes explicit to users (success or failure feedback).

### Key Entities *(include if feature involves data)*

- **Shareable Note**: A user-authored note with content, optional linked highlight reference, and source book metadata.
- **Shareable Highlight**: A highlighted passage with content and source book metadata; may be linked to one or more notes.
- **Book Attribution**: Human-readable source context for shared/copied content (for example title and, when available, author).
- **Random Suggestion**: A single surfaced note or highlight chosen from available user content for quick sharing on the index page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of note share actions include associated highlight content when a linked highlight exists.
- **SC-002**: At least 98% of copy actions for notes and highlights produce correctly formatted output with quote styling and book attribution.
- **SC-003**: At least 90% of users can complete a share action from the random suggestion module on first attempt.
- **SC-004**: Median time from index page load to successful share from random suggestion is under 20 seconds in usability testing.
- **SC-005**: User-reported formatting issues for Twitter-oriented sharing decrease by at least 50% compared with the previous sharing behavior baseline.

## Assumptions

- A note can be associated with zero or one primary highlight for sharing context.
- Twitter-friendly formatting prioritizes concise readability and quote-style presentation over exact source layout replication.
- Book attribution always includes title, and includes author only when available.
- Random suggestion is selected from the current user-visible note/highlight dataset and does not require personalization history.
