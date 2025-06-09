"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Interview {
  id: string;
  job_id: string;
  status: string;
  notes?: string;
  jobs: { title: string }[];
  language?: string;
}

export default function InterviewConductPage() {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<{[key: number]: Blob[]}>({});
  const [isRecording, setIsRecording] = useState(false);
  const [prepareTime, setPrepareTime] = useState(30);
  const [recordingTime, setRecordingTime] = useState(60); // 1분 = 60초
  const [isPreparing, setIsPreparing] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');
  const [transcripts, setTranscripts] = useState<{[key: number]: string}>({});
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interviewLanguage, setInterviewLanguage] = useState<string>('en');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const prepareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  useEffect(() => {
    const initializeInterview = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }
      
      // 인터뷰 정보 가져오기
      const { data, error } = await supabase
        .from('interviews')
        .select('id, job_id, status, notes, jobs(title), language')
        .eq('id', interviewId)
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) {
        router.replace('/ai-interview');
        return;
      }
      
      if (data.status === 'pending') {
        router.replace(`/ai-interview/${interviewId}/prepare`);
        return;
      }
      
      if (data.status === 'completed') {
        router.replace('/ai-interview');
        return;
      }
      
      setInterview(data);
      
      // 질문 파싱 - admin이 수정한 새로운 형식과 기존 형식 모두 지원
      try {
        if (data.notes) {
          const parsedData = JSON.parse(data.notes);
          
          // 언어 정보 추출
          if (parsedData.language) {
            setInterviewLanguage(parsedData.language);
          }
          
          // 새로운 형식: {questions: [...], transcripts: [...]} 또는 {questions: [...]}
          if (parsedData.questions && Array.isArray(parsedData.questions)) {
            setQuestions(parsedData.questions);
          }
          // 중첩된 형식: {questions: {questions: [...], ...}}
          else if (parsedData.questions && parsedData.questions.questions && Array.isArray(parsedData.questions.questions)) {
            setQuestions(parsedData.questions.questions);
          }
          // 기존 형식: [...] (질문 배열)
          else if (Array.isArray(parsedData)) {
            setQuestions(parsedData);
          }
          // 단일 텍스트인 경우
          else {
            setQuestions([parsedData.toString()]);
          }
        } else {
          // 언어별 기본 질문 설정
          const getDefaultQuestion = (lang: string) => {
            switch (lang) {
              case 'th': return 'กรุณาแนะนำตัวเอง';
              case 'yue': return '請介紹一下自己';
              case 'zh': return '请介绍一下自己';
              case 'ko': return '자기소개를 해주세요';
              case 'en':
              default: return 'Tell me about yourself.';
            }
          };
          setQuestions([getDefaultQuestion(interviewLanguage)]);
        }
      } catch {
        // JSON 파싱 실패 시 언어별 기본 질문 사용
        const getDefaultQuestion = (lang: string) => {
          switch (lang) {
            case 'th': return 'กรุณาแนะนำตัวเอง';
            case 'yue': return '請介紹一下自己';
            case 'zh': return '请介绍一下自己';
            case 'ko': return '자기소개를 해주세요';
            case 'en':
            default: return 'Tell me about yourself.';
          }
        };
        setQuestions([data.notes || getDefaultQuestion(interviewLanguage)]);
      }
      
      // 카메라 및 마이크 설정
      await setupMedia();
      setLoading(false);
    };
    
    initializeInterview();
  }, [interviewId, router]);

  const setupMedia = async () => {
    try {
      // 먼저 사용 가능한 미디어 장치를 확인
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      console.log('Interview media setup - Available devices:', { videoDevices: videoDevices.length, audioDevices: audioDevices.length });

      // 장치가 전혀 없는 경우 경고 표시하고 계속 진행
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        setError('No camera or microphone found. Interview will proceed in text-only mode.');
        return;
      }

      let constraints: MediaStreamConstraints = {};
      
      if (videoDevices.length > 0) {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        };
      } else {
        constraints.video = false;
      }

      if (audioDevices.length > 0) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true
        };
      } else {
        constraints.audio = false;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // MediaRecorder는 스트림이 있는 경우에만 설정
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks();
      
      if (videoTracks.length > 0 || audioTracks.length > 0) {
        // 비디오 + 오디오 녹화용 (전체 인터뷰 저장)
        const recorder = new MediaRecorder(mediaStream, {
          mimeType: 'video/webm'
        });
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks(prev => ({
              ...prev,
              [currentQuestionIndex]: [...(prev[currentQuestionIndex] || []), event.data]
            }));
          }
        };
        
        setMediaRecorder(recorder);
        
        // 오디오 전용 녹화용 (STT API용)
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          const audioRec = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm'
          });
          
          audioRec.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          setAudioRecorder(audioRec);
        }
        
      } else {
        setError('No recording devices available. Interview will proceed in text-only mode.');
      }
      
    } catch (err: any) {
      console.error('Media setup error:', err);
      
      // 오류가 발생해도 인터뷰는 계속 진행
      switch (err.name) {
        case 'NotFoundError':
          setError('Camera or microphone not found. Interview will proceed in text-only mode.');
          break;
        case 'NotAllowedError':
          setError('Media access denied. Interview will proceed in text-only mode.');
          break;
        case 'NotReadableError':
          setError('Media devices are busy. Interview will proceed in text-only mode.');
          break;
        default:
          setError('Media setup failed. Interview will proceed in text-only mode.');
      }
      
      // 오류가 있어도 인터뷰는 계속 진행할 수 있도록 함
    }
  };

  const startPrepareTimer = () => {
    setPrepareTime(30);
    setIsPreparing(true);
    
    prepareTimerRef.current = setInterval(() => {
      setPrepareTime(prev => {
        if (prev <= 1) {
          setIsPreparing(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipPreparation = () => {
    if (prepareTimerRef.current) {
      clearInterval(prepareTimerRef.current);
    }
    setPrepareTime(0);
    setIsPreparing(false);
    startRecording();
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setRecordedChunks(prev => ({ ...prev, [currentQuestionIndex]: [] }));
      audioChunksRef.current = []; // 오디오 청크 초기화
      
      mediaRecorder.start(1000);
      
      // 오디오 전용 recorder도 시작
      if (audioRecorder && audioRecorder.state === 'inactive') {
        audioRecorder.start(1000);
      }
      
      setIsRecording(true);
      
      // 녹음 시간 타이머 시작 (1분 카운트다운)
      setRecordingTime(60);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev <= 1) {
            // 시간이 다 되면 자동으로 녹음 중지
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } else {
      // MediaRecorder가 없는 경우에도 상태 업데이트
      console.log('Recording not available, but continuing interview...');
      setIsRecording(true);
      
      // 텍스트 모드에서도 타이머 시작
      setRecordingTime(60);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const stopRecording = async () => {
    // 녹음 타이머 정리
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    if (audioRecorder && audioRecorder.state === 'recording') {
      audioRecorder.stop();
      
      // 잠시 기다린 후 transcription 시작
      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          await transcribeAudio();
        }
      }, 500);
    }
    
    setIsRecording(false);
    
    if (prepareTimerRef.current) {
      clearInterval(prepareTimerRef.current);
    }
  };

  const transcribeAudio = async () => {
    try {
      setIsTranscribing(true);
      
      // 오디오 청크를 하나의 파일로 합치기
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
      
      console.log('Transcribing audio:', {
        size: audioBlob.size,
        type: audioBlob.type,
        questionIndex: currentQuestionIndex
      });
      
      // 파일 크기 체크 (최소 크기)
      if (audioBlob.size < 1024) { // 1KB 미만
        console.log('Audio file too small, skipping transcription');
        return;
      }
      
      // FormData 생성
      const formData = new FormData();
      formData.append('audio', audioBlob, `question_${currentQuestionIndex}.webm`);
      formData.append('questionIndex', currentQuestionIndex.toString());
      formData.append('language', interviewLanguage); // 언어 정보 추가
      
      // STT API 호출
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 변환된 텍스트를 상태에 저장
        setTranscripts(prev => ({
          ...prev,
          [currentQuestionIndex]: data.transcript
        }));
        
        console.log('Transcription completed:', data.transcript);
      } else {
        const errorText = await response.text();
        console.error('STT API error:', errorText);
        setError('Speech-to-text conversion failed. You can still continue the interview.');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setError('Speech-to-text conversion failed. You can still continue the interview.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const nextQuestion = () => {
    stopRecording();
    
    // 모든 타이머 정리
    if (prepareTimerRef.current) {
      clearInterval(prepareTimerRef.current);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      startPrepareTimer();
    } else {
      setIsCompleted(true);
    }
  };

  const submitInterview = async () => {
    try {
      setLoading(true);
      
      // 모든 transcripts를 하나의 JSON으로 결합
      const interviewData = {
        questions: questions,
        transcripts: transcripts,
        language: interviewLanguage, // 언어 정보 포함
        completed_at: new Date().toISOString()
      };
      
      // 인터뷰 상태를 completed로 변경하고 transcripts 저장
      const { error } = await supabase
        .from('interviews')
        .update({ 
          status: 'completed',
          notes: JSON.stringify(interviewData) // 기존 질문과 새로운 transcripts 모두 저장
        })
        .eq('id', interviewId);
      
      if (error) {
        throw error;
      }
      
      // 스트림 정리
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // 성공 페이지로 이동
      router.push('/ai-interview?submitted=true');
    } catch (err) {
      setError('Failed to submit interview. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && questions.length > 0) {
      startPrepareTimer();
    }
    
    return () => {
      if (prepareTimerRef.current) {
        clearInterval(prepareTimerRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loading, questions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!interview || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-lg font-medium text-white">Interview not available</h2>
          <p className="text-gray-400">Please check your interview assignment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900/20">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">
              {interview.jobs?.[0]?.title || 'Interview'}
            </h1>
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-[#023da6]/20 text-[#023da6] px-3 py-1 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="text-gray-300 text-sm">
                Progress: {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isPreparing && (
              <div className="flex items-center bg-amber-500/20 text-amber-300 px-4 py-2 rounded-2xl backdrop-blur-sm">
                <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Prepare: {prepareTime}s</span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-red-500/20 text-red-300 px-4 py-2 rounded-2xl backdrop-blur-sm">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {stream ? 'Recording' : 'Answering'}
                  </span>
                </div>
                <div className={`flex items-center px-4 py-2 rounded-2xl backdrop-blur-sm ${
                  recordingTime <= 10 ? 'bg-red-500/30 text-red-200 animate-pulse' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-1 bg-gray-700/50 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        {/* Question Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <div className="text-center">
              <div className="inline-flex items-center bg-[#023da6]/10 text-[#023da6] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                Interview Question
              </div>
              <h2 className="text-3xl font-light text-white mb-8 leading-relaxed">
                {questions[currentQuestionIndex]}
              </h2>
              
              {isPreparing && (
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-6xl font-light text-amber-400 mb-3">
                      {prepareTime}
                    </div>
                    <p className="text-amber-200 text-lg font-medium">
                      Preparation Time Remaining
                    </p>
                  </div>
                  <p className="text-amber-100/80 mb-6 text-center">
                    Take a moment to think about your answer. Recording will start automatically when the timer reaches zero.
                  </p>
                  <button
                    onClick={skipPreparation}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 px-6 rounded-2xl font-medium transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    Skip Preparation & Start Recording Now
                  </button>
                </div>
              )}
              
              {isRecording && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-red-200 font-medium text-xl mb-4">
                      {stream ? 'Recording your video response...' : 'Recording your audio response...'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-5xl font-light mb-3 ${
                      recordingTime <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
                    }`}>
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <p className={`text-lg ${
                      recordingTime <= 10 ? 'text-red-300' : 'text-gray-300'
                    }`}>
                      {recordingTime <= 10 ? '⚠️ Recording will stop soon!' : 'Time remaining to answer'}
                    </p>
                  </div>
                  
                  {isTranscribing && (
                    <div className="mt-6 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      <p className="text-blue-200 text-sm">Converting speech to text...</p>
                    </div>
                  )}
                </div>
              )}
              
              {!isPreparing && !isRecording && transcripts[currentQuestionIndex] && (
                <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-6">
                  <h3 className="text-green-200 font-medium mb-4 flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Your Response Recorded
                  </h3>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-200 leading-relaxed">
                      {transcripts[currentQuestionIndex]}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
              Live Preview
            </h3>
            
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl overflow-hidden border-2 border-gray-600/30 relative">
              {stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  {isRecording && (
                    <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        REC
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1V3H7v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Audio Interview Mode</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Camera not available.<br/>
                      You can still complete the interview.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-400/30 rounded-xl">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-amber-400 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-amber-200 text-sm leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Panel */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <h4 className="text-white font-medium mb-3">Interview Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Question:</span>
                <span className="text-white">{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${
                  isPreparing ? 'text-amber-400' : 
                  isRecording ? 'text-red-400' : 
                  isTranscribing ? 'text-blue-400' :
                  'text-green-400'
                }`}>
                  {isPreparing ? 'Preparing' : 
                   isRecording ? 'Recording' : 
                   isTranscribing ? 'Processing' :
                   'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Responses:</span>
                <span className="text-white">{Object.keys(transcripts).length}/{questions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-gray-300">
            {isPreparing ? 'Preparing to record...' : 
             isRecording ? `Recording (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')} remaining)` : 
             isTranscribing ? 'Converting speech to text...' :
             'Ready to continue'}
          </div>
          
          <div className="flex space-x-4">
            {!isPreparing && !isRecording && !isTranscribing && (
              <button
                onClick={startRecording}
                className="px-8 py-3 bg-[#023da6] hover:bg-[#034bb8] text-white rounded-2xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
                {stream ? 'Start Recording' : 'Start Answer'}
                <span className="ml-2 text-xs opacity-75">(Max 1 min)</span>
              </button>
            )}
            
            {isRecording && !isTranscribing && (
              <button
                onClick={stopRecording}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M12 7a1 1 0 012 0v6a1 1 0 11-2 0V7z" clipRule="evenodd"/>
                </svg>
                {stream ? 'Stop Recording' : 'Finish Answer'}
              </button>
            )}
            
            {isTranscribing && (
              <div className="flex items-center px-6 py-3 bg-blue-500/20 text-blue-300 rounded-2xl">
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Processing Audio...
              </div>
            )}
            
            {!isPreparing && !isRecording && !isCompleted && !isTranscribing && (
              <button
                onClick={nextQuestion}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 flex items-center"
              >
                {currentQuestionIndex < questions.length - 1 ? (
                  <>
                    Next Question
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Finish Interview
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-3xl p-8 max-w-lg w-full border border-white/10 shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Interview Completed!</h3>
              <p className="text-gray-300 mb-8 text-lg">
                You've answered all {questions.length} questions successfully.
              </p>
              
              {/* Transcripts Summary */}
              <div className="bg-[#023da6]/10 border border-[#023da6]/30 rounded-2xl p-6 mb-8">
                <h4 className="text-[#023da6] font-semibold mb-4 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Voice Analysis Summary
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Questions answered:</span>
                    <span className="text-green-400 font-semibold">{questions.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Voice responses recorded:</span>
                    <span className="text-green-400 font-semibold">{Object.keys(transcripts).length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <span className="text-gray-300">Speech-to-text conversion:</span>
                    <span className="text-green-400 font-semibold">Completed</span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Your responses have been recorded and converted to text for analysis. 
                The interviewer will review your answers and provide feedback.
              </p>
              
              <button
                onClick={submitInterview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Submit Interview & Complete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 