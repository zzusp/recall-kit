import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getApiKeyUsageStats } from '@/lib/services/apiKeyService';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id
    const { id } = await params;
    
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeyId = id;
    if (!apiKeyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    // Validate session and get user ID
    const sessionResult = await db.query(
      'SELECT user_id, expires_at FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

    const session = sessionResult.rows[0];

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await db.query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const userId = session.user_id;

    const stats = await getApiKeyUsageStats(userId, apiKeyId);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching API key usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}