// components/login-form.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { data: session, status } = useSession();

    // ✅ แก้ไข: เพิ่ม timeout และ error handling ที่ดีขึ้น
    useEffect(() => {
        if (status === 'authenticated' && session) {
            console.log('User authenticated, redirecting to overview...');
            // ✅ ใช้ replace และเพิ่ม timeout เพื่อป้องกันการค้าง
            const timeoutId = setTimeout(() => {
                router.replace('/overview');
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [status, session, router]);

    // ✅ Prefetch หน้าสำคัญเมื่อ component mount
    useEffect(() => {
        router.prefetch('/overview');
        router.prefetch('/adser');
    }, [router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting login...');
            const result = await signIn('credentials', {
                redirect: false, // ✅ สำคัญ: ต้องเป็น false
                username,
                password,
            });

            console.log('SignIn result:', result);

            if (result?.ok) {
                console.log('Login successful');
                // ✅ ไม่ต้อง redirect ที่นี่ ให้ useEffect ด้านบนจัดการ
                // router.replace('/overview'); // ลบบรรทัดนี้ออก
            } else {
                console.log('Login failed:', result?.error);
                setError(result?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            setLoading(false);
        }
    }, [username, password]);

    // ✅ แก้ไข: เพิ่มการแสดง loading state ที่ชัดเจนขึ้น
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    // ✅ แก้ไข: เพิ่มการแสดง loading state ระหว่าง redirect
    if (status === 'authenticated') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">เข้าสู่ระบบสำเร็จ กำลังเข้าสู่หน้าหลัก...</p>
                </div>
            </div>
        );
    }

    // ✅ แสดงฟอร์ม login เฉพาะเมื่อ status เป็น 'unauthenticated'
    if (status === 'unauthenticated') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <form onSubmit={handleSubmit}>
                    <Card className="w-[380px]">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid w-full items-center gap-4">
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        disabled={loading}
                                        autoComplete="username"
                                        autoFocus
                                        spellCheck={false}
                                    />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        autoComplete="current-password"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        กำลังเข้าสู่ระบบ...
                                    </>
                                ) : (
                                    'เข้าสู่ระบบ'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        );
    }

    // ✅ กรณีที่ status ไม่ตรงกับเงื่อนไขไหนเลย
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
            </div>
        </div>
    );
}