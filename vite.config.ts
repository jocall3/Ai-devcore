import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/Ai-devcore/',

    optimizeDeps: {
      exclude: [
        'axe-core',
        '@google/genai'
      ]
    },
    
    plugins: [react()],

    // Defines global constants for the client-side code.
    // WARNING: Keys defined here are exposed to the client. Do not expose sensitive secrets.
    define: {
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      // This is a temporary measure. The final architecture should source all keys from the vault.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },

    server: {
      host: '0.0.0.0',
      port: 3000,
      // Setting these headers is crucial for creating a cross-origin isolated context,
      // which is required for using features like SharedArrayBuffer and enables a more
      // secure environment for Web Workers and cryptographic operations.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },

    // Configuration for Web Worker bundling, preparing for the Security Core implementation.
    worker: {
      format: 'es',
    },

    build: {
      outDir: 'web', // emit to `web/` instead of default `dist/`
      sourcemap: true,
      rollupOptions: {
        output: {
          // Improves caching by splitting node_modules into separate chunks.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
          }
        }
      }
    }
  };
});