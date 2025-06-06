import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const { user_id, job_id, resume_text, email, full_name, application_id } = await request.json();
    
    // user_id 또는 (email + full_name) 중 하나는 있어야 함
    if (!job_id || (!user_id && (!email || !full_name))) {
      return NextResponse.json({ 
        error: 'job_id is required, and either user_id or (email + full_name) must be provided' 
      }, { status: 400 });
    }

    // 1. job title 가져오기
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('title')
      .eq('id', job_id)
      .single();
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 2. user_id가 없는 경우 users 테이블에서 찾거나 생성
    let actualUserId = user_id;
    
    if (!actualUserId && email) {
      // 이메일로 사용자 찾기
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        actualUserId = existingUser.id;
      } else {
        // users 테이블에 없으면 새로 생성 (guest user로)
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([{
            email: email,
            role: 'user',
            status: 'active'
          }])
          .select('id')
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          // 사용자 생성 실패해도 계속 진행 (null로 둠)
          actualUserId = null;
        } else {
          actualUserId = newUser.id;
        }
      }
    }

    // 3. GPT로 면접 질문 생성 (resume_text가 있으면 맞춤 질문, 없으면 general 질문)
    let prompt;
    if (resume_text) {
      prompt = `You are an expert interviewer. Generate a JSON array of 5 interview questions for the following job and resume.\n- At least 2 questions must be general (e.g., 'Introduce yourself', 'What are your strengths?'), and the rest should be tailored to the resume and job.\n- Output only a JSON array of strings, no explanation.\nJob Title: ${job.title}\nResume: ${resume_text}`;
    } else {
      prompt = `You are an expert interviewer. Generate a JSON array of 5 general interview questions for the following job.\n- At least 2 questions must be general (e.g., 'Introduce yourself', 'What are your strengths?').\n- Output only a JSON array of strings, no explanation.\nJob Title: ${job.title}`;
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert interviewer.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });
    
    let questionsJson = response.choices[0].message.content;
    // JSON 파싱 및 문자열화 (notes에 저장)
    let questionsArr;
    try {
      questionsArr = JSON.parse(questionsJson || '[]');
    } catch {
      questionsArr = [questionsJson];
    }
    
    // 기본 노트 데이터 구조
    const notesData: any = {
      questions: questionsArr
    };

    // application_id가 있으면 메타데이터 추가
    if (application_id) {
      notesData.application_id = application_id;
      if (email) notesData.candidate_email = email;
      if (full_name) notesData.candidate_name = full_name;
    }

    // 4. interviews 테이블에 저장
    const insertData: any = {
      user_id: actualUserId,
      job_id,
      status: 'pending',
      notes: JSON.stringify(notesData),
    };

    const { data, error } = await supabase
      .from('interviews')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Interview creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, interview: data });
  } catch (e) {
    console.error('API error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
} 