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
      questionIndex
    });

    // OpenAI Whisper API는 File 객체를 직접 받을 수 있습니다
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko", // 한국어로 설정 (영어는 "en")
      response_format: "text"
    });

    console.log('Transcription result:', transcription);

    return NextResponse.json({
      success: true,
      transcript: transcription,
      questionIndex: parseInt(questionIndex)
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