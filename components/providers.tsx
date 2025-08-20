// components/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      // ✅ ปรับ config เพื่อประสิทธิภาพและความเสถียร
      refetchInterval={5 * 60} // เช็ค session ทุก 5 นาที
      refetchOnWindowFocus={true} // เช็คเมื่อกลับมาที่หน้าต่าง
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
      >
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}