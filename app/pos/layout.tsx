import POSSidebar from '@/app/components/POSSidebar';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="pos-layout">
            <POSSidebar />
            {children}
        </div>
    );
}
