import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  // `cloudflare()` runs the build/preview through the Workers runtime and emits
  // a deployable `dist/wrangler.json` (reading config from wrangler.jsonc). This
  // is a static-assets-only site, so there's no Worker entry.
  plugins: [react(), cloudflare()],
  // The two HTML pages (game + submission preview) are CLIENT entries. Scope
  // them to the client environment rather than the root build — a root-level
  // rollupOptions.input is inherited by every environment (incl. any Worker
  // env), which can't use HTML as an entry ("cannot be external").
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: 'index.html',
            submissions: 'submissions.html',
          },
        },
      },
    },
  },
  build: {
    // Monaco's editor core is large (~1 MB gzipped) by nature. Raise the
    // size-warning threshold since the warning is expected here, not a regression.
    chunkSizeWarningLimit: 4500,
  },
});
