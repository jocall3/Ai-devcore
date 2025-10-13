/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const MOCK_ROUTES = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_ROUTES') {
    const routes = event.data.routes || [];
    MOCK_ROUTES.clear();
    routes.forEach(route => {
        // Simple wildcard support
        const regex = new RegExp('^' + route.path.replace(/\*/g, '.*') + '$');
        MOCK_ROUTES.set(regex, {
            method: route.method,
            response: route.response,
        });
    });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;
  const method = event.request.method;

  for (const [routeRegex, routeInfo] of MOCK_ROUTES.entries()) {
    if (routeRegex.test(path) && routeInfo.method === method) {
      event.respondWith(
        new Response(JSON.stringify(routeInfo.response.body), {
          status: routeInfo.response.status,
          headers: { 'Content-Type': 'application/json', ...routeInfo.response.headers },
        })
      );
      return;
    }
  }

  // If no mock route matches, fall back to the network.
  event.respondWith(fetch(event.request));
});
