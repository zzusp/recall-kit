import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const adminClient = createAdminClient();
    let query = adminClient
      .from('experience_records')
      .select(`
        *,
        experience_keywords:experience_keywords(keyword),
        profiles:user_id(username, email)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const experiences = (data || []).map(record => ({
      ...record,
      keywords: (record as any).experience_keywords?.map((k: any) => k.keyword) || [],
      author: (record as any).profiles || null
    }));

    return NextResponse.json({
      success: true,
      data: {
        experiences,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0)
        }
      }
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';