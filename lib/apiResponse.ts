import { NextResponse } from 'next/server';

interface ApiResponse<T = unknown> {
    status: 'success' | 'error';
    message: string;
    data: T;
}

export function successResponse<T>(data: T, message: string = 'Success', statusCode: number = 200) {
    const body: ApiResponse<T> = {
        status: 'success',
        message,
        data,
    };
    return NextResponse.json(body, { status: statusCode });
}

export function errorResponse(message: string = 'An error occurred', statusCode: number = 500, data: unknown = null) {
    const body: ApiResponse = {
        status: 'error',
        message,
        data,
    };
    return NextResponse.json(body, { status: statusCode });
}

export function withErrorHandler(
    handler: (req: Request, context?: unknown) => Promise<NextResponse>
) {
    return async (req: Request, context?: unknown) => {
        try {
            return await handler(req, context);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Internal server error';
            console.error('[API Error]', message);
            return errorResponse(message, 500);
        }
    };
}
