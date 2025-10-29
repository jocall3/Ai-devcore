/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createContext, useContext } from 'react';

/**
 * @interface VaultModalContextType
 * @description Defines the shape of the context for triggering vault-related modals.
 * This context provides functions to programmatically request the user to either create a new vault
 * or unlock an existing one.
 */
interface VaultModalContextType {
    /**
     * @function requestUnlock
     * @description Triggers the "Unlock Vault" modal to appear.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the user successfully unlocks the vault,
     * and `false` if they cancel the operation.
     * @example
     * const { requestUnlock } = useVaultModal();
     * const handleAction = async () => {
     *   const unlocked = await requestUnlock();
     *   if (unlocked) {
     *     // Proceed with action that requires unlocked vault
     *   }
     * };
     */
    requestUnlock: () => Promise<boolean>;

    /**
     * @function requestCreation
     * @description Triggers the "Create Master Password" modal to appear for vault initialization.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the user successfully creates the vault,
     * and `false` if they cancel the operation.
     * @example
     * const { requestCreation } = useVaultModal();
     * const setupVault = async () => {
     *   const created = await requestCreation();
     *   if (created) {
     *     console.log('Vault setup complete!');
     *   }
     * };
     */
    requestCreation: () => Promise<boolean>;
}

/**
 * @const VaultModalContext
 * @description A React context that provides functions to interact with the vault modals.
 * It allows any component in the tree to request the vault to be created or unlocked.
 * The actual implementation of showing the modals is handled by the `VaultProvider`.
 */
export const VaultModalContext = createContext<VaultModalContextType | undefined>(undefined);

/**
 * @function useVaultModal
 * @description A custom hook to easily access the `VaultModalContext`.
 * This hook ensures that it's being used within a component tree wrapped by a `VaultProvider`.
 * @throws {Error} If used outside of a `VaultProvider`.
 * @returns {VaultModalContextType} The context value, containing `requestUnlock` and `requestCreation` functions.
 * @example
 * import { useVaultModal } from './VaultModalContext';
 *
 * const MyComponent = () => {
 *   const { requestUnlock } = useVaultModal();
 *   // ...
 * };
 */
export const useVaultModal = (): VaultModalContextType => {
    const context = useContext(VaultModalContext);
    if (!context) {
        throw new Error('useVaultModal must be used within a VaultProvider');
    }
    return context;
};
