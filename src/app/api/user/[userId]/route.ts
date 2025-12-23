import { NextResponse } from 'next/server';
import { dbService } from '@/lib/database';

export async function GET(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId;
        const user = await dbService.getUserInfo(userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('User API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
