import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET: Fetch auth users
export async function GET() {
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: authUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata
      }))
    });

  } catch (error) {
    console.error('Error in sync GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Sync auth users to users table
export async function POST() {
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

    // Get existing users from our custom table
    const { data: existingUsers, error: existingError } = await supabaseAdmin
      .from('users')
      .select('id');

    if (existingError) {
      console.error('Error fetching existing users:', existingError);
      return NextResponse.json(
        { error: 'Failed to fetch existing users' },
        { status: 500 }
      );
    }

    const existingUserIds = new Set(existingUsers?.map(user => user.id) || []);
    const usersToSync = [];

    // Find auth users that don't exist in our users table
    for (const authUser of authUsers.users) {
      if (!existingUserIds.has(authUser.id)) {
        // Skip admin emails for regular sync
        if (authUser.email?.endsWith('@admin.com')) {
          continue;
        }

        usersToSync.push({
          id: authUser.id,
          email: authUser.email,
          role: authUser.user_metadata?.role || 'user',
          status: authUser.user_metadata?.status || 'active',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
        });
      }
    }

    let syncedCount = 0;

    if (usersToSync.length > 0) {
      // Insert missing users into our users table
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert(usersToSync);

      if (insertError) {
        console.error('Error syncing users:', insertError);
        return NextResponse.json(
          { error: 'Failed to sync users to database' },
          { status: 500 }
        );
      }

      syncedCount = usersToSync.length;
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} users`
    });

  } catch (error) {
    console.error('Error in sync POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 