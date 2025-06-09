import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const questionIndex = formData.get('questionIndex') as string;
    const language = formData.get('language') as string || 'en'; // 기본값을 영어로 변경

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Processing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      questionIndex,
      language // 언어 정보 로깅
    });

    // OpenAI Whisper API는 File 객체를 직접 받을 수 있습니다
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language, // 동적 언어 설정
      response_format: "text"
    });

    console.log('Transcription result:', transcription);

    return NextResponse.json({
      success: true,
      transcript: transcription,
      questionIndex: parseInt(questionIndex),
      language: language // 응답에 언어 정보 포함
    });

  } catch (error: any) {
    console.error('STT API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Speech-to-text conversion failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 