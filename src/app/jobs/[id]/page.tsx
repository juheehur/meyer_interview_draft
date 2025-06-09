'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Job {
  id: string
  title: string
  description: string
  requirements: string
  responsibilities?: string
  benefits?: string
  location: string
  type: string
  status: string
  department?: string
  deadline?: string
  salary_min?: number
  salary_max?: number
  experience_level?: string
  employment_type?: string
  is_remote?: boolean
  created_at: string
  updated_at: string
}

export default function JobDetailsPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Job not found')
          } else {
            setError('Failed to fetch job details')
          }
          return
        }

        const data = await response.json()
        setJob(data)
      } catch (err) {
        console.error('Error fetching job:', err)
        setError('An error occurred while fetching job details')
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {error || 'Job not found'}
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <Link href="/jobs" className="text-base font-medium text-blue-600 hover:text-blue-500">
              View all jobs
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate days remaining until deadline
  const today = new Date()
  const deadline = job.deadline ? new Date(job.deadline) : null
  const daysRemaining = deadline 
    ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Parse responsibilities and benefits (assuming they're stored as newline-separated or JSON)
  const parseListField = (field: string | undefined) => {
    if (!field) return []
    try {
      // Try to parse as JSON first
      return JSON.parse(field)
    } catch {
      // If not JSON, split by newlines and filter empty lines
      return field.split('\n').filter(item => item.trim().length > 0)
    }
  }

  const responsibilities = parseListField(job.responsibilities)
  const benefits = parseListField(job.benefits)
  const requirements = parseListField(job.requirements)

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/jobs" className="text-blue-600 hover:text-blue-500 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to all jobs
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {job.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                {job.department && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                    {job.department}
                  </span>
                )}
                {job.type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    {job.type}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                    📍 {job.location}
                  </span>
                )}
                {job.is_remote && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100">
                    🏠 Remote
                  </span>
                )}
                {job.experience_level && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                    {job.experience_level}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
              {daysRemaining !== null && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  daysRemaining > 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {daysRemaining > 0 
                    ? `⏰ ${daysRemaining} days remaining` 
                    : '⏰ Deadline passed'}
                </span>
              )}
              {(job.salary_min || job.salary_max) && (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  💰 {job.salary_min && job.salary_max 
                    ? `$${job.salary_min?.toLocaleString()} - $${job.salary_max?.toLocaleString()}`
                    : job.salary_min 
                      ? `From $${job.salary_min?.toLocaleString()}`
                      : `Up to $${job.salary_max?.toLocaleString()}`
                  }
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-bold mt-0 mb-4">About This Role</h2>
            <p className="whitespace-pre-wrap">{job.description}</p>
            
            {responsibilities.length > 0 && (
              <>
                <h2 className="text-xl font-bold mt-8 mb-4">Responsibilities</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {responsibilities.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            
            {requirements.length > 0 && (
              <>
                <h2 className="text-xl font-bold mt-8 mb-4">Requirements</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {requirements.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            
            {benefits.length > 0 && (
              <>
                <h2 className="text-xl font-bold mt-8 mb-4">Benefits</h2>
                <ul className="list-disc pl-5 space-y-2">
                  {benefits.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="text-sm text-gray-500 dark:text-gray-300 space-y-1">
              {deadline && (
                <p>Application deadline: {deadline.toLocaleDateString()}</p>
              )}
              <p>Posted: {new Date(job.created_at).toLocaleDateString()}</p>
              {job.updated_at !== job.created_at && (
                <p>Updated: {new Date(job.updated_at).toLocaleDateString()}</p>
              )}
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                href={`/jobs/${job.id}/apply`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 