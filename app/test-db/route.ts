import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // นำเข้า supabase ที่คุณสร้างไว้

export async function GET() {
  try {
    // 1. ลองดึงข้อมูลจากตาราง products เพื่อเทสต์การเชื่อมต่อ
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    // 2. ถ้าเชื่อมต่อไม่ได้ หรือไม่มีตาราง จะเข้าเงื่อนไขนี้
    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ 
        status: 'error', 
        message: 'เชื่อมต่อ Supabase ไม่สำเร็จ', 
        error: error.message 
      }, { status: 500 });
    }

    // 3. ถ้าเชื่อมต่อสำเร็จ จะส่งคำตอบนี้กลับไป
    return NextResponse.json({ 
      status: 'success', 
      message: 'เชื่อมต่อ Supabase สำเร็จ!', 
      data: data 
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ status: 'error', message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' }, { status: 500 });
  }
}