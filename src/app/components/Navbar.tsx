"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // 어드민 여부 판별 (예: email, metadata, role 등)
      if (user && user.email && user.email.endsWith('@admin.com')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };
    
    getUser();
    
    // 로그인/로그아웃 시 실시간 반영
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user && session.user.email && session.user.email.endsWith('@admin.com')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black dark:bg-black backdrop-blur-xl border-b border-white/20 dark:border-[#023da6]/30 shadow-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between h-20">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#023da6] via-blue-400 to-white flex items-center justify-center shadow-xl border-2 border-white/40 group-hover:scale-110 transition-transform duration-300">
              <Image src="/images/meyer-logo-footer.png" alt="Meyer Logo" width={32} height={32} className="object-contain" />
            </div>
            <span className="ml-2 text-xl font-extrabold tracking-tight text-white drop-shadow-lg group-hover:text-[#023da6] transition-colors duration-300">
              MEYER
              <span className="ml-1 font-light text-blue-100/80 group-hover:text-blue-300 transition-colors">INDUSTRIES</span>
            </span>
          </Link>
        </div>
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-2 lg:gap-6">
          <Link
            href="/"
            className="relative px-4 py-2 text-base font-medium text-white hover:text-[#023da6] transition-colors duration-200 group"
          >
            <span className="relative z-10">Home</span>
            <span className="absolute left-1/2 -bottom-1 w-0 group-hover:w-3/4 h-0.5 bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transition-all duration-300 -translate-x-1/2"></span>
          </Link>
          <Link
            href="/jobs"
            className="relative px-4 py-2 text-base font-medium text-white hover:text-[#023da6] transition-colors duration-200 group"
          >
            <span className="relative z-10">Jobs</span>
            <span className="absolute left-1/2 -bottom-1 w-0 group-hover:w-3/4 h-0.5 bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transition-all duration-300 -translate-x-1/2"></span>
          </Link>
          <Link
            href="/ai-interview"
            className="relative px-4 py-2 text-base font-medium text-white hover:text-[#023da6] transition-colors duration-200 group"
          >
            <span className="relative z-10">AI Interview</span>
            <span className="absolute left-1/2 -bottom-1 w-0 group-hover:w-3/4 h-0.5 bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transition-all duration-300 -translate-x-1/2"></span>
          </Link>
          {/* 로그인한 참여자만 My Interviews 노출 */}
          {user && !isAdmin && (
            <Link
              href="/my-interviews"
              className="relative px-4 py-2 text-base font-medium text-white hover:text-[#023da6] transition-colors duration-200 group"
            >
              <span className="relative z-10">My Interviews</span>
              <span className="absolute left-1/2 -bottom-1 w-0 group-hover:w-3/4 h-0.5 bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transition-all duration-300 -translate-x-1/2"></span>
            </Link>
          )}
          {/* 어드민만 Admin 메뉴 노출 */}
          {user && isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-[#023da6] hover:bg-[#012766] transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#023da6] focus:ring-offset-2"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Admin
            </Link>
          )}
        </div>
        {/* Auth Buttons - 항상 표시되도록 개선 */}
        <div className="flex items-center">
          {loading ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-white">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Loading...
            </div>
          ) : user ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-[#023da6] hover:bg-[#012766] transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#023da6] focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 