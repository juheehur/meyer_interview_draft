import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const envCheck = {
      supabaseUrl: !!supabaseUrl,
      serviceRoleKey: !!serviceRoleKey,
      supabaseUrlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Not set',
      serviceRoleKeyValue: serviceRoleKey ? serviceRoleKey.substring(0, 20) + '...' : 'Not set'
    };

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        envCheck
      }, { status: 500 });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test basic connection
    const { count: userCount, error: connectionError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (connectionError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        envCheck,
        connectionError: {
          message: connectionError.message,
          details: connectionError.details,
          hint: connectionError.hint,
          code: connectionError.code
        }
      }, { status: 500 });
    }

    // Check users table structure
    const { data: sampleUser, error: tableError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    const tableCheck = {
      usersTableExists: !tableError,
      userCount: userCount || 0,
      sampleUser: sampleUser?.[0] || null,
      tableError: tableError ? {
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint,
        code: tableError.code
      } : null
    };

    // Test auth admin functionality
    let authCheck: { working: boolean; error: string | null; userCount?: number } = { working: false, error: null };
    try {
      // Try to list users (this will test auth admin permissions)
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      authCheck = {
        working: !authError,
        error: authError ? authError.message : null,
        userCount: authUsers?.users?.length || 0
      };
    } catch (error) {
      authCheck = {
        working: false,
        error: (error as Error).message
      };
    }

    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection test completed',
      envCheck,
      tableCheck,
      authCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Debug API failed',
      error: (error as Error).message
    }, { status: 500 });
  }
} 