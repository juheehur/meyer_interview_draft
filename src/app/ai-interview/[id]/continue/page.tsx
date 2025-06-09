"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InterviewContinuePage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  useEffect(() => {
    // continue는 conduct와 동일한 로직이므로 리다이렉트
    router.replace(`/ai-interview/${interviewId}/conduct`);
  }, [interviewId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Redirecting to interview...</p>
      </div>
    </div>
  );
} 