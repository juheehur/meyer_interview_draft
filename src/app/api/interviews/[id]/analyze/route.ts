import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interviewId = params.id;
    
    // Get interview data
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('id, status, notes, jobs(title)')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.status !== 'completed') {
      return NextResponse.json({ error: 'Interview not completed yet' }, { status: 400 });
    }

    let interviewData;
    try {
      interviewData = JSON.parse(interview.notes || '{}');
    } catch {
      return NextResponse.json({ error: 'Invalid interview data' }, { status: 400 });
    }

    if (!interviewData.questions || !interviewData.transcripts) {
      return NextResponse.json({ error: 'No transcript data available' }, { status: 400 });
    }

    // Combine all transcripts for analysis
    const fullTranscript = interviewData.questions.map((question: string, index: number) => {
      const response = interviewData.transcripts[index] || 'No response recorded';
      return `Q${index + 1}: ${question}\nA${index + 1}: ${response}`;
    }).join('\n\n');

    const jobTitle = interview.jobs?.[0]?.title || 'General Position';

    // Generate comprehensive analysis using OpenAI
    const analysisPrompt = `
Analyze this job interview transcript for "${jobTitle}" and provide a detailed evaluation in JSON format.

Interview Transcript:
${fullTranscript}

Provide analysis in this exact JSON structure:
{
  "summary": "Brief 2-3 sentence summary of the interview performance",
  "skills": {
    "technical": ["skill1", "skill2", "skill3"],
    "soft": ["skill1", "skill2", "skill3"]
  },
  "language_analysis": {
    "clarity_score": 85,
    "filler_words_count": 12,
    "repetition_issues": 3,
    "overall_communication": "Clear and articulate communication with minimal hesitation"
  },
  "question_analysis": [
    {
      "question_number": 1,
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1"],
      "score": 8,
      "key_highlights": "Most impressive part of the response"
    }
  ],
  "overall_assessment": {
    "strengths": ["strength1", "strength2", "strength3"],
    "areas_for_improvement": ["area1", "area2"],
    "recommendation": "Strong candidate with excellent technical skills",
    "overall_score": 8.2
  },
  "hr_highlights": [
    {
      "timestamp": "Q1",
      "highlight": "Excellent problem-solving approach demonstrated",
      "category": "strength"
    }
  ]
}

Focus on:
1. Technical skills mentioned or demonstrated
2. Soft skills like communication, leadership, problem-solving
3. Language quality including filler words, clarity, structure
4. Specific strengths and constructive feedback
5. Key moments HR should review
6. Overall recommendation for hiring decision

Be constructive and professional in feedback.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert HR interviewer and assessment specialist. Provide detailed, constructive analysis of interview performance.' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let analysis;
    try {
      const content = response.choices[0].message.content;
      analysis = JSON.parse(content || '{}');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json({ error: 'Failed to analyze interview' }, { status: 500 });
    }

    // Store analysis in interview notes
    const updatedNotes = {
      ...interviewData,
      analysis: analysis,
      analyzed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('interviews')
      .update({ notes: JSON.stringify(updatedNotes) })
      .eq('id', interviewId);

    if (updateError) {
      console.error('Failed to store analysis:', updateError);
      return NextResponse.json({ error: 'Failed to store analysis' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      analysis: analysis 
    });

  } catch (error) {
    console.error('Analysis error:', error);
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
    
    // Get interview analysis
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('notes')
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

    if (!interviewData.analysis) {
      return NextResponse.json({ error: 'No analysis available' }, { status: 404 });
    }

    return NextResponse.json({ 
      analysis: interviewData.analysis,
      analyzed_at: interviewData.analyzed_at 
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 