'use client';

import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export default function SyncStatus() {
    const isOnline = useOnlineStatus();

    return (
        <div className={`sync-indicator ${isOnline ? 'sync-online' : 'sync-offline'}`}>
            <span className="sync-dot" />
            {isOnline ? (
                <>
                    <Wifi size={14} />
                    Online
                </>
            ) : (
                <>
                    <WifiOff size={14} />
                    Offline
                </>
            )}
        </div>
    );
}
