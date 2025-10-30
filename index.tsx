import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.tsx';
import { GlobalStateProvider } from '@/contexts/GlobalStateContext.tsx';
import { NotificationProvider } from '@/contexts/NotificationContext.tsx';
import { VaultProvider } from '@/components/vault/VaultProvider.tsx';
import '@/index.css';

/**
 * @fileoverview This is the entry point for the React application.
 * It sets up global providers and renders the root App component.
 * It also includes a global error handler for unhandled promise rejections.
 */

/**
 * Global error handler for unhandled promise rejections, which are not caught by React Error Boundaries.
 * This directly addresses issues like failing to fetch credentials from a locked vault within a useEffect hook,
 * which was causing silent failures and a poor user experience.
 * 
 * @example
 * // An async function in a useEffect without a try/catch will trigger this.
 * useEffect(() => {
 *   const doAsyncWork = async () => {
 *     throw new Error('Async error!');
 *   }
 *   doAsyncWork();
 * }, []);
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);

  // A more robust solution aligned with the new architecture would use a central event bus
  // to dispatch an error event that the React UI can listen for and display a notification.
  // As a temporary, direct fix, this creates a visible alert to inform the user.
  const errorDisplayId = 'unhandled-rejection-display';
  if (document.getElementById(errorDisplayId)) return; // Avoid multiple banners

  const errorDisplay = document.createElement('div');
  errorDisplay.id = errorDisplayId;
  errorDisplay.style.position = 'fixed';
  errorDisplay.style.bottom = '20px';
  errorDisplay.style.left = '50%';
  errorDisplay.style.transform = 'translateX(-50%)';
  errorDisplay.style.padding = '1rem';
  errorDisplay.style.backgroundColor = '#ef4444'; // red-500
  errorDisplay.style.color = 'white';
  errorDisplay.style.borderRadius = '8px';
  errorDisplay.style.zIndex = '9999';
  errorDisplay.style.fontFamily = 'sans-serif';
  errorDisplay.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  errorDisplay.innerHTML = `
    <strong style="font-size: 1.1em;">Application Error</strong>
    <p style="margin-top: 4px;">${event.reason?.message || 'An unknown async error occurred.'}</p>
    <p style="font-size: 0.8em; opacity: 0.8; margin-top: 8px;">Please check the console. You may need to reload or unlock your vault.</p>
  `;
  document.body.appendChild(errorDisplay);

  setTimeout(() => {
    errorDisplay.remove();
  }, 8000);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Moving all top-level providers here to centralize the application's context setup.
// This ensures providers are available to the entire application from the root.
root.render(
  <React.StrictMode>
    <GlobalStateProvider>
      <NotificationProvider>
        <VaultProvider>
          <App />
        </VaultProvider>
      </NotificationProvider>
    </GlobalStateProvider>
  </React.StrictMode>
);
