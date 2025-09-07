// components/client-layout.tsx
'use client';

import { Suspense, lazy, useEffect, useState } from 'react';
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ✅ Lazy load Sidebar
const Sidebar = lazy(() => import("@/components/layout/sidebar"));

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const { backgroundStyle } = useSettings();
    const [isMounted, setIsMounted] = useState(false);

    // ✅ เพิ่มการเช็ค client-side mounting
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // ✅ แสดง loading state ระหว่างรอ mount
    if (!isMounted) {
        return (
            <div className="flex h-screen overflow-hidden">
                <div className="h-screen w-16 p-2">
                    <div className="h-full w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                </div>
                <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
                    <div className="h-full w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Suspense fallback={
                <div className="h-screen w-16 p-2">
                    <div className="h-full w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                </div>
            }>
                <Sidebar />
            </Suspense>
            
            <main className={cn(
                "flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto",
                backgroundStyle
            )}>
                {children}
            </main>
        </div>
    );
}