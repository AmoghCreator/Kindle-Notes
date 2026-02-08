import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
    getViteConfig({
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: './tests/setup.ts',
        },
    })
);