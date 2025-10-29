/**
 * @fileoverview Provides a context for displaying toast-like notifications.
 * @module contexts/NotificationContext
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * @interface NotificationAction
 * @description Defines an action that can be attached to a notification, like a button.
 * @property {string} label - The text displayed on the action button.
 * @property {() => void} onClick - The callback function to execute when the action is triggered.
 */
export interface NotificationAction {
  label: string;
  onClick: () => void;
}

/**
 * @typedef {'success' | 'error' | 'info'} NotificationType
 * @description The type of notification, which determines its color and icon.
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * @interface Notification
 * @description Represents a single notification object.
 * @property {number} id - A unique identifier for the notification.
 * @property {string} message - The content of the notification.
 * @property {NotificationType} type - The type of the notification.
 * @property {NotificationAction} [action] - An optional action associated with the notification.
 */
export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  action?: NotificationAction;
}

/**
 * @interface NotificationContextType
 * @description The shape of the context provided by NotificationProvider.
 */
interface NotificationContextType {
  /**
   * @function addNotification
   * @description Displays a new notification.
   * @param {string} message - The text to display.
   * @param {NotificationType} [type='info'] - The type of notification.
   * @param {NotificationAction} [action] - An optional action button to display.
   * @example
   * const { addNotification } = useNotification();
   * addNotification('File saved successfully!', 'success');
   * addNotification('Vault is locked.', 'error', { label: 'Unlock', onClick: () => unlockVault() });
   */
  addNotification: (message: string, type?: NotificationType, action?: NotificationAction) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * @hook useNotification
 * @description A custom hook to easily access the notification context.
 * @returns {NotificationContextType} The notification context.
 * @throws Will throw an error if used outside of a NotificationProvider.
 * @example
 * const { addNotification } = useNotification();
 * addNotification('This is an info message.');
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * @component NotificationProvider
 * @description Provides the notification context to its children and renders the notifications.
 * @param {{ children: React.ReactNode }} props - The component props.
 * @returns {React.ReactElement} The provider component.
 * @example
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType = 'info', action?: NotificationAction) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, action }]);
    
    // Notifications with an action persist until dismissed by the user.
    if (!action) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  }, [removeNotification]);
  
  const typeStyles: Record<NotificationType, string> = {
    success: 'bg-emerald-600 border-emerald-700',
    error: 'bg-red-600 border-red-700',
    info: 'bg-sky-600 border-sky-700'
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] space-y-3 w-full max-w-sm">
        {notifications.map(notification => (
           <div 
             key={notification.id} 
             role="alert" 
             className={`relative animate-pop-in shadow-lg rounded-lg text-white p-4 pr-10 border-b-4 ${typeStyles[notification.type]}`}
           >
             <div className="flex items-start justify-between gap-4">
                <p className="font-medium">{notification.message}</p>
                {notification.action && (
                  <button
                    onClick={() => {
                      notification.action?.onClick();
                      removeNotification(notification.id);
                    }}
                    className="flex-shrink-0 px-3 py-1 -my-1 text-sm font-bold bg-white/20 rounded-md hover:bg-white/30"
                  >
                    {notification.action.label}
                  </button>
                )}
             </div>
             <button 
                onClick={() => removeNotification(notification.id)}
                className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-white/70 hover:text-white rounded-full"
                aria-label="Close notification"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
           </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};