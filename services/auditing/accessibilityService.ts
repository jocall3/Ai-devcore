/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import axe from 'axe-core';

// Configure axe-core to be less noisy in the console
axe.configure({
    reporter: 'v2',
    rules: [
        { id: 'region', enabled: false } // A common false positive in isolated components
    ]
});

export type AxeResult = axe.AxeResults;

/**
 * Runs an axe accessibility audit on a given HTML element.
 * @param context The element or selector string to run the audit on.
 * @returns A promise that resolves with the axe audit results.
 */
export const runAxeAudit = async (context: axe.ElementContext): Promise<AxeResult> => {
    try {
        const results = await axe.run(context, {
             resultTypes: ['violations', 'incomplete']
        });
        return results;
    } catch (error) {
        console.error('Error running axe audit:', error);
        throw new Error('Accessibility audit failed to execute.');
    }
};
