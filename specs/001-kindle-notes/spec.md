# Feature Specification: Kindle Notes Website

**Feature Branch**: `001-kindle-notes`  
**Created**: 2026-02-04  
**Status**: Updated (Implementation-aligned)  
**Input**: User description: "The website stores users' Kindle notes/highlights; users upload their Kindle notes; the site organizes them by book and page; core feature is easy note finding; one-click sharing: Twitter (message format) and Instagram Story (exported image); users can browse, edit, and add to their notes."

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

### User Story 1 - Import & Organize Kindle Notes (Priority: P1)

Users upload their Kindle notes file and immediately see notes organized by book and page with clear navigation.

**Why this priority**: Without import and organization, the site provides no value. This unlocks the primary purpose: turning raw Kindle notes into a browsable, personal knowledge base.

**Independent Test**: Can be fully tested by uploading a valid Kindle notes file and verifying that notes are parsed, associated to books and pages, and visible with navigable grouping—no search or sharing required.

**Acceptance Scenarios**:

1. **Given** a valid Kindle notes export file, **When** the user uploads it, **Then** the system parses notes and displays them grouped by book and page.
2. **Given** notes parsed for multiple books, **When** the user selects a book, **Then** the page-level groups expand to show notes in reading order.
3. **Given** an invalid or malformed file, **When** the user uploads it, **Then** the system shows a clear error explaining what went wrong and how to fix it.

---

### User Story 2 - Find Notes Fast (Search & Filter) (Priority: P2)

Users quickly find specific notes via search and filters (by book, page range, date, tags).

**Why this priority**: Discovery is core to utility. Fast, precise retrieval makes the archive useful for reference and sharing.

**Independent Test**: Can be fully tested by indexing uploaded notes and running representative searches and filters without import or sharing dependencies beyond sample data.

**Acceptance Scenarios**:

1. **Given** a set of imported notes, **When** the user searches by keyword, **Then** matching notes appear with highlighted query terms.
2. **Given** imported notes across multiple books, **When** the user filters by a specific book, **Then** only notes from that book are shown.
3. **Given** notes with page metadata, **When** the user filters by a page range, **Then** only notes within that range are shown.

---

### User Story 3 - One-Click Share (Twitter & Instagram Story) (Priority: P3)

Users share a note instantly: as a preformatted Twitter message or as an exported image suitable for Instagram Story.

**Why this priority**: Sharing amplifies value beyond personal archive and motivates regular use.

**Independent Test**: Can be fully tested by selecting a note and generating share outputs independently of external APIs (no posting required).

**Acceptance Scenarios**:

1. **Given** a selected note, **When** the user chooses "Share → Twitter", **Then** a prefilled message is generated including note text, book title, and optional source attribution.
2. **Given** a selected note, **When** the user chooses "Share → Instagram Story", **Then** an image is generated with legible typography, book/title attribution, and safe margins.
3. **Given** a long note, **When** the user selects Twitter share, **Then** the system provides intelligent truncation with an indicator and preserves attribution.
4. **Given** a Random Spark suggestion contains a long note, **When** the card is displayed, **Then** the full note text is shown by default in the UI.
5. **Given** a Random Spark suggestion is visible, **When** the user clicks "Copy Full", **Then** the copied output contains untrimmed note/highlight text plus attribution.
6. **Given** a Random Spark suggestion is visible, **When** the user clicks "Copy Summary", **Then** the copied output uses truncated preview text and retains attribution.

---

### User Story 4 - Browse, Edit, and Annotate (Priority: P3)

Users browse their notes, make edits, add tags/annotations, and save changes for future retrieval.

**Why this priority**: Enables curation and personalization, improving search and share outcomes over time.

**Independent Test**: Can be fully tested by editing a note (text, tags) and verifying persistence and subsequent searchability without sharing features.

**Acceptance Scenarios**:

