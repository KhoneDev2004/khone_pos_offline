'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, AlertTriangle, Info, Bug, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogEntry {
    id: number;
    level: string;
    message: string;
    module: string;
    timestamp: string;
}

export default function DashboardLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [levelFilter, setLevelFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '50' });
            if (levelFilter) params.set('level', levelFilter);

            const res = await fetch(`/api/logs?${params}`);
            const json = await res.json();

            if (json.status === 'success') {
                setLogs(json.data.logs);
                setTotalPages(json.data.pagination.totalPages);
            }
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, levelFilter]);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertCircle size={14} />;
            case 'warn': return <AlertTriangle size={14} />;
            case 'info': return <Info size={14} />;
            case 'debug': return <Bug size={14} />;
            default: return null;
        }
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <h1>📋 System Logs</h1>
                <div className="flex gap-2">
                    <select
                        className="filter-select"
                        value={levelFilter}
                        onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Levels</option>
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div className="empty-state"><div className="empty-state-text">Loading logs...</div></div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-text">No logs found</div>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="log-entry">
                            <span className={`log-level ${log.level}`}>
                                {getLevelIcon(log.level)} {log.level}
                            </span>
                            <span className="log-timestamp">
                                {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span className="log-module">[{log.module}]</span>
                            <span className="log-message">{log.message}</span>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
