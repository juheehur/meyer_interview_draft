'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Interview {
  id: string;
  user_id: string;
  job_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
  });
  const [resumeText, setResumeText] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
        const res = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: formData.user_id,
            job_id: formData.job_id,
            resume_text: resumeText,
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
    setFormData({
      user_id: interview.user_id,
      job_id: interview.job_id,
      status: interview.status,
      notes: interview.notes || '',
    });
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
    });
    setEditingInterview(null);
    setIsModalOpen(false);
  };

  const getStatusBadgeColor = (status: Interview['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Interview Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Candidate:
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {viewingInterview.users?.email || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Position:
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {viewingInterview.jobs?.title || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status:
                  </label>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(viewingInterview.status)}`}>
                    {getStatusText(viewingInterview.status)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Created Date:
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(viewingInterview.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Updated:
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(viewingInterview.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Interview Questions and Transcripts (for completed interviews) */}
                {viewingInterview.status === 'completed' && viewingInterview.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interview Results:
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 max-h-96 overflow-y-auto">
                      {(() => {
                        try {
                          const interviewData = JSON.parse(viewingInterview.notes);
                          
                          // 새로운 형식 (questions + transcripts)
                          if (interviewData.questions && interviewData.transcripts) {
                            return (
                              <div className="space-y-4">
                                {interviewData.questions.map((question: string, index: number) => (
                                  <div key={index} className="border-b border-gray-200 dark:border-gray-600 pb-4 last:border-b-0">
                                    <div className="mb-2">
                                      <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                                        Q{index + 1}
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                      {question}
                                    </h4>
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                                      <p className="text-gray-700 dark:text-gray-300">
                                        <strong>Response:</strong> {interviewData.transcripts[index] || 'No response recorded'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                {interviewData.completed_at && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                                    Completed: {new Date(interviewData.completed_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // 기존 형식 (질문만 있는 경우)
                          else if (Array.isArray(interviewData)) {
                            return (
                              <ol className="list-decimal list-inside space-y-2">
                                {interviewData.map((question, index) => (
                                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                    {question}
                                  </li>
                                ))}
                              </ol>
                            );
                          }
                          
                          // 일반 텍스트
                          else {
                            return (
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {viewingInterview.notes}
                              </p>
                            );
                          }
                        } catch {
                          return (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {viewingInterview.notes}
                            </p>
                          );
                        }
                      })()}
                    </div>
                    {viewingInterview.status === 'completed' && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            Interview completed successfully with speech-to-text analysis
                          </p>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          The candidate answered all questions (max 1 minute per response) and their responses have been transcribed for analysis.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes for other statuses */}
                {viewingInterview.status !== 'completed' && viewingInterview.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes:
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {viewingInterview.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                {viewingInterview.status === 'completed' && (
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => {
                      // TODO: 향후 비디오 재생이나 상세 분석 페이지로 이동
                      alert('Video playback feature will be added in future updates');
                    }}
                  >
                    View Recording
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 