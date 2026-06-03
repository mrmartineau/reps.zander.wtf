import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Monaco's editor core is large (~1 MB gzipped) by nature. Raise the
    // size-warning threshold since the warning is expected here, not a regression.
    chunkSizeWarningLimit: 4500,
  },
});
