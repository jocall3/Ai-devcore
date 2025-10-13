
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
      optimizeDeps: {
        exclude: [
          'axe-core',
          '@google/genai'
        ]
      },
      define: {
        // The GOOGLE_CLIENT_ID is public and safe to expose.
        // The Gemini API key has been removed to be handled securely at runtime.
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        // Disable CORS to mitigate vulnerability where malicious sites can request source files.
        cors: false,
      },
      build: {
        outDir: 'web', // Emit assets to a 'web' directory.
        sourcemap: true, // Enable source maps for easier debugging in production.
        rollupOptions: {
          output: {
            // Improve caching by splitting vendor code into separate chunks.
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
