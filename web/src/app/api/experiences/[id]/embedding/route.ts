import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/experiences/[id]/embedding
 * Generate and update embedding for a specific experience
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Generating embedding for experience: ${id}`);
    
    // Create supabase client to read settings
    // Try with session first, then fallback to anon key
    let supabaseClient: ReturnType<typeof createClient<Database>> | undefined;
    try {
      console.log('[API] Attempting to create supabase client...');
      
      // First try to get session
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set() {},
            remove() {},
          },
        }
      );
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[API] Session check:', { 
        hasSession: !!session, 
        hasError: !!sessionError,
        userId: session?.user?.id 
      });
      
      if (session) {
        // Create client with session token for RLS
        supabaseClient = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          }
        );
        console.log('[API] Created supabase client with session token');
      } else {
        // Fallback: use anon key to read settings
        // This will work if RLS allows public read, or we can modify RLS policy
        supabaseClient = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        console.log('[API] Created supabase client with anon key (no session)');
      }
    } catch (err) {
      console.error('[API] Failed to create supabase client:', err);
      if (err instanceof Error) {
        console.error('[API] Error details:', { message: err.message, stack: err.stack });
      }
    }
    
    console.log('[API] Passing supabase client to ExperienceService:', { hasClient: !!supabaseClient });
    const experienceService = new ExperienceService(supabaseClient);
    
    const success = await experienceService.updateExperienceEmbedding(id);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Embedding updated successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update embedding (check server logs for details)'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error generating embedding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';

