import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon } from '../icons.tsx';

type SortKey = 'name' | 'initiatorType' | 'transferSize' | 'duration';
type SortDirection = 'asc' | 'desc';

const SummaryCard: React.FC<{ title: string, value: string | number }> = ({ title, value }) => (
    <div className="bg-surface border border-border p-3 rounded-lg text-center">
        <p className="text-xs text-text-secondary">{title}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
);

export const NetworkVisualizer: React.FC = () => {
    const [requests, setRequests] = useState<PerformanceResourceTiming[]>([]);
    const [sortKey, setSortKey] = useState<SortKey>('duration');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        setRequests(entries);
    }, []);
    
    const sortedRequests = useMemo(() => {
        return [...requests].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [requests, sortKey, sortDirection]);

    const { totalSize, totalDuration, maxDuration } = useMemo(() => {
        const totalSize = requests.reduce((acc, req) => acc + req.transferSize, 0);
        const maxFinish = Math.max(...requests.map(r => r.startTime + r.duration), 0);
        return { totalSize, totalDuration: maxFinish, maxDuration: Math.max(...requests.map(r => r.duration), 0) };
    }, [requests]);

    const handleSort = (key: SortKey) => {
        setSortDirection(sortKey === key && sortDirection === 'desc' ? 'asc' : 'desc');
        setSortKey(key);
    };
    
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024; const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const SortableHeader: React.FC<{ skey: SortKey, label: string; className?: string }> = ({ skey, label, className }) => (
        <th onClick={() => handleSort(skey)} className={`p-2 text-left cursor-pointer hover:bg-gray-100 ${className}`}>
            {label} {sortKey === skey && (sortDirection === 'asc' ? '▲' : '▼')}
        </th>
    );

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><ChartBarIcon /><span className="ml-3">Network Visualizer</span></h1><p className="text-text-secondary mt-1">Inspect network resources with a summary and waterfall chart.</p></header>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <SummaryCard title="Total Requests" value={requests.length} />
                <SummaryCard title="Total Transferred" value={formatBytes(totalSize)} />
                <SummaryCard title="Finish Time" value={`${totalDuration.toFixed(0)}ms`} />
                <SummaryCard title="Longest Request" value={`${maxDuration.toFixed(0)}ms`} />
            </div>
            <div className="flex-grow overflow-auto bg-surface rounded-lg border border-border">
                <table className="w-full text-sm text-left table-fixed">
                    <thead className="sticky top-0 bg-surface z-10"><tr className="border-b border-border">
                        <SortableHeader skey="name" label="Name" className="w-2/5"/>
                        <SortableHeader skey="initiatorType" label="Type" className="w-1/5" />
                        <SortableHeader skey="transferSize" label="Size" className="w-1/5"/>
                        <SortableHeader skey="duration" label="Time / Waterfall" className="w-1/5"/>
                    </tr></thead>
                    <tbody>{sortedRequests.map((req, i) => (<tr key={i} className="border-b border-border hover:bg-gray-50">
                        <td className="p-2 text-primary truncate" title={req.name}>{req.name.split('/').pop()}</td>
                        <td className="p-2">{req.initiatorType}</td>
                        <td className="p-2">{formatBytes(req.transferSize)}</td>
                        <td className="p-2"><div className="flex items-center">
                            <span className="w-12">{req.duration.toFixed(0)}ms</span>
                            <div className="flex-grow h-4 bg-gray-200 rounded overflow-hidden">
                                <div className="h-4 bg-primary rounded" style={{ marginLeft: `${(req.startTime / totalDuration) * 100}%`, width: `${(req.duration / totalDuration) * 100}%` }} title={`Start: ${req.startTime.toFixed(0)}ms`}></div>
                            </div>
                        </div></td>
                    </tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};