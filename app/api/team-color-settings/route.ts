import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connection } from '@/lib/db';

export type ThresholdRule = {
    id: string;
    operator: '>' | '<';
    threshold: number;
    color: string;
};

export type FieldColorSettings = {
    textColorRules: ThresholdRule[];
    backgroundColorRules: ThresholdRule[];
};

// GET: ดึงข้อมูลการตั้งค่าสีทั้งหมด
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [rows] = await connection.execute('SELECT * FROM TeamColorSetting');
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('Error fetching team color settings:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

// POST: บันทึกการตั้งค่าสีสำหรับทั้งกลุ่ม
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { teamNames, settings } = body as { teamNames: string[], settings: Record<string, FieldColorSettings> };

        if (!teamNames || !Array.isArray(teamNames) || teamNames.length === 0 || typeof settings !== 'object') {
            return NextResponse.json({ message: 'Team names array and settings object are required' }, { status: 400 });
        }

        const db = await connection.getConnection();
        await db.beginTransaction();

        try {
            for (const teamName of teamNames) {
                for (const [fieldName, fieldSettings] of Object.entries(settings)) {
                    const { textColorRules, backgroundColorRules } = fieldSettings;
                    
                    const textColorRulesJson = JSON.stringify(textColorRules || []);
                    const backgroundColorRulesJson = JSON.stringify(backgroundColorRules || []);

                    const query = `
                        INSERT INTO TeamColorSetting 
                        (team_name, field_name, text_color_rules, background_color_rules)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            text_color_rules = VALUES(text_color_rules),
                            background_color_rules = VALUES(background_color_rules)
                    `;
                    const params = [teamName, fieldName, textColorRulesJson, backgroundColorRulesJson];
                    await db.execute(query, params);
                }
            }
            await db.commit();
            db.release();
            return NextResponse.json({ message: 'Settings saved successfully for the group' });

        } catch (error) {
            await db.rollback();
            db.release();
            throw error;
        }

    } catch (error: any) {
        console.error('Error saving team color settings:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}