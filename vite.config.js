import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work from localhost and from any GitHub Pages subdirectory.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
