import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 1. สร้าง Client โดยใช้ Service Role Key เพื่อให้มีสิทธิ์ข้ามผ่าน RLS (Bypass RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// 2. สร้าง alias ชื่อ supabaseAdmin เพื่อให้ไฟล์ /api/sync/route.ts เรียกใช้งานได้
export const supabaseAdmin = supabase; 

// 3. ฟังก์ชันสำหรับเช็คว่าตั้งค่า Config ครบถ้วนหรือไม่
export function isSupabaseConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
    );
}

export default supabase;