import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import os from 'os';

// GET /api/network-info — Get local network IP addresses
export async function GET(_req: NextRequest) {
    try {
        const interfaces = os.networkInterfaces();
        const addresses: { name: string; address: string; family: string }[] = [];

        for (const [name, nets] of Object.entries(interfaces)) {
            if (!nets) continue;
            for (const net of nets) {
                // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
                if (!net.internal && net.family === 'IPv4') {
                    addresses.push({
                        name,
                        address: net.address,
                        family: net.family,
                    });
                }
            }
        }

        return successResponse({
            addresses,
            hostname: os.hostname(),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get network info';
        return errorResponse(message, 500);
    }
}
