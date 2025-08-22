// app/api/heartbeat/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connection } from '@/lib/db';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.name) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // อัพเดต last_seen เป็นเวลาปัจจุบัน
        await connection.execute(
            'UPDATE users SET last_seen = ? WHERE username = ?',
            [new Date(), session.user.name]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}