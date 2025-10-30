/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import * as vaultService from '../../services/vaultService.ts';
import { LoadingSpinner } from '../shared/LoadingSpinner.tsx';

/**
 * @interface Props
 * @description Props for the CreateMasterPasswordModal component.
 */
interface Props {
    /**
     * @property {() => void} onSuccess - Callback function to execute when the vault is successfully created.
     * @example
     * // Called after the user creates a password.
     * const handleSuccess = () => console.log('Vault created!');
     */
    onSuccess: () => void;
    /**
     * @property {() => void} onCancel - Callback function to execute when the user cancels the creation process.
     * @example
     * // Called when the user clicks the 'Cancel' button.
     * const handleCancel = () => console.log('Creation cancelled.');
     */
    onCancel: () => void;
}

/**
 * A modal component for creating a new master password and initializing the application's credential vault.
 *
 * @component
 * @param {Props} props - The component props.
 * @returns {React.ReactElement} The rendered modal component.
 *
 * @example
 * return (
 *   <CreateMasterPasswordModal
 *     onSuccess={() => setModalOpen(false)}
 *     onCancel={() => setModalOpen(false)}
 *   />
 * );
 */
export const CreateMasterPasswordModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Handles the form submission for creating the master password.
     * It validates the password fields and calls the vault service to initialize the vault.
     * @param {React.FormEvent} e - The form submission event.
     * @returns {Promise<void>} A promise that resolves when the submission is handled.
     * @example
     * // This function is called when the form is submitted.
     * <form onSubmit={handleSubmit}>...</form>
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await vaultService.initializeVault(password);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in">
            <div className="bg-surface border border-border rounded-lg shadow-2xl w-full max-w-md m-4 p-6 animate-pop-in">
                <h2 className="text-xl font-bold mb-2">Create Master Password</h2>
                <p className="text-sm text-text-secondary mb-4">
                    This password encrypts your API keys locally on your device. It is never stored or sent anywhere.
                    <strong> If you forget it, your data will be unrecoverable.</strong>
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">New Master Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn-primary px-4 py-2 min-w-[120px] flex justify-center">
                            {isLoading ? <LoadingSpinner /> : 'Create Vault'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
