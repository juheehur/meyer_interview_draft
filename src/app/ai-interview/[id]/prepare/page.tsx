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
      
      console.log('Media stream obtained:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });
      
      // 비디오 트랙 상세 정보 로깅
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks();
      
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        console.log('Video track details:', {
          label: videoTrack.label,
          kind: videoTrack.kind,
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          settings: videoTrack.getSettings()
        });
      }
      
      setStream(mediaStream);
      
      console.log('VideoRef status:', {
        videoRefExists: !!videoRef.current,
        cameraReady: cameraReady,
        streamTracks: mediaStream.getTracks().length
      });
      
      // 실제로 얻은 트랙을 확인
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

  // 카메라가 준비되고 스트림이 있을 때 비디오 요소에 연결
  useEffect(() => {
    if (cameraReady && stream && videoRef.current) {
      console.log('Connecting stream to video element...');
      const videoElement = videoRef.current;
      
      console.log('Video element state:', {
        nodeName: videoElement.nodeName,
        readyState: videoElement.readyState,
        networkState: videoElement.networkState
      });
      
      // 스트림 연결
      videoElement.srcObject = stream;
      
      // 비디오 재생 함수
      const playVideo = async () => {
        try {
          console.log('Attempting to play video...');
          console.log('Video element state:', {
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            readyState: videoElement.readyState,
            paused: videoElement.paused,
            srcObject: !!videoElement.srcObject
          });
          await videoElement.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.warn('Video play failed:', playError);
          
          // 사용자 상호작용 후 재시도
          const retryPlay = () => {
            videoElement.play().then(() => {
              console.log('Video playing after user interaction');
            }).catch(e => console.warn('Retry play failed:', e));
          };
          
          document.addEventListener('click', retryPlay, { once: true });
        }
      };
      
      // 이벤트 리스너들
      videoElement.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        console.log('Video dimensions:', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight
        });
        playVideo();
      };
      
      videoElement.oncanplay = () => {
        console.log('Video can play');
        playVideo();
      };
      
      videoElement.onplaying = () => {
        console.log('Video is playing!');
      };
      
      videoElement.onerror = (e) => {
        console.error('Video element error:', e);
      };
      
      // 약간의 지연 후 재생 시도
      setTimeout(() => {
        if (videoElement.readyState >= 2) {
          playVideo();
        }
      }, 100);
    }
  }, [cameraReady, stream]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-[#023da6]/10 text-[#023da6] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Interview Preparation
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white mb-4">
            Ready to Start Your
            <span className="block font-medium text-[#023da6] mt-2">Interview Journey?</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {interview.jobs?.[0]?.title || 'Interview'} • Final Preparation Step
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Camera Test Section */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Camera & Microphone Test
                </h2>
                {cameraReady && micReady && (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    All Systems Ready
                  </div>
                )}
              </div>
              
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl overflow-hidden relative border-2 border-gray-200/50 dark:border-gray-600/50">
                {cameraReady ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {/* 디버그 정보 오버레이 */}
                    <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm space-y-1">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                        Live
                      </div>
                      <div>V{stream?.getVideoTracks().length || 0} / A{stream?.getAudioTracks().length || 0}</div>
                      {videoRef.current && (
                        <div>
                          {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
                        </div>
                      )}
                    </div>
                    {/* 클릭 시 재생 유도 */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                      <button 
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.play().catch(console.warn);
                          }
                        }}
                        className="bg-white/90 text-gray-900 px-6 py-3 rounded-2xl text-sm font-medium hover:bg-white transition-colors backdrop-blur-sm"
                      >
                        Ensure Video Plays
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                        Camera Preview
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Your video will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 space-y-4">
                {!cameraReady && !skipMediaTest && (
                  <button
                    onClick={requestCameraPermission}
                    className="w-full bg-[#023da6] hover:bg-[#034bb8] text-white py-4 px-6 rounded-2xl text-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    Test Camera & Microphone
                  </button>
                )}

                {!cameraReady && !skipMediaTest && (
                  <button
                    onClick={handleSkipMediaTest}
                    className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-2xl text-base font-medium transition-all duration-300"
                  >
                    Skip Camera Test
                  </button>
                )}

                {skipMediaTest && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-2xl">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-amber-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Camera test skipped. Interview will proceed with audio or text responses.
                      </p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 rounded-r-2xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    {error.includes('NotFoundError') && (
                      <div className="mt-2">
                        <button
                          onClick={handleSkipMediaTest}
                          className="text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
                        >
                          Skip camera test and continue
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Status Indicators */}
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${cameraReady ? 'bg-green-500' : skipMediaTest ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${cameraReady ? 'text-green-600 dark:text-green-400' : skipMediaTest ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                      Camera {cameraReady ? 'Ready' : skipMediaTest ? 'Skipped' : 'Not Ready'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${micReady ? 'bg-green-500' : skipMediaTest ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${micReady ? 'text-green-600 dark:text-green-400' : skipMediaTest ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                      Microphone {micReady ? 'Ready' : skipMediaTest ? 'Skipped' : 'Not Ready'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Interview Guide
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#023da6] mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Before we begin
                  </h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Make sure you're in a quiet, well-lit environment
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Position yourself facing the camera directly
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Speak clearly and maintain eye contact
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Have your resume ready for reference
                    </li>
                  </ul>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-[#023da6] mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    Interview Format
                  </h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      30 seconds to prepare before recording
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      <span><strong className="text-gray-900 dark:text-white">1 minute maximum</strong> per answer</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      You can stop recording early if finished
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Answer naturally and comprehensively
                    </li>
                  </ul>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-[#023da6] mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Technical Requirements
                  </h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Stable internet connection
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Modern browser (Chrome, Firefox, Safari)
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#023da6] mr-2">•</span>
                      Desktop or laptop recommended
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-medium transition-all duration-300"
          >
            Go Back
          </button>
          
          <button
            onClick={startInterview}
            disabled={!cameraReady && !micReady && !skipMediaTest}
            className={`px-10 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 ${
              (cameraReady && micReady) || skipMediaTest
                ? 'bg-gradient-to-r from-[#023da6] to-blue-600 hover:from-[#034bb8] hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {(cameraReady && micReady) ? 'Start Interview' : 
             skipMediaTest ? 'Start Interview (Audio Only)' : 
             'Complete Setup First'}
          </button>
        </div>
      </div>
    </div>
  );
} 