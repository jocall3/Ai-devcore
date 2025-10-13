/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface BundleStatsNode {
    name: string;
    value: number;
    children?: BundleStatsNode[];
}

// This is a simplified parser for Vite's `stats.json` output.
// A real-world implementation would need to handle different formats (Webpack, Rollup, etc.).
export const parseViteStats = (statsJson: string): BundleStatsNode => {
    try {
        const stats = JSON.parse(statsJson);
        const root: BundleStatsNode = { name: 'root', value: 0, children: [] };

        if (stats.output) { // Vite 5+ stats format
             Object.entries(stats.output).forEach(([path, chunk]: [string, any]) => {
                const node: BundleStatsNode = {
                    name: path,
                    value: chunk.size,
                };
                root.children?.push(node);
                root.value += chunk.size;
            });
        }

        return root;
    } catch (error) {
        console.error("Failed to parse bundle stats:", error);
        throw new Error("Invalid stats JSON format.");
    }
};
