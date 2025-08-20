// components/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ แสดง loading state แบบง่ายๆ ระหว่างรอ hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SessionProvider 
      // ✅ ปิดการ auto refetch เพื่อป้องกัน error
      refetchInterval={0}
      refetchOnWindowFocus={false}
      // ✅ เพิ่ม error handling
      onError={(error) => {
        console.error('SessionProvider error:', error);
      }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="theme"
        // ✅ เพิ่ม error boundary
        onError={(error) => {
          console.error('ThemeProvider error:', error);
        }}
      >
        {children}
        <Toaster 
          richColors 
          position="top-right"
          // ✅ เพิ่ม error handling สำหรับ toaster
          closeButton
          duration={5000}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}