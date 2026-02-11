// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    output: 'static', // Static by default, server endpoints opt-in with prerender: false
    adapter: node({
        mode: 'standalone'
    }),
    build: {
        assets: 'assets'
    },
    vite: {
        optimizeDeps: {
            include: ['minisearch']
        },
        worker: {
            format: 'es'
        }
    }
});