1. **Given** an existing note, **When** the user edits its text or adds tags, **Then** the changes are saved and reflected in subsequent views and searches.
2. **Given** an existing note, **When** the user reassigns it to a different book or page, **Then** the system validates the change and updates associations.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Import files that are extremely large (e.g., >10MB) or contain thousands of notes
- Duplicate notes across multiple imports or overlapping exports
- Missing or malformed metadata (book titles, page numbers, timestamps)
- Non-ASCII characters and right-to-left languages in notes
- Very long notes that exceed platform limits (Twitter character caps)
- Image generation for Instagram when note contains special characters or line breaks
- Conflicts when editing notes imported from multiple sources
- User attempts to share a note with restricted privacy settings

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST allow users to upload a Kindle notes export file and receive immediate feedback on parsing status.
- **FR-002**: System MUST parse notes into `Book`, `Page`, and `Note` groupings preserving original order.
- **FR-003**: System MUST provide fast search across notes with keyword highlighting and filters (book, page range, date, tags).
- **FR-004**: Users MUST be able to generate a Twitter message from a selected note, including attribution (book title, optional author) and safe truncation.
- **FR-005**: Users MUST be able to export a shareable image for Instagram Story from a selected note with legible typography and attribution.
- **FR-006**: Users MUST be able to edit notes (text), add/remove tags, and save changes.
- **FR-007**: System MUST support basic user authentication to ensure private access to personal notes. [NEEDS CLARIFICATION: auth method choice]
- **FR-008**: System MUST provide clear error messages and recovery actions for invalid imports or failed image generation.
- **FR-009**: System MUST persist user notes, edits, and tags reliably.
- **FR-010**: System MUST apply privacy controls for sharing (default attribution and visibility settings). [NEEDS CLARIFICATION: default sharing/privacy]
- **FR-011**: System MUST support deduplication across imports to prevent repeated notes.
- **FR-012**: System MUST handle non-ASCII text and right-to-left scripts in both text and image exports.
- **FR-013**: System MUST provide accessible UI controls and semantic structure meeting WCAG 2.1 AA.
- **FR-014**: System MUST process large imports (e.g., 10k notes) within a reasonable time and show progress.
- **FR-015**: System MUST accept at least one standard Kindle export format for notes. [NEEDS CLARIFICATION: accepted import file formats]
- **FR-016**: Random Spark suggestion cards MUST render full note/highlight text in the visible card content by default.
- **FR-017**: Random Spark suggestion cards MUST provide separate actions for copying full text and copying summary text.
- **FR-018**: Summary-copy behavior MUST use preview-length text while full-copy behavior MUST use untrimmed source text.

### Key Entities *(include if feature involves data)*

- **User**: Represents an account holder; attributes: name (optional), email/identifier, settings, privacy defaults.
- **Book**: Logical grouping for notes; attributes: title, author (optional), identifiers; relationship: has many `Note`s.
- **Note**: Core content entity; attributes: text, created/imported timestamp, page number (optional/location), tags, source file reference.
- **Upload**: Import session; attributes: filename, size, status, counts parsed/failed, deduplication summary; relationship: produces many `Note`s.
- **ShareRequest**: Generated share artifacts; attributes: type (twitter|instagram), payload (message|image metadata), attribution settings, timestamp.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users import a standard Kindle notes file and see organized notes in under 30 seconds for 1,000-note files; progress feedback shown for larger files.
- **SC-002**: Users can find a specific note via search in under 3 seconds with keyword highlighting on typical datasets (≤10k notes).
- **SC-003**: 90% of users successfully generate a Twitter message or Instagram image on first attempt without guidance.
- **SC-004**: 95% of UI actions meet accessibility checks (automated) and core pages achieve a high usability score in user tests.
- **SC-005**: Duplicate notes across imports reduced to ≤2% via deduplication.
- **SC-006**: For long Random Spark suggestions (>140 characters), 100% of rendered cards show full note text while Summary copy output remains preview-length.

## Assumptions

- Users possess a Kindle notes export file produced by common Kindle workflows (e.g., consolidated text export). Exact accepted formats to be finalized per FR-015.
- Sharing actions generate outputs locally (message text or image file) without requiring third-party API posting.
- Default privacy is personal; sharing is explicit per note.
- Authentication is minimal and purpose is private access to personal archive; method choice will be clarified.
- Performance targets assume typical personal archives (≤10k notes) and modern desktop/mobile browsers.
