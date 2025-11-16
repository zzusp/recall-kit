import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const SETTINGS_KEY = 'ai_config';

// 从 cookies 创建 Supabase 客户端
function createSupabaseClientFromCookies(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {
          // 在 API 路由中不需要设置 cookies
        },
        remove() {
          // 在 API 路由中不需要删除 cookies
        },
      },
    }
  );
}

// 使用 token 验证用户
async function verifyUserWithToken(token: string) {
  // 创建一个使用该 token 的 Supabase 客户端
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // 验证 token 并获取用户
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error('Token verification failed:', error);
    return null;
  }

  // 使用带 token 的客户端查询 profile（RLS 策略会允许管理员读取）
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile query failed:', profileError);
    return null;
  }

  return { user, profile };
}

// GET - 获取设置
export async function GET(request: NextRequest) {
  try {
    // 尝试从 Authorization header 获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user, profile, supabaseForData;
    
    if (token) {
      // 使用 token 验证
      const result = await verifyUserWithToken(token);
      if (!result) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = result.user;
      profile = result.profile;
      
      // 创建带 token 的客户端用于数据操作
      supabaseForData = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
    } else {
      // 使用 cookies 验证
      const supabase = createSupabaseClientFromCookies(request);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // 使用带 session 的客户端查询 profile（RLS 策略会允许管理员读取）
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      user = session.user;
      profile = profileData;
      supabaseForData = supabase;
    }

    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('Settings API GET - Auth check:', {
        userId: user?.id,
        profileRole: profile?.role,
        isAdmin: profile?.role === 'admin',
      });
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden',
        debug: process.env.NODE_ENV === 'development' ? {
          userId: user?.id,
          profileRole: profile?.role,
          hasProfile: !!profile,
        } : undefined
      }, { status: 403 });
    }

    // 从数据库读取设置
    const { data: setting, error } = await supabaseForData
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', SETTINGS_KEY)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // 如果没有设置，返回默认值
    const defaultSettings = {
      aiServiceType: 'openai',
      openaiKey: '',
      openaiApiUrl: 'https://api.openai.com/v1',
      openaiModel: 'text-embedding-3-small',
      anthropicKey: '',
      anthropicApiUrl: 'https://api.anthropic.com/v1',
      anthropicModel: 'claude-3-sonnet-20240229',
      customApiKey: '',
      customApiUrl: '',
      customModel: '',
    };

    const settings = setting?.setting_value || defaultSettings;

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - 保存设置
export async function POST(request: NextRequest) {
  try {
    // 尝试从 Authorization header 获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user, profile, supabaseForData;
    
    if (token) {
      // 使用 token 验证
      const result = await verifyUserWithToken(token);
      if (!result) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = result.user;
      profile = result.profile;
      
      // 创建带 token 的客户端用于数据操作
      supabaseForData = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
    } else {
      // 使用 cookies 验证
      const supabase = createSupabaseClientFromCookies(request);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // 使用带 session 的客户端查询 profile（RLS 策略会允许管理员读取）
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      user = session.user;
      profile = profileData;
      supabaseForData = supabase;
    }

    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('Settings API POST - Auth check:', {
        userId: user?.id,
        profileRole: profile?.role,
        isAdmin: profile?.role === 'admin',
      });
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden',
        debug: process.env.NODE_ENV === 'development' ? {
          userId: user?.id,
          profileRole: profile?.role,
          hasProfile: !!profile,
        } : undefined
      }, { status: 403 });
    }

    const body = await request.json();
    const settings = body;

    // 保存到数据库
    const { error } = await supabaseForData
      .from('system_settings')
      .upsert({
        setting_key: SETTINGS_KEY,
        setting_value: settings,
        description: 'AI服务配置',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Error saving settings:', error);
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

