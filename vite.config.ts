import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    target: 'es2015',
    cssTarget: ['chrome64', 'edge79', 'firefox62', 'safari11.1', 'ios11.1']
  }
});
