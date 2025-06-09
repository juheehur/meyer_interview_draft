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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('applications')
      .select(`
        *,
        jobs!inner(id, title, department, location),
        users(email, role)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: applications, error } = await query

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })

    if (jobId) {
      countQuery = countQuery.eq('job_id', jobId)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      applications,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract form fields
    const applicationData = {
      job_id: formData.get('job_id') as string,
      user_id: formData.get('user_id') as string || null,
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || null,
      cover_letter: formData.get('cover_letter') as string,
      linkedin_url: formData.get('linkedin_url') as string || null,
      portfolio_url: formData.get('portfolio_url') as string || null,
      expected_salary: formData.get('expected_salary') as string || null,
      start_date: formData.get('start_date') as string || null,
      additional_info: formData.get('additional_info') as string || null,
    }

    // Validate required fields
    if (!applicationData.job_id || !applicationData.full_name || !applicationData.email || !applicationData.cover_letter) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Handle file upload
    const resumeFile = formData.get('resume') as File
    let resumeUrl = null

    if (resumeFile && resumeFile.size > 0) {
      // Generate unique filename
      const fileExt = resumeFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${applicationData.job_id}/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('resumes')
        .upload(filePath, resumeFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading resume:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload resume' },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('resumes')
        .getPublicUrl(filePath)

      resumeUrl = publicUrl
    }

    // Insert application
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .insert([{
        ...applicationData,
        resume_url: resumeUrl
      }])
      .select(`
        *,
        jobs!inner(title, department, location)
      `)
      .single()

    if (error) {
      console.error('Error creating application:', error)
      
      // Clean up uploaded file if database insert fails
      if (resumeUrl) {
        await supabaseAdmin.storage
          .from('resumes')
          .remove([`${applicationData.job_id}/${resumeFile.name}`])
      }

      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 