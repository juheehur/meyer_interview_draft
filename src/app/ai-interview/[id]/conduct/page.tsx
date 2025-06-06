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
        .select('id, job_id, status, notes, jobs(title)')
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
      
      // 질문 파싱
      try {
        const parsedQuestions = data.notes ? JSON.parse(data.notes) : [];
        setQuestions(parsedQuestions);
      } catch {
        setQuestions([data.notes || 'Tell me about yourself.']);
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">
              {interview.jobs?.[0]?.title || 'Interview'}
            </h1>
            <p className="text-gray-400 text-sm">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isPreparing && (
              <div className="flex items-center bg-yellow-600 px-3 py-1 rounded-full">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Prepare: {prepareTime}s</span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-red-600 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {stream ? 'Recording' : 'Answering'}
                  </span>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full ${
                  recordingTime <= 10 ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
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

      {/* Question Display */}
      <div className="bg-blue-900/50 border-b border-gray-700 px-6 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-medium mb-4">
            {questions[currentQuestionIndex]}
          </h2>
          {isPreparing && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6 mt-4">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">
                    {prepareTime}
                  </div>
                  <p className="text-yellow-200 text-lg font-medium">
                    Preparation Time Remaining
                  </p>
                </div>
              </div>
              <p className="text-yellow-200 text-sm mb-4">
                Take a moment to think about your answer. Recording will start automatically when the timer reaches zero.
              </p>
              <button
                onClick={skipPreparation}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Skip Preparation & Start Recording Now
              </button>
            </div>
          )}
          {isRecording && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                <p className="text-red-200 font-medium">
                  {stream ? 'Recording your video response...' : 'Recording your audio response...'}
                </p>
              </div>
              
              {/* 녹음 시간 표시 */}
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  recordingTime <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
                }`}>
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
                <p className={`text-sm ${
                  recordingTime <= 10 ? 'text-red-300' : 'text-gray-300'
                }`}>
                  {recordingTime <= 10 ? '⚠️ Recording will stop soon!' : 'Time remaining to answer'}
                </p>
              </div>
              
              {isTranscribing && (
                <p className="text-blue-200 text-sm mt-3 text-center">
                  Converting speech to text...
                </p>
              )}
            </div>
          )}
          {!isPreparing && !isRecording && transcripts[currentQuestionIndex] && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mt-4">
              <h3 className="text-green-200 font-medium mb-2">Your Response:</h3>
              <p className="text-gray-200 text-sm bg-gray-800/50 p-3 rounded">
                {transcripts[currentQuestionIndex]}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1V3H7v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Text-Only Interview Mode</h3>
                  <p className="text-sm text-gray-400">
                    Camera not available. You can still complete the interview by answering questions.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-md">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-yellow-200 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {isPreparing ? 'Preparing to record...' : 
             isRecording ? `Recording (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')} remaining)` : 
             isTranscribing ? 'Converting speech to text...' :
             'Ready to continue'}
          </div>
          
          <div className="flex space-x-4">
            {!isPreparing && !isRecording && !isTranscribing && (
              <button
                onClick={startRecording}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center">
                  {stream ? 'Start Recording' : 'Start Answer'}
                  <span className="ml-2 text-xs opacity-75">(Max 1 min)</span>
                </span>
              </button>
            )}
            
            {isRecording && !isTranscribing && (
              <button
                onClick={stopRecording}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {stream ? 'Stop Recording' : 'Finish Answer'}
              </button>
            )}
            
            {isTranscribing && (
              <div className="flex items-center px-4 py-2 bg-blue-600/50 text-white rounded-md">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Processing Audio...
              </div>
            )}
            
            {!isPreparing && !isRecording && !isCompleted && !isTranscribing && (
              <button
                onClick={nextQuestion}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-lg w-full mx-4">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">Interview Completed!</h3>
              <p className="text-gray-300 mb-4">
                You've answered all {questions.length} questions successfully.
              </p>
              
              {/* Transcripts Summary */}
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                <h4 className="text-blue-200 font-medium mb-2">Voice Analysis Summary</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Questions answered:</span>
                    <span className="text-green-400">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice responses recorded:</span>
                    <span className="text-green-400">{Object.keys(transcripts).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speech-to-text conversion:</span>
                    <span className="text-green-400">Completed</span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-6">
                Your responses have been recorded and converted to text for analysis. 
                The interviewer will review your answers and provide feedback.
              </p>
              
              <button
                onClick={submitInterview}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Interview & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 