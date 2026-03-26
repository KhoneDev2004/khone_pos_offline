import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// POST /api/upload — Upload a product image
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const productId = formData.get('productId') as string | null;

        if (!file) {
            return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ status: 'error', message: 'Invalid file type. Only JPEG, PNG, WebP allowed.' }, { status: 400 });
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg';
        const filename = `product_${productId || Date.now()}_${Date.now()}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fs.writeFileSync(filepath, buffer);

        // Return the public URL path
        const publicPath = `/uploads/products/${filename}`;

        return NextResponse.json({
            status: 'success',
            data: { path: publicPath, filename },
            message: 'Image uploaded successfully'
        });
    } catch (err) {
        console.error('[Upload Error]', err);
        return NextResponse.json(
            { status: 'error', message: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
