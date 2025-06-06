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
    const { user_id, job_id, resume_text } = await request.json();
    if (!user_id || !job_id) {
      return NextResponse.json({ error: 'user_id, job_id required' }, { status: 400 });
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

    // 2. GPT로 면접 질문 생성 (resume_text가 있으면 맞춤 질문, 없으면 general 질문)
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
    const questions = JSON.stringify(questionsArr, null, 2);

    // 3. interviews 테이블에 저장 (notes에 질문 저장)
    const { data, error } = await supabase
      .from('interviews')
      .insert([
        {
          user_id,
          job_id,
          status: 'pending',
          notes: questions,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, interview: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
} 