import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        
        let info = '';
        try {
            const columns = db.pragma('table_info(orders)');
            info = JSON.stringify(columns);
        } catch(e) {
            info = String(e);
        }

        let triedToAdd = '';
        try {
            db.exec('ALTER TABLE orders ADD COLUMN invoice_number TEXT');
            triedToAdd = 'Added successfully';
        } catch (e) {
            triedToAdd = String(e);
        }

        return NextResponse.json({
            status: 'success',
            info: info,
            addResult: triedToAdd,
            columns: db.pragma('table_info(orders)')
        });
    } catch (e) {
        return NextResponse.json({ status: 'error', error: String(e) });
    }
}
