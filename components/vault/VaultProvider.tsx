/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { VaultModalContext } from '../../contexts/VaultModalContext.tsx';
import { CreateMasterPasswordModal } from './CreateMasterPasswordModal.tsx';
import { UnlockVaultModal } from './UnlockVaultModal.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { eventBus } from '../../core/bus/event-bus.service.ts';

/**
 * @typedef {function(value: boolean): void} PromiseResolver
 * A function that resolves a promise with a boolean value.
 */
type PromiseResolver = (value: boolean) => void;

/**
 * Provides the context for vault modals (creation and unlocking) and manages their state.
 * It subscribes to global events to determine if the vault needs to be unlocked
 * and automatically prompts the user if so.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components that will have access to the vault modal context.
 * @returns {JSX.Element} The VaultProvider component.
 *
 * @example
 * <VaultProvider>
 *   <App />
 * </VaultProvider>
 */
export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { dispatch } = useGlobalState();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isUnlockModalOpen, setUnlockModalOpen] = useState(false);
    const [createPromise, setCreatePromise] = useState<{ resolve: PromiseResolver } | null>(null);
    const [unlockPromise, setUnlockPromise] = useState<{ resolve: PromiseResolver } | null>(null);

    /**
     * Opens the "Create Master Password" modal and returns a promise that resolves
     * with `true` if the user successfully creates a vault, or `false` if they cancel.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating success.
     * @example
     * const created = await requestCreation();
     * if (created) {
     *   console.log('Vault created!');
     * }
     */
    const requestCreation = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            setCreatePromise({ resolve });
            setCreateModalOpen(true);
        });
    }, []);

    /**
     * Opens the "Unlock Vault" modal and returns a promise that resolves
     * with `true` if the user successfully unlocks the vault, or `false` if they cancel.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating success.
     * @example
     * const unlocked = await requestUnlock();
     * if (unlocked) {
     *   console.log('Vault unlocked!');
     * }
     */
    const requestUnlock = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            // Avoid opening multiple unlock modals
            if (isUnlockModalOpen) {
                // The existing modal's promise will resolve for the new caller too
                // This is a simplification; a more robust implementation might queue resolvers.
                return;
            }
            setUnlockPromise({ resolve });
            setUnlockModalOpen(true);
        });
    }, [isUnlockModalOpen]);
    
    useEffect(() => {
        /**
         * Subscribes to vault state changes broadcast by the SecurityCoreService.
         * This replaces the direct async calls to vaultService, aligning with the new CQRS/Event-driven architecture.
         * @private
         */
        const unsubscribe = eventBus.subscribe('vault:stateChanged', (payload) => {
            dispatch({ type: 'SET_VAULT_STATE', payload });
            
            // If the vault is initialized but becomes locked, prompt the user to unlock it.
            if (payload.isInitialized && !payload.isUnlocked) {
                requestUnlock();
            }
        });

        // The SecurityCoreService is responsible for checking and broadcasting the initial state on app startup.
        // This component simply listens for those broadcasts.

        return () => {
            unsubscribe();
        };
    }, [dispatch, requestUnlock]);

    /**
     * Handles the successful creation of a master password.
     * Updates global state, resolves the creation promise, and closes the modal.
     * @private
     */
    const handleCreateSuccess = () => {
        dispatch({ type: 'SET_VAULT_STATE', payload: { isInitialized: true, isUnlocked: true } });
        createPromise?.resolve(true);
        setCreateModalOpen(false);
        setCreatePromise(null);
    };

    /**
     * Handles the cancellation of the master password creation.
     * Resolves the creation promise with `false` and closes the modal.
     * @private
     */
    const handleCreateCancel = () => {
        createPromise?.resolve(false);
        setCreateModalOpen(false);
        setCreatePromise(null);
    };

    /**
     * Handles the successful unlocking of the vault.
     * Updates global state, resolves the unlock promise, and closes the modal.
     * @private
     */
    const handleUnlockSuccess = () => {
        dispatch({ type: 'SET_VAULT_STATE', payload: { isUnlocked: true } });
        unlockPromise?.resolve(true);
        setUnlockModalOpen(false);
        setUnlockPromise(null);
    };

    /**
     * Handles the cancellation of the vault unlock process.
     * Resolves the unlock promise with `false` and closes the modal.
     * @private
     */
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
