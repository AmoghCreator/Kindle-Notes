// Error handling framework for consistent error management
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public userMessage?: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, field: string, value: any) {
        super(
            message,
            'VALIDATION_ERROR',
            400,
            `Invalid ${field}: ${message}`
        );
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, resource: string) {
        super(
            message,
            'NOT_FOUND_ERROR',
            404,
            `${resource} not found. Please check your input and try again.`
        );
        this.name = 'NotFoundError';
    }
}

export class FileParseError extends AppError {
    constructor(message: string, line?: number) {
        const userMessage = line
            ? `Error parsing file at line ${line}: ${message}`
            : `Error parsing file: ${message}`;

        super(message, 'FILE_PARSE_ERROR', 400, userMessage);
        this.name = 'FileParseError';
    }
}

export class StorageError extends AppError {
    constructor(message: string, operation: string) {
        super(
            message,
            'STORAGE_ERROR',
            500,
            `Storage operation failed: ${operation}`
        );
        this.name = 'StorageError';
    }
}

export class SearchError extends AppError {
    constructor(message: string) {
        super(
            message,
            'SEARCH_ERROR',
            400,
            'Search operation failed. Please try again.'
        );
        this.name = 'SearchError';
    }
}

export class ShareError extends AppError {
    constructor(message: string, platform: string) {
        super(
            message,
            'SHARE_ERROR',
            400,
            `Failed to generate ${platform} share: ${message}`
        );
        this.name = 'ShareError';
    }
}

// Error reporting and logging
export interface ErrorReport {
    error: Error;
    timestamp: Date;
    userAgent: string;
    url: string;
    userId?: string;
    additionalData?: Record<string, any>;
}

export function createErrorReport(error: Error, additionalData?: Record<string, any>): ErrorReport {
    return {
        error,
        timestamp: new Date(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
        additionalData,
    };
}

// User-friendly error messages
export function getUserFriendlyMessage(error: Error): string {
    if (error instanceof AppError && error.userMessage) {
        return error.userMessage;
    }

    // Generic messages for unknown errors
    switch (error.name) {
        case 'TypeError':
            return 'Something went wrong. Please try again.';
        case 'NetworkError':
            return 'Network connection failed. Please check your internet connection.';
        case 'QuotaExceededError':
            return 'Storage limit exceeded. Please clear some data and try again.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

// Error boundary utility for React-like error handling in Astro
export function withErrorBoundary<T extends any[], R>(
    fn: (...args: T) => R,
    fallback: (error: Error, ...args: T) => R
): (...args: T) => R {
    return (...args: T): R => {
        try {
            return fn(...args);
        } catch (error) {
            console.error('Error caught by error boundary:', error);
            return fallback(error as Error, ...args);
        }
    };
}

// Async error boundary
export function withAsyncErrorBoundary<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    fallback: (error: Error, ...args: T) => Promise<R>
): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error('Async error caught by error boundary:', error);
            return await fallback(error as Error, ...args);
        }
    };
}

// Retry utility for transient failures
export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxAttempts) {
                break;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    throw lastError!;
}