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

    // ✅ เพิ่ม useCallback เพื่อป้องกัน re-render ที่ไม่จำเป็น
    const handleRedirect = useCallback(() => {
        if (status === 'authenticated') {
            router.replace('/overview');
        }
    }, [status, router]);

    useEffect(() => {
        handleRedirect();
    }, [handleRedirect]);

    // ✅ Prefetch หน้าสำคัญเมื่อ component mount
    useEffect(() => {
        router.prefetch('/overview');
        router.prefetch('/adser');
        router.prefetch('/settings');
    }, [router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                username,
                password,
            });

            if (result?.ok) {
                // ✅ ไม่ต้องรอให้ loading เสร็จ redirect ทันที
                router.replace('/overview');
            } else {
                setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                setLoading(false);
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            setLoading(false);
        }
    }, [username, password, router]);

    // ✅ ใช้ Skeleton ที่เร็วขึ้นและเบาขึ้น
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

    if (status === 'authenticated') {
        // ✅ แสดง Loading state ระหว่าง redirect
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">กำลังเข้าสู่ระบบ...</p>
                </div>
            </div>
        );
    }

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
                                        // ✅ เพิ่ม performance optimization
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
                                        // ✅ เพิ่ม performance optimization
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

    return null;
}