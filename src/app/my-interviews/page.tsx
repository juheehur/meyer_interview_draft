"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Interview {
  id: string;
  job_id: string;
  status: string;
  notes?: string;
  jobs: { title: string, company?: string }[];
  created_at: string;
}

interface InterviewAnalysis {
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
  };
  language_analysis: {
    clarity_score: number;
    filler_words_count: number;
    repetition_issues: number;
    overall_communication: string;
  };
  question_analysis: Array<{
    question_number: number;
    strengths: string[];
    weaknesses: string[];
    score: number;
    key_highlights: string;
  }>;
  overall_assessment: {
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    overall_score: number;
  };
  hr_highlights: Array<{
    timestamp: string;
    highlight: string;
    category: string;
  }>;
}

export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultLoading, setResultLoading] = useState(false);
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
      
      setUserEmail(user.email || '');
      
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Scheduled',
          color: 'border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/10',
          badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
          action: 'Start Interview',
          actionColor: 'bg-amber-600 hover:bg-amber-700 text-white',
          step: 1
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          color: 'border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-900/10',
          badgeColor: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
          action: 'Continue',
          actionColor: 'bg-blue-600 hover:bg-blue-700 text-white',
          step: 2
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'border-l-4 border-green-600 bg-green-50 dark:bg-green-900/10',
          badgeColor: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
          action: 'View Feedback',
          actionColor: 'bg-green-600 hover:bg-green-700 text-white',
          step: 3
        };
      case 'hired':
        return {
          label: 'Hired',
          color: 'border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10',
          badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
          action: 'View Result',
          actionColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          step: 4
        };
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'border-l-4 border-red-600 bg-red-50 dark:bg-red-900/10',
          badgeColor: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
          action: 'View Result',
          actionColor: 'bg-red-600 hover:bg-red-700 text-white',
          step: 4
        };
      default:
        return {
          label: status,
          color: 'border-l-4 border-gray-400 bg-gray-50 dark:bg-gray-900/10',
          badgeColor: 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200',
          action: 'View',
          actionColor: 'bg-gray-600 hover:bg-gray-700 text-white',
          step: 1
        };
    }
  };

  const getActionUrl = (interview: Interview) => {
    switch (interview.status) {
      case 'pending':
        return `/ai-interview/${interview.id}/prepare`;
      case 'in_progress':
        return `/ai-interview/${interview.id}/conduct`;
      case 'completed':
      case 'hired':
      case 'rejected':
        return null; // Will handle feedback/result viewing separately
      default:
        return `/ai-interview`;
    }
  };

  const viewFeedback = async (interview: Interview) => {
    setSelectedInterview(interview);
    setAnalysisLoading(true);
    setShowFeedback(true);

    try {
      // First, try to get existing analysis
      const response = await fetch(`/api/interviews/${interview.id}/analyze`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else if (response.status === 404) {
        // No analysis exists, generate new one
        const analyzeResponse = await fetch(`/api/interviews/${interview.id}/analyze`, {
          method: 'POST'
        });
        
        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          setAnalysis(analyzeData.analysis);
        } else {
          const errorData = await analyzeResponse.json();
          alert(`Failed to generate analysis: ${errorData.error}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      alert('Failed to load feedback. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const closeFeedback = () => {
    setShowFeedback(false);
    setSelectedInterview(null);
    setAnalysis(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const viewResult = async (interview: Interview) => {
    setSelectedInterview(interview);
    setResultLoading(true);
    setShowResult(true);

    try {
      const response = await fetch(`/api/interviews/${interview.id}/decision`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data.decision);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fetching result:', error);
      alert('Failed to load result. Please try again.');
    } finally {
      setResultLoading(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setSelectedInterview(null);
    setResult(null);
  };

  const pendingCount = interviews.filter(i => i.status === 'pending').length;
  const inProgressCount = interviews.filter(i => i.status === 'in_progress').length;
  const completedCount = interviews.filter(i => i.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading interviews</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-light text-gray-900 dark:text-white">
                Interview Center
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your interview schedule and track progress
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {userEmail.split('@')[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {interviews.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-4">
                No interviews scheduled
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Start your career journey by exploring available positions and submitting applications.
              </p>
              <Link 
                href="/jobs"
                className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
              >
                Browse Open Positions
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-3xl font-light text-gray-900 dark:text-white">{pendingCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-gray-900 dark:text-white">{inProgressCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-gray-900 dark:text-white">{completedCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed</div>
              </div>
            </div>

            {/* Interview List */}
            <div className="space-y-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                Your Interviews
              </h2>

              <div className="space-y-4">
                {interviews.map((interview) => {
                  const statusInfo = getStatusInfo(interview.status);
                  const actionUrl = getActionUrl(interview);
                  
                  return (
                    <div 
                      key={interview.id} 
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${statusInfo.color}`}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {interview.jobs?.[0]?.title || 'Interview'}
                              </h3>
                              <span className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${statusInfo.badgeColor}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              Scheduled: {new Date(interview.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            
                            {/* Progress Steps */}
                            <div className="flex items-center space-x-6 mb-4">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.step >= 1 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className={`ml-2 text-sm ${statusInfo.step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                                  Scheduled
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className={`ml-2 text-sm ${statusInfo.step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                                  In Progress
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.step >= 3 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <span className={`ml-2 text-sm ${statusInfo.step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                                  Completed
                                </span>
                              </div>
                            </div>

                            {interview.status === 'pending' && (
                              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 mb-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                  Interview Preparation
                                </h4>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                  <li>• Review the job description and company information</li>
                                  <li>• Prepare specific examples demonstrating your skills</li>
                                  <li>• Test your equipment and internet connection</li>
                                  <li>• Choose a professional, quiet environment</li>
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-6">
                            {interview.status === 'completed' ? (
                              <button
                                onClick={() => viewFeedback(interview)}
                                className={`inline-flex items-center px-6 py-2 text-sm font-medium transition-colors ${statusInfo.actionColor}`}
                              >
                                {statusInfo.action}
                              </button>
                            ) : (interview.status === 'hired' || interview.status === 'rejected') ? (
                              <button
                                onClick={() => viewResult(interview)}
                                className={`inline-flex items-center px-6 py-2 text-sm font-medium transition-colors ${statusInfo.actionColor}`}
                              >
                                {statusInfo.action}
                              </button>
                            ) : actionUrl ? (
                              <Link
                                href={actionUrl}
                                className={`inline-flex items-center px-6 py-2 text-sm font-medium transition-colors ${statusInfo.actionColor}`}
                              >
                                {statusInfo.action}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resources */}
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Interview Resources
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Common Questions
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>• Tell me about yourself</li>
                    <li>• What are your greatest strengths?</li>
                    <li>• Why are you interested in this role?</li>
                    <li>• Describe a challenging situation you've overcome</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Technical Preparation
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>• Review relevant technologies and frameworks</li>
                    <li>• Prepare portfolio examples or code samples</li>
                    <li>• Practice explaining technical concepts clearly</li>
                    <li>• Prepare thoughtful questions for the interviewer</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                    Interview Feedback
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedInterview?.jobs?.[0]?.title || 'Interview'}
                  </p>
                </div>
                <button
                  onClick={closeFeedback}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {analysisLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Analyzing your interview...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">This may take a moment</p>
                  </div>
                ) : analysis ? (
                  <div className="space-y-8">
                    {/* Summary */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Summary
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {analysis.summary}
                      </p>
                    </div>

                    {/* Overall Score */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Overall Assessment
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Overall Score
                          </span>
                          <span className={`text-2xl font-bold ${getScoreColor(analysis.overall_assessment.overall_score)}`}>
                            {analysis.overall_assessment.overall_score}/10
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {analysis.overall_assessment.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Skills Demonstrated
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Technical Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.skills.technical.map((skill, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 text-xs font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Soft Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.skills.soft.map((skill, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 text-xs font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Language Analysis */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Communication Analysis
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 text-center">
                          <div className={`text-xl font-bold ${getScoreColor(analysis.language_analysis.clarity_score / 10)}`}>
                            {analysis.language_analysis.clarity_score}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Clarity Score
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 text-center">
                          <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            {analysis.language_analysis.filler_words_count}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Filler Words
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 text-center">
                          <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            {analysis.language_analysis.repetition_issues}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Repetitions
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        {analysis.language_analysis.overall_communication}
                      </p>
                    </div>

                    {/* Strengths & Areas for Improvement */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                          Strengths
                        </h3>
                        <ul className="space-y-2">
                          {analysis.overall_assessment.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {strength}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                          Areas for Improvement
                        </h3>
                        <ul className="space-y-2">
                          {analysis.overall_assessment.areas_for_improvement.map((area, index) => (
                            <li key={index} className="flex items-start">
                              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {area}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Question-by-Question Analysis */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Question Analysis
                      </h3>
                      <div className="space-y-4">
                        {analysis.question_analysis.map((qa, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                Question {qa.question_number}
                              </h4>
                              <span className={`font-bold ${getScoreColor(qa.score)}`}>
                                {qa.score}/10
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {qa.key_highlights}
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="font-medium text-green-700 dark:text-green-400">Strengths:</span>
                                <ul className="mt-1 space-y-1">
                                  {qa.strengths.map((strength, i) => (
                                    <li key={i} className="text-gray-600 dark:text-gray-400">• {strength}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium text-amber-700 dark:text-amber-400">Improvements:</span>
                                <ul className="mt-1 space-y-1">
                                  {qa.weaknesses.map((weakness, i) => (
                                    <li key={i} className="text-gray-600 dark:text-gray-400">• {weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      Failed to load feedback. Please try again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                    Interview Result
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedInterview?.jobs?.[0]?.title || 'Interview'}
                  </p>
                </div>
                <button
                  onClick={closeResult}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {resultLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading result...</p>
                  </div>
                ) : result ? (
                  <div className="space-y-8">
                    {/* Result Status */}
                    <div className={`text-center py-8 px-6 rounded-lg ${
                      result.status === 'accepted' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <div className={`text-6xl mb-4 ${
                        result.status === 'accepted' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {result.status === 'accepted' ? '🎉' : '😔'}
                      </div>
                      <h3 className={`text-2xl font-bold mb-2 ${
                        result.status === 'accepted' 
                          ? 'text-emerald-900 dark:text-emerald-200' 
                          : 'text-red-900 dark:text-red-200'
                      }`}>
                        {result.status === 'accepted' ? 'Congratulations!' : 'Thank You for Your Interest'}
                      </h3>
                      <p className={`text-lg ${
                        result.status === 'accepted' 
                          ? 'text-emerald-800 dark:text-emerald-300' 
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                        {result.status === 'accepted' 
                          ? 'We are pleased to inform you that you have been selected for this position.'
                          : 'While we were impressed with your qualifications, we have decided to move forward with another candidate.'}
                      </p>
                    </div>

                    {/* Decision Date */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Decision Date
                      </div>
                      <div className="text-gray-900 dark:text-white">
                        {new Date(result.decided_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Feedback */}
                    {result.feedback && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                          Feedback
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {result.feedback}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Next Steps */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Next Steps
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                        {result.status === 'accepted' ? (
                          <div className="space-y-2 text-blue-800 dark:text-blue-200">
                            <p>• Our HR team will contact you within 2-3 business days</p>
                            <p>• Please prepare necessary documentation for onboarding</p>
                            <p>• Check your email for detailed next steps</p>
                          </div>
                        ) : (
                          <div className="space-y-2 text-blue-800 dark:text-blue-200">
                            <p>• We encourage you to apply for other positions that match your skills</p>
                            <p>• Your profile will remain in our talent pool for future opportunities</p>
                            <p>• Thank you for your time and interest in our company</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      Failed to load result. Please try again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 