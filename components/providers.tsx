// components/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      // ✅ เพิ่ม refetchInterval เพื่อ performance
      refetchInterval={0} 
      // ✅ เพิ่ม refetchOnWindowFocus เพื่อ performance
      refetchOnWindowFocus={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        // ✅ เพิ่ม storageKey เพื่อ performance
        storageKey="theme"
      >
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}