import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Get application by ID with job and user details
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        jobs!inner(id, title, department, location, type, deadline, salary_min, salary_max),
        users(email, role)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching application:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Update application
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        jobs!inner(id, title, department, location),
        users(email, role)
      `)
      .single()

    if (error) {
      console.error('Error updating application:', error)
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Get application details first to clean up resume file
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('resume_url')
      .eq('id', id)
      .single()

    // Delete application
    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting application:', error)
      return NextResponse.json(
        { error: 'Failed to delete application' },
        { status: 500 }
      )
    }

    // Clean up resume file if exists
    if (application?.resume_url) {
      try {
        const url = new URL(application.resume_url)
        const filePath = url.pathname.split('/resumes/')[1]
        if (filePath) {
          await supabaseAdmin.storage
            .from('resumes')
            .remove([filePath])
        }
      } catch (cleanupError) {
        console.error('Error cleaning up resume file:', cleanupError)
        // Don't fail the request if file cleanup fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 