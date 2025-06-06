"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 비밀번호 확인 체크
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // 어드민 이메일로 가입 방지
    if (email.endsWith('@admin.com')) {
      setError('Admin accounts cannot be created through registration');
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    
    // 회원가입 성공 시 users 테이블에도 사용자 정보 저장
    if (data.user) {
      try {
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: 'user',
              status: 'active',
              created_at: new Date().toISOString(),
              last_sign_in_at: null,
            }
          ]);

        if (dbError) {
          console.error('Error inserting user data:', dbError);
          // 사용자 테이블 저장 실패 시에도 가입은 완료된 상태이므로 계속 진행
        }
        
        // 이메일 확인이 필요한 경우
        if (!data.session) {
          alert('Please check your email for verification link');
        }
        router.push('/my-interviews');
      } catch (dbError) {
        console.error('Error saving user to database:', dbError);
        // 데이터베이스 오류가 있어도 가입은 완료된 상태이므로 계속 진행
        if (!data.session) {
          alert('Please check your email for verification link');
        }
        router.push('/my-interviews');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Sign Up</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-300 mb-6">
          Create your account to get started
        </p>
        
        <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This registration is for general users only. Admin accounts are created separately.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#023da6] text-white py-2 rounded-md hover:bg-[#034bb8] focus:outline-none focus:ring-2 focus:ring-[#023da6] mt-2 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            ) : null}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#023da6] hover:text-[#034bb8] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 