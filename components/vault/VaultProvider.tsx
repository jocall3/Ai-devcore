/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useMemo } from 'react';
import { VaultModalContext } from '../../contexts/VaultModalContext.tsx';
import { CreateMasterPasswordModal } from './CreateMasterPasswordModal.tsx';
import { UnlockVaultModal } from './UnlockVaultModal.tsx';
import * as vaultService from '../../services/vaultService.ts';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';

type PromiseResolver = (value: boolean) => void;

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { dispatch } = useGlobalState();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isUnlockModalOpen, setUnlockModalOpen] = useState(false);
    const [createPromise, setCreatePromise] = useState<{ resolve: PromiseResolver } | null>(null);
    const [unlockPromise, setUnlockPromise] = useState<{ resolve: PromiseResolver } | null>(null);

    const requestCreation = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            setCreatePromise({ resolve });
            setCreateModalOpen(true);
        });
    }, []);

    const requestUnlock = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            setUnlockPromise({ resolve });
            setUnlockModalOpen(true);
        });
    }, []);

    const handleCreateSuccess = () => {
        dispatch({ type: 'SET_VAULT_STATE', payload: { isInitialized: true, isUnlocked: true } });
        createPromise?.resolve(true);
        setCreateModalOpen(false);
        setCreatePromise(null);
    };

    const handleCreateCancel = () => {
        createPromise?.resolve(false);
        setCreateModalOpen(false);
        setCreatePromise(null);
    };

    const handleUnlockSuccess = () => {
        dispatch({ type: 'SET_VAULT_STATE', payload: { isUnlocked: true } });
        unlockPromise?.resolve(true);
        setUnlockModalOpen(false);
        setUnlockPromise(null);
    };

    const handleUnlockCancel = () => {
        unlockPromise?.resolve(false);
        setUnlockModalOpen(false);
        setUnlockPromise(null);
    };

    const contextValue = useMemo(() => ({ requestUnlock, requestCreation }), [requestUnlock, requestCreation]);

    return (
        <VaultModalContext.Provider value={contextValue}>
            {children}
            {isCreateModalOpen && (
                <CreateMasterPasswordModal
                    onSuccess={handleCreateSuccess}
                    onCancel={handleCreateCancel}
                />
            )}
            {isUnlockModalOpen && (
                <UnlockVaultModal
                    onSuccess={handleUnlockSuccess}
                    onCancel={handleUnlockCancel}
                />
            )}
        </VaultModalContext.Provider>
    );
};
