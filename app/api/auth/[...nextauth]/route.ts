// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// ✅ สำคัญมาก: ต้องมี export handler ที่ถูกต้อง
const handler = NextAuth(authOptions);

// ✅ Export สำหรับ App Router (Next.js 13+)
export { handler as GET, handler as POST };

// ✅ เพิ่ม error handling
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';