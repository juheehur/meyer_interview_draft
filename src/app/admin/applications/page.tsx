'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  cover_letter: string;
  linkedin_url?: string;
  portfolio_url?: string;
  expected_salary?: string;
  start_date?: string;
  additional_info?: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'hired';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  jobs: {
    id: string;
    title: string;
    department?: string;
    location: string;
  };
  users?: {
    email: string;
    role: string;
  };
}

interface Job {
  id: string;
  title: string;
  department?: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [schedulingInterview, setSchedulingInterview] = useState<string | null>(null);

  const statusOptions = [
    { value: 'all', label: 'All Applications' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewing', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'hired', label: 'Hired' },
  ];

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, [selectedStatus, selectedJob]);

  const fetchApplications = async () => {
    try {
      let url = '/api/applications?';
      
      if (selectedStatus !== 'all') {
        url += `status=${selectedStatus}&`;
      }
      
      if (selectedJob !== 'all') {
        url += `job_id=${selectedJob}&`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, department')
        .order('title');

      if (!error) {
        setJobs(data || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string, notes?: string) => {
    setUpdatingStatus(applicationId);
    
    try {
      const updateData: any = { status: newStatus };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchApplications();
        if (viewingApplication?.id === applicationId) {
          const updatedApp = applications.find(app => app.id === applicationId);
          if (updatedApp) {
            setViewingApplication({ ...updatedApp, status: newStatus as any, admin_notes: notes });
          }
        }
      } else {
        alert('Failed to update application status');
      }
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Error updating application');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const scheduleInterview = async (application: Application) => {
    setSchedulingInterview(application.id);
    
    try {
      // Create interview for this application
      const interviewData = {
        user_id: application.users?.email ? null : null, // Let API handle user creation/lookup
        application_id: application.id,
        email: application.email,
        full_name: application.full_name,
        job_id: application.jobs.id,
        resume_text: application.additional_info || '', // Use additional info as resume text if available
      };

      console.log('Scheduling interview with data:', interviewData);

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interviewData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Interview scheduled successfully:', result);
        
        // Update application status to interview_scheduled
        await updateApplicationStatus(application.id, 'interview_scheduled', 'Interview scheduled');
        alert('Interview scheduled successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to schedule interview:', errorData);
        alert(`Failed to schedule interview: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview. Please try again.');
    } finally {
      setSchedulingInterview(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'shortlisted':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Job Applications Management
          </h3>
          <div className="flex space-x-4">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Job Filter */}
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.department && `(${job.department})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading applications...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No applications found.
                      </td>
                    </tr>
                  ) : (
                    applications.map((application) => (
                      <tr key={application.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {application.full_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {application.email}
                            </div>
                            {application.phone && (
                              <div className="text-xs text-gray-400">
                                {application.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {application.jobs.title}
                          </div>
                          {application.jobs.department && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {application.jobs.department}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            📍 {application.jobs.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(application.status)}`}>
                            {application.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(application.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => setViewingApplication(application)}
                            className="text-[#023da6] hover:text-[#034bb8] dark:text-[#034bb8] dark:hover:text-[#023da6]"
                          >
                            View
                          </button>
                          {application.status !== 'interview_scheduled' && (
                            <button
                              onClick={() => scheduleInterview(application)}
                              disabled={schedulingInterview === application.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                            >
                              {schedulingInterview === application.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                  </svg>
                                  Scheduling...
                                </>
                              ) : (
                                'Schedule Interview'
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {viewingApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Application Details - {viewingApplication.full_name}
                </h3>
                <button
                  onClick={() => setViewingApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Position</h4>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingApplication.jobs.title}</p>
                    <p className="text-xs text-gray-500">{viewingApplication.jobs.department} • {viewingApplication.jobs.location}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Information</h4>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingApplication.email}</p>
                    {viewingApplication.phone && (
                      <p className="text-sm text-gray-900 dark:text-white">{viewingApplication.phone}</p>
                    )}
                  </div>

                  {viewingApplication.linkedin_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn</h4>
                      <a href={viewingApplication.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                        {viewingApplication.linkedin_url}
                      </a>
                    </div>
                  )}

                  {viewingApplication.portfolio_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Portfolio</h4>
                      <a href={viewingApplication.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                        {viewingApplication.portfolio_url}
                      </a>
                    </div>
                  )}

                  {viewingApplication.expected_salary && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Salary</h4>
                      <p className="text-sm text-gray-900 dark:text-white">{viewingApplication.expected_salary}</p>
                    </div>
                  )}

                  {viewingApplication.start_date && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Start Date</h4>
                      <p className="text-sm text-gray-900 dark:text-white">{new Date(viewingApplication.start_date).toLocaleDateString()}</p>
                    </div>
                  )}

                  {viewingApplication.resume_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resume</h4>
                      <a href={viewingApplication.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Resume
                      </a>
                    </div>
                  )}
                </div>

                {/* Status Management */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Application Status</h4>
                    <select
                      value={viewingApplication.status}
                      onChange={(e) => updateApplicationStatus(viewingApplication.id, e.target.value)}
                      disabled={updatingStatus === viewingApplication.id}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview_scheduled">Interview Scheduled</option>
                      <option value="rejected">Rejected</option>
                      <option value="hired">Hired</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</h4>
                    <textarea
                      value={viewingApplication.admin_notes || ''}
                      onChange={(e) => {
                        setViewingApplication({
                          ...viewingApplication,
                          admin_notes: e.target.value
                        });
                      }}
                      onBlur={(e) => updateApplicationStatus(viewingApplication.id, viewingApplication.status, e.target.value)}
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#023da6] focus:border-[#023da6] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Add internal notes about this application..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    {viewingApplication.status !== 'interview_scheduled' && (
                      <button
                        onClick={() => scheduleInterview(viewingApplication)}
                        disabled={schedulingInterview === viewingApplication.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {schedulingInterview === viewingApplication.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                            </svg>
                            Scheduling Interview...
                          </>
                        ) : (
                          'Schedule Interview'
                        )}
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Application Timeline</h4>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Applied: {formatDate(viewingApplication.created_at)}</p>
                      <p>Last Updated: {formatDate(viewingApplication.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Cover Letter</h4>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {viewingApplication.cover_letter}
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              {viewingApplication.additional_info && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Information</h4>
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {viewingApplication.additional_info}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 