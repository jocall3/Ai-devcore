/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const SERVICE_WORKER_URL = '/mock-service-worker.js';
let registration: ServiceWorkerRegistration | null = null;

export const startMockServer = async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
        try {
            registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
            console.log('Mock Service Worker registered with scope:', registration.scope);
        } catch (error) {
            console.error('Mock Service Worker registration failed:', error);
            throw new Error('Could not start mock server.');
        }
    } else {
        throw new Error('Service workers are not supported in this browser.');
    }
};

export const stopMockServer = async (): Promise<void> => {
    if (registration) {
        await registration.unregister();
        registration = null;
        console.log('Mock Service Worker unregistered.');
    }
};

export const isMockServerRunning = (): boolean => {
    return !!registration && !!navigator.serviceWorker.controller;
};

interface MockRoute {
    path: string; // e.g., /api/users/*
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    response: {
        status: number;
        body: any;
        headers?: Record<string, string>;
    }
}

export const setMockRoutes = (routes: MockRoute[]): void => {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SET_ROUTES',
            routes
        });
        console.log('Mock routes sent to service worker:', routes);
    } else {
        console.warn('Mock server is not active. Routes were not set.');
    }
};
