import React, { lazy } from 'react';

/**
 * A wrapper around React.lazy to retry loading a component if it fails.
 * This is useful for handling "chunk load failed" errors that can occur
 * when a user has an old version of the site and a new version is deployed.
 *
 * @param componentImport A function that returns a dynamic import, e.g., () => import('./MyComponent')
 * @param exportName The named export of the component to be loaded.
 * @returns A lazy-loaded React component.
 */
export const lazyWithRetry = <T extends React.ComponentType<any>>(
    componentImport: () => Promise<{ [key: string]: T }>,
    exportName: string
) => {
    return lazy(async () => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const module = await componentImport();
                if (module[exportName]) {
                    return { default: module[exportName] };
                }
                // This would be a developer error (wrong export name), not a chunk load error.
                throw new Error(`Named export '${exportName}' not found in module.`);
            } catch (error) {
                console.error(error); // Log error for debugging
                if (i < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                } else {
                    // After all retries, force a page reload.
                    // This is the most effective way to solve stale chunk issues after a new deployment.
                    console.error("Failed to load component after multiple retries. Reloading page.");
                    window.location.reload();
                    // Throw to allow an ErrorBoundary to catch this, although reload will likely intervene.
                    throw error;
                }
            }
        }
        // This part of the code should not be reachable
        throw new Error('Component failed to load and retries were exhausted.');
    });
};