'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Interview {
  id: string;
  user_id: string;
  job_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'hired' | 'rejected';
  created_at: string;
  updated_at: string;
  notes?: string;
  users: {
    email: string;
  };
  jobs: {
    title: string;
  };
}

interface User {
  id: string;
  email: string;
}

interface Job {
  id: string;
  title: string;
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingInterview, setViewingInterview] = useState<Interview | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    job_id: '',
    status: 'pending' as Interview['status'],
    notes: '',
    language: 'en',
  });
  const [resumeText, setResumeText] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditQuestionsModalOpen, setIsEditQuestionsModalOpen] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<string[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isHRAnalysisModalOpen, setIsHRAnalysisModalOpen] = useState(false);
  const [hrAnalysis, setHRAnalysis] = useState<any>(null);
  const [hrAnalysisLoading, setHRAnalysisLoading] = useState(false);
  const [selectedHRInterview, setSelectedHRInterview] = useState<Interview | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedDecisionInterview, setSelectedDecisionInterview] = useState<Interview | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('accepted');
  const [feedback, setFeedback] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  useEffect(() => {
    fetchInterviews();
    fetchUsers();
    fetchJobs();
  }, []);

  const fetchInterviews = async () => {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        users(email),
        jobs(title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching interviews:', JSON.stringify(error, null, 2));
    } else {
      setInterviews(data || []);
    }
  };

  const fetchUsers = async () => {
    console.log('🔍 Fetching users for interview candidate selection...');
    
    try {
      // First, sync auth users to users table to ensure all users exist
      console.log('🔄 Syncing users to ensure foreign key integrity...');
      try {
        const syncResponse = await fetch('/api/admin/users/sync', { method: 'POST' });
        const syncResult = await syncResponse.json();
        if (syncResponse.ok) {
          console.log(`✅ Synced ${syncResult.syncedCount} users automatically`);
        } else {
          console.log('⚠️ Sync failed:', syncResult.error);
        }
      } catch (syncError) {
        console.log('⚠️ Auto-sync failed:', syncError);
      }
      
      // Now get users from our users table (guaranteed to exist for foreign key)
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('role', 'user')
        .eq('status', 'active')
        .order('email');

      console.log('📊 Users from database after sync:', users);
      
      if (error) {
        console.error('❌ Error fetching users:', error);
        setUsers([]);
        return;
      }

      // Filter out admin users (double check)
      const candidateUsers = (users || []).filter(user => {
        const isAdmin = user.email?.endsWith('@admin.com') || user.role === 'admin';
        if (isAdmin) {
          console.log('🚫 Filtering out admin user:', user.email);
          return false;
        }
        return true;
      });
      
      console.log('✅ Final candidate list (guaranteed to exist in DB):', candidateUsers);
      setUsers(candidateUsers.map(user => ({ id: user.id, email: user.email })));
      
    } catch (error) {
      console.error('💥 Critical error in fetchUsers:', error);
      setUsers([]);
    }
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('status', 'active')
      .order('title');

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingInterview) {
      // Update existing interview
      const { error } = await supabase
        .from('interviews')
        .update(formData)
        .eq('id', editingInterview.id);

      if (error) {
        console.error('Error updating interview:', error);
        alert('Error updating interview: ' + error.message);
      } else {
        fetchInterviews();
        resetForm();
      }
    } else {
      // Create new interview via API (GPT 질문 자동 생성)
      setIsCreating(true);
      try {
        const finalLanguage = formData.language === 'custom' ? customLanguage : formData.language;
        const res = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: formData.user_id,
            job_id: formData.job_id,
            resume_text: resumeText,
            language: finalLanguage,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create interview');
        }
        fetchInterviews();
        resetForm();
      } catch (error: any) {
        alert('Error creating interview: ' + error.message);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleStatusUpdate = async (interview: Interview, newStatus: Interview['status']) => {
    const { error } = await supabase
      .from('interviews')
      .update({ status: newStatus })
      .eq('id', interview.id);

    if (error) {
      console.error('Error updating interview status:', error);
      alert('Error updating interview status: ' + error.message);
    } else {
      fetchInterviews();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to cancel this interview?')) {
      const { error } = await supabase
        .from('interviews')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        console.error('Error cancelling interview:', error);
        alert('Error cancelling interview: ' + error.message);
      } else {
        fetchInterviews();
      }
    }
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    
    // 기존 notes에서 언어 정보 추출
    let existingLanguage = 'en'; // 기본값을 영어로 변경
    if (interview.notes) {
      try {
        const parsedNotes = JSON.parse(interview.notes);
        if (parsedNotes.language) {
          existingLanguage = parsedNotes.language;
        }
      } catch {
        // JSON 파싱 실패 시 기본값 사용
      }
    }
    
    // 미리 정의된 언어 옵션들
    const predefinedLanguages = ['en', 'th', 'yue', 'zh', 'ko'];
    
    if (predefinedLanguages.includes(existingLanguage)) {
      setFormData({
        user_id: interview.user_id,
        job_id: interview.job_id,
        status: interview.status,
        notes: interview.notes || '',
        language: existingLanguage,
      });
      setCustomLanguage('');
    } else {
      // 직접입력된 언어인 경우
      setFormData({
        user_id: interview.user_id,
        job_id: interview.job_id,
        status: interview.status,
        notes: interview.notes || '',
        language: 'custom',
      });
      setCustomLanguage(existingLanguage);
    }
    
    setIsModalOpen(true);
  };

  const handleView = (interview: Interview) => {
    setViewingInterview(interview);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      job_id: '',
      status: 'pending',
      notes: '',
      language: 'en',
    });
    setResumeText('');
    setCustomLanguage('');
    setIsModalOpen(false);
    setEditingInterview(null);
  };

  const getStatusBadgeColor = (status: Interview['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: Interview['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'hired':
        return 'Hired';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // PDF 파일에서 텍스트 추출 함수
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    try {
      // pdfjs-dist를 동적으로 import (브라우저에서만)
      const pdfjsLib = await import('pdfjs-dist') as any;
      // workerSrc 명시적으로 설정
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      setResumeText(text);
    } catch (err) {
      alert('PDF 텍스트 추출에 실패했습니다.');
    }
    setPdfLoading(false);
  };

  const saveQuestions = async () => {
    if (!viewingInterview || editingQuestions.length === 0) return;
    
    setIsSavingQuestions(true);
    try {
      // 기존 notes를 파싱해서 다른 데이터 보존
      let existingData = {};
      if (viewingInterview.notes) {
        try {
          existingData = JSON.parse(viewingInterview.notes);
        } catch {
          // JSON이 아니면 빈 객체로 시작
        }
      }

      // 새로운 질문으로 업데이트
      const updatedData = {
        ...existingData,
        questions: editingQuestions
      };

      const { error } = await supabase
        .from('interviews')
        .update({ notes: JSON.stringify(updatedData) })
        .eq('id', viewingInterview.id);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      const updatedInterview = { 
        ...viewingInterview, 
        notes: JSON.stringify(updatedData) 
      };
      setViewingInterview(updatedInterview);
      
      // 인터뷰 목록도 업데이트
      setInterviews(prev => 
        prev.map(interview => 
          interview.id === viewingInterview.id 
            ? updatedInterview 
            : interview
        )
      );

      setIsEditQuestionsModalOpen(false);
      alert('Questions updated successfully!');
    } catch (error) {
      console.error('Error saving questions:', error);
      alert('Failed to save questions. Please try again.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const openEditQuestions = (interview: Interview) => {
    // 언어별 기본 질문 가져오기
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

    let interviewLanguage = 'en'; // 기본값
    let defaultQuestion = getDefaultQuestion('en');

    try {
      if (interview.notes) {
        const data = JSON.parse(interview.notes);
        
        // 언어 정보 추출
        if (data.language) {
          interviewLanguage = data.language;
          defaultQuestion = getDefaultQuestion(interviewLanguage);
        }
        
        // 질문 배열 추출
        if (data.questions) {
          setEditingQuestions([...data.questions]);
        } else if (Array.isArray(data)) {
          setEditingQuestions([...data]);
        } else {
          setEditingQuestions([defaultQuestion]);
        }
      } else {
        setEditingQuestions([defaultQuestion]);
      }
    } catch {
      setEditingQuestions([defaultQuestion]);
    }
    setViewingInterview(interview);
    setIsEditQuestionsModalOpen(true);
  };

  const addQuestion = () => {
    setEditingQuestions(prev => [...prev, '']);
  };

  const removeQuestion = (index: number) => {
    setEditingQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, value: string) => {
    setEditingQuestions(prev => 
      prev.map((question, i) => i === index ? value : question)
    );
  };

  const viewHRAnalysis = async (interview: Interview) => {
    setSelectedHRInterview(interview);
    setHRAnalysisLoading(true);
    setIsHRAnalysisModalOpen(true);

    try {
      // First, try to get existing analysis
      const response = await fetch(`/api/interviews/${interview.id}/analyze`);
      
      if (response.ok) {
        const data = await response.json();
        setHRAnalysis(data.analysis);
      } else if (response.status === 404) {
        // No analysis exists, generate new one
        const analyzeResponse = await fetch(`/api/interviews/${interview.id}/analyze`, {
          method: 'POST'
        });
        
        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          setHRAnalysis(analyzeData.analysis);
        } else {
          const errorData = await analyzeResponse.json();
          alert(`Failed to generate analysis: ${errorData.error}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fetching HR analysis:', error);
      alert('Failed to load HR analysis. Please try again.');
    } finally {
      setHRAnalysisLoading(false);
    }
  };

  const closeHRAnalysis = () => {
    setIsHRAnalysisModalOpen(false);
    setSelectedHRInterview(null);
    setHRAnalysis(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const makeDecision = (interview: Interview) => {
    setSelectedDecisionInterview(interview);
    setIsDecisionModalOpen(true);
  };

  const closeDecision = () => {
    setIsDecisionModalOpen(false);
    setSelectedDecisionInterview(null);
  };

  const submitDecision = async (decision: 'accepted' | 'rejected', feedback: string, adminNotes: string) => {
    if (!selectedDecisionInterview) return;

    setDecisionLoading(true);
    try {
      const response = await fetch(`/api/interviews/${selectedDecisionInterview.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          feedback,
          admin_notes: adminNotes
        }),
      });

      if (response.ok) {
        // Refresh interviews list
        fetchInterviews();
        closeDecision();
        alert(`Interview ${decision === 'accepted' ? 'approved' : 'rejected'} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      alert('Failed to submit decision. Please try again.');
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Interview Management</h3>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#023da6] hover:bg-[#034bb8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023da6] transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Interview
        </button>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Candidate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Job Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No interview data found.
                  </td>
                </tr>
              ) : (
                interviews.map((interview) => (
                  <tr key={interview.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {interview.users?.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {interview.jobs?.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(interview.status)}`}>
                        {getStatusText(interview.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(interview.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleView(interview)}
                        className="text-[#023da6] hover:text-[#034bb8] dark:text-[#034bb8] dark:hover:text-[#023da6] mr-4"
                      >
                        View
                      </button>
                      {interview.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => viewHRAnalysis(interview)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                        >
                          HR Analysis
                        </button>
                      )}
                      {interview.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => makeDecision(interview)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-4"
                        >
                          Make Decision
                        </button>
                      )}
                      {interview.status === 'pending' && interview.notes && (
                        <button
                          type="button"
                          onClick={() => openEditQuestions(interview)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-4"
                        >
                          Edit Questions
                        </button>
                      )}
                      {interview.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(interview, 'in_progress')}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                        >
                          Start
                        </button>
                      )}
                      {interview.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(interview, 'completed')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(interview)}
                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(interview.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingInterview ? 'Edit Interview' : 'Create New Interview'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Candidate
                  </label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select a candidate</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Position
                  </label>
                  <select
                    value={formData.job_id}
                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select a job position</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Interview['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add any notes about the interview..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interview Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => {
                      setFormData({ ...formData, language: e.target.value });
                      if (e.target.value !== 'custom') {
                        setCustomLanguage('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="en">영어 (English) - 기본</option>
                    <option value="th">태국어 (Thai)</option>
                    <option value="yue">광동어 (Cantonese)</option>
                    <option value="zh">중국어 (Chinese)</option>
                    <option value="ko">한국어 (Korean)</option>
                    <option value="custom">직접입력</option>
                  </select>
                  {formData.language === 'custom' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        placeholder="언어 코드를 입력하세요 (예: ja, fr, de, es...)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        OpenAI Whisper 지원 언어 코드를 입력하세요 (ISO 639-1 형식)
                      </p>
                    </div>
                  )}
                </div>

                {/* Resume PDF 업로드 및 텍스트 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resume PDF (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {pdfLoading && <p className="text-xs text-gray-500">Extracting text from PDF...</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resume Text (optional, auto-filled from PDF)
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Paste or edit resume text here..."
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    className={`flex-1 bg-[#023da6] text-white px-4 py-2 rounded-md hover:bg-[#034bb8] focus:outline-none focus:ring-2 focus:ring-[#023da6] flex items-center justify-center ${isCreating ? 'opacity-60 cursor-not-allowed' : ''}`}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      editingInterview ? 'Update' : 'Create'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingInterview && (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 overflow-hidden z-50">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Interview Details
                </h2>
              </div>
              {viewingInterview.status === 'completed' && (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    alert('Video playback feature will be added in future updates');
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Recording
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Left Sidebar - Interview Info */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</div>
                  <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${getStatusBadgeColor(viewingInterview.status)}`}>
                    {getStatusText(viewingInterview.status)}
                  </span>
                </div>

                {/* Candidate Info */}
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Candidate</div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {viewingInterview.users?.email || '-'}
                    </div>
                  </div>
                </div>

                {/* Job Info */}
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Position</div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {viewingInterview.jobs?.title || '-'}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Interview Timeline</div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Created</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(viewingInterview.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(viewingInterview.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Questions */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-6">
                {/* Questions Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {viewingInterview.status === 'completed' ? '📝 Interview Results' : '❓ Interview Questions'}
                  </h3>
                  {viewingInterview.status !== 'completed' && (
                    <button
                      onClick={() => openEditQuestions(viewingInterview)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Questions
                    </button>
                  )}
                </div>

                {/* Questions Content */}
                <div className="space-y-6">
                  {viewingInterview.notes && (() => {
                    try {
                      const interviewData = JSON.parse(viewingInterview.notes);
                      
                      // 새로운 형식 (questions + transcripts)
                      if (interviewData.questions && interviewData.transcripts) {
                        return (
                          <>
                            {/* Status Banner */}
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                                    ✅ Interview Completed Successfully
                                  </h3>
                                  <p className="text-sm text-green-700 dark:text-green-300">
                                    All questions answered with speech-to-text analysis completed
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Questions Grid */}
                            <div className="grid grid-cols-1 gap-6">
                              {interviewData.questions.map((question: string, index: number) => (
                                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                                  <div className="p-6">
                                    <div className="flex items-start space-x-4">
                                      <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                                          {index + 1}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 leading-relaxed">
                                          {question}
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                          <div className="flex items-center mb-3">
                                            <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.444l-3.5 2.18c-.371.231-.85-.101-.85-.492V13.5A8 8 0 1121 12z" />
                                            </svg>
                                            <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                                              Candidate's Response:
                                            </span>
                                          </div>
                                          <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {interviewData.transcripts[index] || (
                                              <span className="text-gray-500 italic">No response recorded</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Completion Time */}
                            {interviewData.completed_at && (
                              <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-center">
                                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-base font-medium text-blue-800 dark:text-blue-200">
                                    Completed: {new Date(interviewData.completed_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }
                      
                      // 기존 형식 (질문만 있는 경우)
                      else if (Array.isArray(interviewData)) {
                        return (
                          <>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
                              <div className="flex items-center">
                                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
                                  📋 Interview Questions Ready
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              {interviewData.map((question, index) => (
                                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                                  <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                      <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                                        {index + 1}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xl text-gray-900 dark:text-white leading-relaxed">
                                        {question}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      }
                      
                      // 새로운 형식에서 질문만 있는 경우
                      else if (interviewData.questions) {
                        return (
                          <>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
                              <div className="flex items-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="text-lg font-medium text-blue-800 dark:text-blue-200">
                                  🤖 AI Generated Questions
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              {interviewData.questions.map((question: string, index: number) => (
                                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                                  <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                      <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                                        {index + 1}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xl text-gray-900 dark:text-white leading-relaxed">
                                        {question}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      }
                      
                      return null;
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Questions Modal */}
      {isEditQuestionsModalOpen && viewingInterview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Edit Interview Questions
                </h3>
                <button
                  onClick={() => setIsEditQuestionsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSavingQuestions}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Job: <span className="font-medium">{viewingInterview.jobs?.title}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Candidate: <span className="font-medium">{viewingInterview.users?.email}</span>
                </p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {editingQuestions.map((question, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder={`Question ${index + 1}...`}
                        disabled={isSavingQuestions}
                      />
                    </div>
                    {editingQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        disabled={isSavingQuestions}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  disabled={isSavingQuestions}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Question
                </button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {editingQuestions.length} question{editingQuestions.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={saveQuestions}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isSavingQuestions || editingQuestions.some(q => !q.trim())}
                >
                  {isSavingQuestions ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Questions'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditQuestionsModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  disabled={isSavingQuestions}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HR Analysis Modal */}
      {isHRAnalysisModalOpen && selectedHRInterview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  HR Analysis
                </h3>
                <button
                  onClick={closeHRAnalysis}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={hrAnalysisLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Job: <span className="font-medium">{selectedHRInterview.jobs?.title}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Candidate: <span className="font-medium">{selectedHRInterview.users?.email}</span>
                </p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {hrAnalysisLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Analyzing interview...</p>
                  </div>
                ) : hrAnalysis ? (
                  <div className="space-y-6">
                    {/* Overall Score and Recommendation */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Overall Score
                        </span>
                        <span className={`text-xl font-bold ${getScoreColor(hrAnalysis.overall_assessment?.overall_score || 0)}`}>
                          {hrAnalysis.overall_assessment?.overall_score || 0}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hrAnalysis.overall_assessment?.recommendation || 'No recommendation available'}
                      </p>
                    </div>

                    {/* HR Highlights */}
                    {hrAnalysis.hr_highlights && hrAnalysis.hr_highlights.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Key Highlights for HR Review
                        </h4>
                        <div className="space-y-2">
                          {hrAnalysis.hr_highlights.map((highlight: any, index: number) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                highlight.category === 'strength' ? 'bg-green-500' : 
                                highlight.category === 'concern' ? 'bg-red-500' : 'bg-blue-500'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                  {highlight.timestamp}
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                  {highlight.highlight}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills Summary */}
                    {hrAnalysis.skills && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Skills Assessment
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {hrAnalysis.skills.technical && hrAnalysis.skills.technical.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Technical Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {hrAnalysis.skills.technical.map((skill: string, index: number) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 text-xs">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {hrAnalysis.skills.soft && hrAnalysis.skills.soft.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Soft Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {hrAnalysis.skills.soft.map((skill: string, index: number) => (
                                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 text-xs">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Communication Analysis */}
                    {hrAnalysis.language_analysis && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Communication Quality
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className={`text-lg font-bold ${getScoreColor(hrAnalysis.language_analysis.clarity_score / 10)}`}>
                              {hrAnalysis.language_analysis.clarity_score}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Clarity</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                              {hrAnalysis.language_analysis.filler_words_count}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Filler Words</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                              {hrAnalysis.language_analysis.repetition_issues}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Repetitions</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Decision Helper */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                        HR Decision Helper
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400 mb-1">Strengths:</p>
                          <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                            {hrAnalysis.overall_assessment?.strengths?.slice(0, 3).map((strength: string, index: number) => (
                              <li key={index}>• {strength}</li>
                            )) || <li>No strengths identified</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Areas to Discuss:</p>
                          <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                            {hrAnalysis.overall_assessment?.areas_for_improvement?.slice(0, 3).map((area: string, index: number) => (
                              <li key={index}>• {area}</li>
                            )) || <li>No areas identified</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      Failed to load analysis. Please try again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {isDecisionModalOpen && selectedDecisionInterview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Interview Decision
                </h3>
                <button
                  onClick={closeDecision}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={decisionLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Job: <span className="font-medium">{selectedDecisionInterview.jobs?.title}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Candidate: <span className="font-medium">{selectedDecisionInterview.users?.email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Decision
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as 'accepted' | 'rejected')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add any feedback about the interview..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add any admin notes about the interview..."
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => submitDecision(decision, feedback, adminNotes)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={decisionLoading}
                >
                  {decisionLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Decision'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeDecision}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  disabled={decisionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 