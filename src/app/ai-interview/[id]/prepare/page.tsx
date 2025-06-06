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

export default function InterviewPreparePage() {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [skipMediaTest, setSkipMediaTest] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  useEffect(() => {
    const checkAccess = async () => {
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
      
      if (data.status !== 'pending') {
        router.replace(`/ai-interview/${interviewId}/continue`);
        return;
      }
      
      setInterview(data);
      setLoading(false);
    };
    
    checkAccess();
  }, [interviewId, router]);

  const requestCameraPermission = async () => {
    try {
      // 먼저 사용 가능한 미디어 장치를 확인
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      console.log('Available devices:', { videoDevices: videoDevices.length, audioDevices: audioDevices.length });

      // 장치가 없는 경우 더 명확한 메시지 제공
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        setError('No camera or microphone found. Please connect a camera and microphone and try again.');
        return;
      }

      // 단계별로 권한 요청 (더 나은 오류 진단을 위해)
      let constraints: MediaStreamConstraints = {};
      
      if (videoDevices.length > 0) {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        };
      }

      if (audioDevices.length > 0) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true
        };
      }

      // Fallback: 장치가 부분적으로만 있는 경우
      if (videoDevices.length === 0) {
        constraints.video = false;
        console.warn('No video device found, proceeding with audio only');
      }

      if (audioDevices.length === 0) {
        constraints.audio = false;
        console.warn('No audio device found, proceeding with video only');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // 실제로 얻은 트랙을 확인
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks();
      
      setCameraReady(videoTracks.length > 0);
      setMicReady(audioTracks.length > 0);
      
      if (videoTracks.length === 0 && audioTracks.length === 0) {
        setError('Unable to access any media devices. Please check your device connections.');
      } else if (videoTracks.length === 0) {
        setError('Camera not available, but microphone is ready. You can proceed with audio-only interview.');
      } else if (audioTracks.length === 0) {
        setError('Microphone not available, but camera is ready. You can proceed with video-only interview.');
      } else {
        setError('');
      }
      
    } catch (err: any) {
      console.error('Media access error:', err);
      
      // 구체적인 오류 타입별 메시지
      switch (err.name) {
        case 'NotFoundError':
          setError('Camera or microphone not found. Please ensure your devices are connected and try again. If using a laptop, check if external cameras are properly connected.');
          break;
        case 'NotAllowedError':
          setError('Camera and microphone access denied. Please click the camera icon in your browser\'s address bar and allow access, then refresh the page.');
          break;
        case 'NotReadableError':
          setError('Camera or microphone is being used by another application. Please close other applications that might be using your camera/microphone and try again.');
          break;
        case 'OverconstrainedError':
          setError('Camera resolution not supported. Trying with basic settings...');
          // 기본 설정으로 재시도
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({ 
              video: true, 
              audio: true 
            });
            setStream(basicStream);
            if (videoRef.current) {
              videoRef.current.srcObject = basicStream;
            }
            setCameraReady(true);
            setMicReady(true);
            setError('');
          } catch (retryErr) {
            setError('Unable to access camera and microphone with basic settings. Please check your device permissions.');
          }
          break;
        case 'AbortError':
          setError('Media access request was interrupted. Please try again.');
          break;
        default:
          setError(`Media access error: ${err.message || 'Unknown error'}. Please check your device connections and browser permissions.`);
      }
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startInterview = async () => {
    try {
      // 인터뷰 상태를 in_progress로 변경
      const { error } = await supabase
        .from('interviews')
        .update({ status: 'in_progress' })
        .eq('id', interviewId);
      
      if (error) {
        throw error;
      }
      
      // 스트림은 유지하고 인터뷰 화면으로 이동
      router.push(`/ai-interview/${interviewId}/conduct`);
    } catch (err) {
      setError('Failed to start interview. Please try again.');
      console.error('Start interview error:', err);
    }
  };

  const handleSkipMediaTest = () => {
    setSkipMediaTest(true);
    setCameraReady(false);
    setMicReady(false);
    setError('');
  };

  useEffect(() => {
    // 컴포넌트 언마운트 시 스트림 정리
    return () => {
      stopStream();
    };
  }, [stream]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">Interview not found</h2>
          <p className="text-gray-500">This interview may have been completed or cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Interview Preparation
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            {interview.jobs?.[0]?.title || 'Interview'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Test Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Camera & Microphone Test
            </h2>
            
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {cameraReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Camera preview will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {!cameraReady && !skipMediaTest && (
                <button
                  onClick={requestCameraPermission}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Test Camera & Microphone
                </button>
              )}

              {!cameraReady && !skipMediaTest && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSkipMediaTest}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Skip Camera Test
                  </button>
                </div>
              )}

              {skipMediaTest && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Camera test skipped. The interview will proceed without video recording. You can still answer questions using text or audio if available.
                    </p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {error.includes('NotFoundError') && (
                    <div className="mt-2">
                      <button
                        onClick={handleSkipMediaTest}
                        className="text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
                      >
                        Skip camera test and continue without video
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${cameraReady ? 'bg-green-500' : skipMediaTest ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                  <span className={`text-sm ${cameraReady ? 'text-green-600 dark:text-green-400' : skipMediaTest ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}`}>
                    Camera {cameraReady ? 'Ready' : skipMediaTest ? 'Skipped' : 'Not Ready'}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${micReady ? 'bg-green-500' : skipMediaTest ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                  <span className={`text-sm ${micReady ? 'text-green-600 dark:text-green-400' : skipMediaTest ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}`}>
                    Microphone {micReady ? 'Ready' : skipMediaTest ? 'Skipped' : 'Not Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Interview Instructions
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                  Before we begin:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Make sure you're in a quiet, well-lit environment</li>
                  <li>• Position yourself facing the camera directly</li>
                  <li>• Speak clearly and maintain eye contact with the camera</li>
                  <li>• Have your resume and documents ready for reference</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Interview Format:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Questions will appear at the top of the screen</li>
                  <li>• You'll have 30 seconds to prepare before recording starts</li>
                  <li>• <strong>Each answer is limited to 1 minute maximum</strong></li>
                  <li>• Recording will stop automatically after 1 minute</li>
                  <li>• You can stop recording early if you finish your answer</li>
                  <li>• Answer each question naturally and comprehensively</li>
                </ul>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">
                  Technical Requirements:
                </h3>
                <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                  <li>• Stable internet connection</li>
                  <li>• Chrome, Firefox, or Safari browser</li>
                  <li>• Camera and microphone permissions enabled</li>
                  <li>• Desktop or laptop recommended</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Go Back
          </button>
          
          <button
            onClick={startInterview}
            disabled={!cameraReady && !micReady && !skipMediaTest}
            className={`px-8 py-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              (cameraReady && micReady) || skipMediaTest
                ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {(cameraReady && micReady) ? 'Start Interview' : 
             skipMediaTest ? 'Start Interview (No Video)' : 
             'Complete Setup First'}
          </button>
        </div>
      </div>
    </div>
  );
} 