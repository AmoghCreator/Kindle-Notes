import { beforeEach } from 'vitest';

// Global test setup
beforeEach(() => {
    // Clear localStorage and IndexedDB before each test
    if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
    }
});

// Mock IntersectionObserver for tests
Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: class IntersectionObserver {
        constructor() { }
        observe() { }
        unobserve() { }
        disconnect() { }
    },
});