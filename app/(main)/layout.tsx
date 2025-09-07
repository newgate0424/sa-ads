// app/(main)/layout.tsx
import { SettingsProvider } from "@/components/settings-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientLayout } from "@/components/client-layout";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    // ✅ เช็ค session อย่างรัดกุม
    if (!session || !session.user) {
        redirect('/');
    }
    
    return (
        <SettingsProvider>
            <ClientLayout>
                {children}
            </ClientLayout>
        </SettingsProvider>
    );
}