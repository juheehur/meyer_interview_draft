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

export async function POST(request: NextRequest) {
  try {
    // Debug environment variables
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { email, role, status } = await request.json();
    console.log('Creating user with data:', { email, role, status });

    if (!email || !role || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth Admin API
    console.log('Creating auth user...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        role,
        status
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    console.log('Auth user created successfully:', authUser.user.id);

    // Insert user data into custom users table
    console.log('Inserting user data into users table...');
    const userData = {
      id: authUser.user.id,
      email: authUser.user.email,
      role,
      status,
      created_at: new Date().toISOString(),
      last_sign_in_at: null,
    };
    console.log('User data to insert:', userData);

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([userData]);

    if (dbError) {
      console.error('Error inserting user data:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      
      // If database insert fails, we should clean up the auth user
      console.log('Cleaning up auth user due to database error...');
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      return NextResponse.json(
        { 
          error: 'Failed to create user profile',
          details: dbError.message,
          hint: dbError.hint 
        },
        { status: 500 }
      );
    }

    console.log('User created successfully!');
    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          role,
          status
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in user creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, email, role, status } = await request.json();

    if (!id || !email || !role || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update user metadata in auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      user_metadata: {
        role,
        status
      }
    });

    if (authError) {
      console.error('Error updating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Update user data in custom users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        email,
        role,
        status,
      })
      .eq('id', id);

    if (dbError) {
      console.error('Error updating user data:', dbError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        user: { id, email, role, status }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in user update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Delete from users table (this might be handled by cascade delete)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Error deleting user from database:', dbError);
      // Don't fail the request if database delete fails, auth user is already deleted
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in user deletion API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 