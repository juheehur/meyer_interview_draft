import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    const { decision, feedback, admin_notes } = await request.json();
    
    // Validate decision
    if (!['accepted', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision. Must be "accepted" or "rejected"' }, { status: 400 });
    }

    // Get interview data
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('id, status, notes')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.status !== 'completed') {
      return NextResponse.json({ error: 'Interview must be completed before making a decision' }, { status: 400 });
    }

    // Parse existing notes
    let interviewData;
    try {
      interviewData = JSON.parse(interview.notes || '{}');
    } catch {
      interviewData = {};
    }

    // Add decision information
    const decisionData = {
      ...interviewData,
      decision: {
        status: decision,
        feedback: feedback || '',
        admin_notes: admin_notes || '',
        decided_at: new Date().toISOString(),
        decided_by: 'admin' // In a real app, you'd get this from auth
      }
    };

    // Update interview with decision
    const { error: updateError } = await supabase
      .from('interviews')
      .update({ 
        notes: JSON.stringify(decisionData),
        status: decision === 'accepted' ? 'hired' : 'rejected'
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error('Failed to store decision:', updateError);
      return NextResponse.json({ error: 'Failed to store decision' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      decision: decisionData.decision 
    });

  } catch (error) {
    console.error('Decision error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    
    // Get interview decision
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('notes, status')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    let interviewData;
    try {
      interviewData = JSON.parse(interview.notes || '{}');
    } catch {
      return NextResponse.json({ error: 'Invalid interview data' }, { status: 400 });
    }

    if (!interviewData.decision) {
      return NextResponse.json({ error: 'No decision available' }, { status: 404 });
    }

    return NextResponse.json({ 
      decision: interviewData.decision,
      status: interview.status
    });

  } catch (error) {
    console.error('Get decision error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 