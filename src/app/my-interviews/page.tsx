"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Interview {
  id: string;
  job_id: string;
  status: string;
  notes?: string;
  jobs: { title: string }[];
  created_at: string;
}

export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.email && user.email.endsWith('@admin.com')) {
        router.replace('/admin');
        return;
      }
      // 본인 인터뷰만 조회
      const { data, error } = await supabase
        .from('interviews')
        .select('id, job_id, status, notes, created_at, jobs(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setInterviews(data || []);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">My Interviews</h1>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : interviews.length === 0 ? (
        <p className="text-gray-500">No interviews found.</p>
      ) : (
        <div className="space-y-4">
          {interviews.map((iv) => (
            <div key={iv.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800 dark:text-white">{iv.jobs?.[0]?.title || '-'}</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{iv.status}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">Created: {new Date(iv.created_at).toLocaleDateString()}</div>
              {iv.notes && (
                <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  <b>Questions:</b>
                  <ul className="list-disc ml-5 mt-1">
                    {(() => {
                      try {
                        return JSON.parse(iv.notes).map((q: string, idx: number) => <li key={idx}>{q}</li>);
                      } catch {
                        return <li>{iv.notes}</li>;
                      }
                    })()}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 