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

export async function POST(request: NextRequest) {
  try {
    console.log('Adding additional fields to jobs table...')

    // Add new fields to jobs table
    const alterTableQueries = [
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT', 
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level TEXT',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT \'full-time\'',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false'
    ]

    for (const query of alterTableQueries) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query })
        if (error) {
          console.error(`Error executing query: ${query}`, error)
          // Continue with other queries even if one fails
        } else {
          console.log(`Successfully executed: ${query}`)
        }
      } catch (err) {
        console.error(`Error with query: ${query}`, err)
      }
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Jobs table migration completed. Please check Supabase dashboard to verify new fields.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error during migration:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed',
        message: 'Please add the following fields manually in Supabase dashboard:',
        fields: [
          'responsibilities (TEXT)',
          'benefits (TEXT)', 
          'deadline (TIMESTAMP WITH TIME ZONE)',
          'salary_min (INTEGER)',
          'salary_max (INTEGER)',
          'department (TEXT)',
          'experience_level (TEXT)',
          'employment_type (TEXT) DEFAULT \'full-time\'',
          'is_remote (BOOLEAN) DEFAULT false'
        ]
      },
      { status: 500 }
    )
  }
} 