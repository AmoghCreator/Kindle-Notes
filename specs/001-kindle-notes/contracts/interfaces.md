# API Contracts: Kindle Notes Website

**Context**: Client-side application with minimal backend  
**Scope**: Internal module interfaces and optional backend endpoints  
**Format**: TypeScript interfaces and OpenAPI for backend services

## Client-Side Module Contracts

Since this is a static site with client-side processing, most "APIs" are TypeScript module interfaces between components.

### File Parser Interface

```typescript
// src/lib/parsers/interface.ts
export interface KindleParser {
  /**
   * Parse uploaded Kindle export file
   * @param file - File from input[type=file]
   * @returns Promise with parsed data or errors
   */
  parse(file: File): Promise<ParseResult>;
  
  /**
   * Validate file format before parsing
   * @param file - File to validate
   * @returns true if format is supported
   */
  canParse(file: File): boolean;
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): FileFormat[];
}

export interface ParseResult {
  books: BookData[];
  notes: NoteData[];
  errors: ParseError[];
  summary: {
    totalLines: number;
    booksFound: number;
    notesFound: number;
    duplicatesDetected: number;
  };
}

export interface BookData {
  title: string;
  author?: string;
  isbn?: string;
}

export interface NoteData {
  text: string;
  bookTitle: string;
  location?: {
    page?: number;
    position?: string;
  };
  type: 'highlight' | 'note' | 'bookmark';
  timestamp?: Date;
}

export interface ParseError {
  line: number;
  message: string;
  context: string;
}

export interface FileFormat {
  name: string;
  extensions: string[];
  mimeTypes: string[];
  description: string;
}
```

### Storage Interface

```typescript
// src/lib/storage/interface.ts
export interface StorageService {
  // Books
  createBook(book: Omit<Book, 'id' | 'createdAt' | 'lastModifiedAt'>): Promise<Book>;
  getBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  updateBook(id: string, updates: Partial<Book>): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  
  // Notes
  createNote(note: Omit<Note, 'id' | 'createdAt' | 'lastModifiedAt'>): Promise<Note>;
  getNotes(bookId?: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | null>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Search
  searchNotes(query: SearchQuery): Promise<SearchResult>;
  
  // Uploads
  recordUpload(upload: Omit<Upload, 'id'>): Promise<Upload>;
  getUploads(): Promise<Upload[]>;
}

export interface SearchQuery {
  text?: string;
  bookIds?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  notes: Note[];
  totalCount: number;
  hasMore: boolean;
  suggestions?: string[];
}
```

### Share Export Interface

```typescript
// src/lib/export/interface.ts
export interface ShareExporter {
  /**
   * Generate Twitter-formatted message
   */
  generateTwitterMessage(note: Note, book: Book, options: TwitterOptions): Promise<TwitterExport>;
  
  /**
   * Generate Instagram Story image
   */
  generateInstagramImage(note: Note, book: Book, options: InstagramOptions): Promise<InstagramExport>;
}

export interface TwitterOptions {
  includeAttribution: boolean;
  customPrefix?: string;
  maxLength?: number; // Default 280
}

export interface InstagramOptions {
  includeAttribution: boolean;
  theme: 'light' | 'dark' | 'kindle';
  dimensions: {
    width: number;  // Default 1080
    height: number; // Default 1920
  };
  font?: {
    family: string;
    size: number;
  };
}

export interface TwitterExport {
  text: string;
  charCount: number;
  truncated: boolean;
  hashtags: string[];
}

export interface InstagramExport {
  imageDataUrl: string;
  dimensions: { width: number; height: number; };
  metadata: {
    text: string;
    attribution: string;
    theme: string;
  };
}
```

## Optional Backend Contracts

For future enhancement with minimal auth/sync service.

### Authentication Service (OpenAPI)

```yaml
# specs/001-kindle-notes/contracts/auth-api.yaml
openapi: 3.0.0
info:
  title: Kindle Notes Auth API
  version: 1.0.0
  description: Minimal authentication service for note synchronization

paths:
  /auth/magic-link:
    post:
      summary: Request magic link authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
              required: [email]
      responses:
        200:
          description: Magic link sent successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  requestId:
                    type: string
        400:
          description: Invalid email format
        429:
          description: Rate limit exceeded

  /auth/verify:
    post:
      summary: Verify magic link token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                token:
                  type: string
              required: [token]
      responses:
        200:
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        401:
          description: Invalid or expired token

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        displayName:
          type: string
        preferences:
          $ref: '#/components/schemas/UserPreferences'
        createdAt:
          type: string
          format: date-time
          
    UserPreferences:
      type: object
      properties:
        theme:
          type: string
          enum: [light, dark, auto]
        defaultShareAttribution:
          type: boolean
        defaultSharePrivacy:
          type: string
          enum: [private, public]
```

### Sync Service (Optional)

```yaml
# specs/001-kindle-notes/contracts/sync-api.yaml
openapi: 3.0.0
info:
  title: Kindle Notes Sync API
  version: 1.0.0
  description: Optional cloud sync for notes backup

paths:
  /sync/export:
    post:
      summary: Export user data for backup
      security:
        - BearerAuth: []
      responses:
        200:
          description: Data export successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  books:
                    type: array
                    items:
                      $ref: '#/components/schemas/Book'
                  notes:
                    type: array
                    items:
                      $ref: '#/components/schemas/Note'
                  exportedAt:
                    type: string
                    format: date-time

  /sync/import:
    post:
      summary: Import data from backup
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                books:
                  type: array
                  items:
                    $ref: '#/components/schemas/Book'
                notes:
                  type: array
                  items:
                    $ref: '#/components/schemas/Note'
      responses:
        200:
          description: Import successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  imported:
                    type: object
                    properties:
                      books: 
                        type: number
                      notes:
                        type: number
                  conflicts:
                    type: array
                    items:
                      type: object

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Implementation Notes

**Static Site Priority**: Focus on client-side contracts first. Backend contracts are for future enhancement only.

**Testing Strategy**:
- Mock implementations for all client-side interfaces
- Contract tests for parser output format validation
- End-to-end tests for complete user workflows

**Error Handling**:
- All async operations return Result<T, Error> pattern
- Standardized error codes for user messaging
- Graceful degradation for storage failures

**Versioning**:
- Client interfaces use semantic versioning
- Backward compatibility for stored data formats
- Migration helpers for data model changes