// app/api/team-color-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connection } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const teamName = searchParams.get('teamName');

        let query = 'SELECT * FROM team_color_settings';
        let params: any[] = [];

        if (teamName) {
            query += ' WHERE team_name = ?';
            params.push(teamName);
        }

        query += ' ORDER BY team_name, field_name';

        const [rows] = await connection.execute(query, params);
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('Error fetching team color settings:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const settings = await req.json();
        const { teamName, fieldName, moreThan, lessThan, applyToCell } = settings;

        if (!teamName || !fieldName) {
            return NextResponse.json({ message: 'teamName and fieldName are required' }, { status: 400 });
        }

        // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
        const query = `
            INSERT INTO team_color_settings 
            (team_name, field_name, more_than_enabled, more_than_threshold, more_than_color, 
             less_than_enabled, less_than_threshold, less_than_color, apply_to_cell)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                more_than_enabled = VALUES(more_than_enabled),
                more_than_threshold = VALUES(more_than_threshold),
                more_than_color = VALUES(more_than_color),
                less_than_enabled = VALUES(less_than_enabled),
                less_than_threshold = VALUES(less_than_threshold),
                less_than_color = VALUES(less_than_color),
                apply_to_cell = VALUES(apply_to_cell),
                updated_at = CURRENT_TIMESTAMP
        `;

        const params = [
            teamName,
            fieldName,
            moreThan?.enabled || false,
            moreThan?.threshold || 0,
            moreThan?.color || '#ef4444',
            lessThan?.enabled || false,
            lessThan?.threshold || 0,
            lessThan?.color || '#22c55e',
            applyToCell || false
        ];

        await connection.execute(query, params);

        return NextResponse.json({ message: 'Settings saved successfully' });
    } catch (error: any) {
        console.error('Error saving team color settings:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const teamName = searchParams.get('teamName');
        const fieldName = searchParams.get('fieldName');

        if (!teamName || !fieldName) {
            return NextResponse.json({ message: 'teamName and fieldName are required' }, { status: 400 });
        }

        await connection.execute(
            'DELETE FROM team_color_settings WHERE team_name = ? AND field_name = ?',
            [teamName, fieldName]
        );

        return NextResponse.json({ message: 'Settings deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting team color settings:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}