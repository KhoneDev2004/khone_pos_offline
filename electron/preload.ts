import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

    // Online status
    isOnline: () => ipcRenderer.invoke('app:isOnline'),

    // Platform detection
    platform: process.platform,
    isElectron: true,
});

// Type declaration for the exposed API
export interface ElectronAPI {
    getAppInfo: () => Promise<{
        version: string;
        name: string;
        platform: string;
    }>;
    isOnline: () => Promise<boolean>;
    platform: string;
    isElectron: boolean;
}
