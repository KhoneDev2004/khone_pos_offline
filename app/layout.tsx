import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'POS System — Point of Sale',
    description: 'Offline-first POS system with cloud sync',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1a1a2e',
                            color: '#f0f0ff',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            fontSize: '14px',
                        },
                        success: {
                            iconTheme: { primary: '#00b894', secondary: '#1a1a2e' },
                        },
                        error: {
                            iconTheme: { primary: '#e17055', secondary: '#1a1a2e' },
                        },
                    }}
                />
            </body>
        </html>
    );
}
