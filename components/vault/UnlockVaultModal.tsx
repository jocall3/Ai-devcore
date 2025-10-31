/**
 * @file Renders a modal for unlocking the application's encrypted vault.
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import * as vaultService from '../../services/vaultService.ts';
import { LoadingSpinner } from '../shared/index.tsx';

/**
 * @interface Props
 * @description Props for the UnlockVaultModal component.
 */
interface Props {
    /**
     * Callback function executed when the vault is successfully unlocked.
     * This typically triggers the closing of the modal.
     */
    onSuccess: () => void;
    /**
     * Callback function executed when the user cancels the unlock process.
     * This typically triggers the closing of the modal.
     */
    onCancel: () => void;
}

/**
 * A modal dialog that prompts the user for their master password to unlock the session vault.
 * This component handles user input and communicates with the `vaultService` to perform the unlock operation.
 * The `vaultService` is responsible for proxying the request to the secure worker, ensuring the master password
 * is never held for long in the main thread's memory.
 *
 * @component
 * @param {Props} props The component props.
 * @returns {React.ReactElement} The rendered modal component.
 */
export const UnlockVaultModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Automatically focus the password input when the modal appears
        inputRef.current?.focus();
    }, []);

    /**
     * Handles the form submission, sending the password to the vault service for unlocking.
     * Manages loading and error states within the modal.
     * @param {React.FormEvent} e The form submission event.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await vaultService.unlockVault(password);
            // On success, the parent provider (`VaultProvider`) will handle state changes
            // and unmount this modal via the `onSuccess` callback.
            onSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
            // Provide a user-friendly error in case of failure.
            setError(`Unlock failed: ${message}. Please check your password and try again.`);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in">
            <div className="bg-surface border border-border rounded-lg shadow-2xl w-full max-w-sm m-4 p-6 animate-pop-in">
                <h2 className="text-xl font-bold mb-2">Unlock Vault</h2>
                <p className="text-sm text-text-secondary mb-4">
                    Enter your Master Password to access your encrypted API keys for this session.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Master Password</label>
                        <input
                            ref={inputRef}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn-primary px-4 py-2 min-w-[100px] flex justify-center">
                            {isLoading ? <LoadingSpinner /> : 'Unlock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
