# Research: Kindle Text File Parser Implementation

**Date**: February 8, 2026  
**Context**: Implementing text file import with deduplication for Kindle notes website  

## Text File Format Analysis

### Decision: Enhanced Pattern Matching with Graceful Degradation
**Rationale**: Kindle export formats can vary slightly between versions and devices. A robust parser needs to handle both strict and loose patterns.

**Implementation Strategy**:
- Primary: Strict regex patterns for well-formed entries
- Fallback: Loose patterns for malformed entries  
- Recovery: Attempt to salvage partial data when strict parsing fails
- Validation: Multi-layer validation (pre-parse, parse, post-parse)

**Alternatives considered**:
- Strict parsing only: Rejected due to real-world format variations
- Manual correction prompts: Rejected as too complex for user experience

## Deduplication Strategy

### Decision: Multi-Layer Composite Key Approach
**Rationale**: Need to handle exact duplicates (O(1) performance) while also detecting content updates at the same location through fuzzy matching.

**Implementation**:
- Exact Match: `bookId:location:type:textHash` for perfect duplicates
- Location Match: `bookId:location:type` for fuzzy comparison
- Fuzzy Threshold: 70% similarity for update detection
- Performance: Exact lookup first, then fuzzy only for location matches

**Alternatives considered**:
- Text similarity only: Rejected due to performance concerns with large datasets
- Location-only matching: Rejected as insufficient for distinguishing highlights vs notes
- External deduplication service: Rejected to maintain client-side architecture

## Large File Processing

### Decision: Streaming + Web Worker Architecture  
**Rationale**: Browser memory limits and UI responsiveness require chunked processing with background workers.

**Implementation**:
- Stream files in 64KB chunks to prevent memory overload
- Use Web Workers for CPU-intensive parsing to maintain UI responsiveness
- Progressive result streaming to show parsing progress
- Backpressure limits to prevent memory bloat

**Alternatives considered**:
- Synchronous parsing: Rejected due to UI blocking on large files
- Server-side processing: Rejected to maintain frontend-only architecture
- IndexedDB streaming: Rejected as overly complex for this use case

## Integration Strategy

### Decision: Extend Existing Parser Infrastructure
**Rationale**: Leverage established patterns and maintain code consistency while adding new capabilities.

**Implementation**:
- Extend existing `BaseKindleParser` class structure
- Reuse validation utilities and error handling patterns
- Add deduplication as a post-processing step
- Maintain existing `ParseResult` interface with extensions

**Alternatives considered**:
- Separate parser system: Rejected to avoid code duplication
- Complete rewrite: Rejected due to unnecessary complexity
- Plugin architecture: Rejected as over-engineered for current needs

## Storage Integration

### Decision: Enhanced Dexie Bulk Operations with Transactions
**Rationale**: Optimal performance and data consistency for large imports while maintaining existing storage patterns.

**Implementation**:
- Transactional bulk operations for atomicity
- Cross-session deduplication by loading existing notes
- Efficient book-note relationship mapping
- Batch processing to optimize IndexedDB performance

**Alternatives considered**:
- Individual record insertion: Rejected due to poor performance with large datasets
- Separate import storage: Rejected as unnecessary complexity
- JSON file storage: Rejected to maintain existing IndexedDB architecture

## Performance Targets

### Decision: Client-Side Processing with Resource Management
**Rationale**: Maintain frontend-only architecture while handling realistic file sizes.

**Targets**:
- File Size: Up to 10MB text files
- Entry Count: Up to 10,000 individual notes/highlights  
- Processing Time: <30 seconds for largest supported files
- Memory Usage: <100MB peak during processing
- UI Responsiveness: <100ms frame times during processing

**Resource Management**:
- Worker thread isolation for parsing
- Progressive memory cleanup
- Cancellable operations for user control
- Progress feedback for long operations

## Technology Decisions

### Decision: Leverage Existing Tech Stack
**Rationale**: Maintain consistency with established Astro + TypeScript + Dexie architecture.

**Stack**:
- **Parser**: TypeScript with enhanced regex patterns
- **Storage**: Existing Dexie IndexedDB setup  
- **Processing**: Web Workers for background parsing
- **UI**: Existing Astro component patterns
- **Testing**: Vitest for unit tests, Playwright for E2E

**No new dependencies required** - solution uses browser APIs and existing libraries only, maintaining the project's minimal dependency principle.