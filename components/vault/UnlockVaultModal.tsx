/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import * as vaultService from '../../services/vaultService.ts';
import { LoadingSpinner } from '../shared/LoadingSpinner.tsx';

interface Props {
    onSuccess: () => void;
    onCancel: () => void;
}

export const UnlockVaultModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await vaultService.unlockVault(password);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md"
                            required
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
                        <button type="submit" disabled={isLoading} className="btn-primary px-4 py-2 min-w-[100px] flex justify-center">
                            {isLoading ? <LoadingSpinner /> : 'Unlock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
