// components/client-layout.tsx
'use client';

import { Suspense, lazy } from 'react';
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ✅ Lazy load Sidebar เพื่อความเร็ว
const Sidebar = lazy(() => import("@/components/layout/sidebar"));

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const { backgroundStyle } = useSettings();

    // ✅ เพิ่ม div ที่ซ่อนอยู่เพื่อบังคับให้ Tailwind รวมคลาสพื้นหลังทั้งหมด
    const tailwindSafelist = (
      <div className="hidden">
        <div className="bg-gradient-default" />
        <div className="bg-gradient-ocean" />
        <div className="bg-gradient-sunset" />
        <div className="bg-gradient-forest" />
        <div className="dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950" />
        <div className="dark:from-blue-950 via-teal-950 to-green-950" />
        <div className="dark:from-yellow-950 via-orange-950 to-red-950" />
        <div className="dark:from-lime-950 via-green-950 to-teal-950" />
      </div>
    );
    
    return (
        <div className="flex h-screen overflow-hidden">
            {/* ✅ ใช้ Suspense กับ Sidebar */}
            <Suspense fallback={<Skeleton className="h-screen w-16 p-2" />}>
                <Sidebar />
            </Suspense>
            
            <main className={cn(
                "flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto",
                backgroundStyle
            )}>
                {tailwindSafelist}
                {children}
            </main>
        </div>
    );
}