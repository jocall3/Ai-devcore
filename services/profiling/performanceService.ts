/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { injectable } from 'inversify';
import 'reflect-metadata';

export interface TraceEntry {
    name: string;
    startTime: number;
    duration: number;
    entryType: 'mark' | 'measure';
}

export interface IPerformanceService {
    startTracing(): void;
    stopTracing(): TraceEntry[];
    mark(name: string): void;
    measure(name: string, startMark: string, endMark: string): void;
}

const TRACE_PREFIX = 'devcore-trace-';

@injectable()
export class PerformanceService implements IPerformanceService {
    private isTracing = false;

    public startTracing(): void {
        if (this.isTracing) {
            console.warn('Tracing is already active.');
            return;
        }
        performance.clearMarks();
        performance.clearMeasures();
        this.isTracing = true;
        console.log('Performance tracing started.');
    }

    public stopTracing(): TraceEntry[] {
        if (!this.isTracing) {
            console.warn('Tracing is not active.');
            return [];
        }
        this.isTracing = false;
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
    }

    public mark(name: string): void {
        if (!this.isTracing) return;
        performance.mark(`${TRACE_PREFIX}${name}`);
    }

    public measure(name: string, startMark: string, endMark: string): void {
        if (!this.isTracing) return;
        try {
            performance.measure(`${TRACE_PREFIX}${name}`, `${TRACE_PREFIX}${startMark}`, `${TRACE_PREFIX}${endMark}`);
        } catch (e) {
            console.error(`Failed to measure '${name}'`, e);
        }
    }
}
