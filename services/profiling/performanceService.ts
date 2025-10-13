/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface TraceEntry {
    name: string;
    startTime: number;
    duration: number;
    entryType: 'mark' | 'measure';
}

let isTracing = false;
const TRACE_PREFIX = 'devcore-trace-';

export const startTracing = (): void => {
    if (isTracing) {
        console.warn('Tracing is already active.');
        return;
    }
    performance.clearMarks();
    performance.clearMeasures();
    isTracing = true;
    console.log('Performance tracing started.');
};

export const stopTracing = (): TraceEntry[] => {
    if (!isTracing) {
        console.warn('Tracing is not active.');
        return [];
    }
    isTracing = false;
    console.log('Performance tracing stopped.');

    const entries = performance.getEntries().filter(
        entry => entry.name.startsWith(TRACE_PREFIX)
    );

    performance.clearMarks();
    performance.clearMeasures();

    return entries.map(entry => ({
        name: entry.name.replace(TRACE_PREFIX, ''),
        startTime: entry.startTime,
        duration: entry.duration,
        entryType: entry.entryType as 'mark' | 'measure',
    }));
};

export const mark = (name: string): void => {
    if (!isTracing) return;
    performance.mark(`${TRACE_PREFIX}${name}`);
};

export const measure = (name: string, startMark: string, endMark: string): void => {
    if (!isTracing) return;
    try {
        performance.measure(`${TRACE_PREFIX}${name}`, `${TRACE_PREFIX}${startMark}`, `${TRACE_PREFIX}${endMark}`);
    } catch (e) {
        console.error(`Failed to measure '${name}'`, e);
    }
};
