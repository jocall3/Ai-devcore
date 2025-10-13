/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { createContext, useContext } from 'react';

interface VaultModalContextType {
    requestUnlock: () => Promise<boolean>;
    requestCreation: () => Promise<boolean>;
}

export const VaultModalContext = createContext<VaultModalContextType | undefined>(undefined);

export const useVaultModal = (): VaultModalContextType => {
    const context = useContext(VaultModalContext);
    if (!context) {
        throw new Error('useVaultModal must be used within a VaultProvider');
    }
    return context;
};
