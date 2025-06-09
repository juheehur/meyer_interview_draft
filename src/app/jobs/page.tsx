'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Job {
  id: string
  title: string
  description: string
  requirements: string
  location: string
  type: string
  status: string
  created_at: string
  updated_at: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [filters, setFilters] = useState({
    type: 'All Types',
    location: '',
    status: 'All Status'
  })

  // Load data
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/jobs')
        if (!response.ok) {
          throw new Error('Failed to fetch jobs')
        }
        const data = await response.json()
        setJobs(data)
        setFilteredJobs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  // Filtering logic
  useEffect(() => {
    let filtered = jobs

    if (filters.type !== 'All Types') {
      filtered = filtered.filter(job => job.type === filters.type)
    }

    if (filters.location.trim()) {
      filtered = filtered.filter(job => 
        job.location?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }

    if (filters.status !== 'All Status') {
      filtered = filtered.filter(job => job.status === filters.status)
    }

    setFilteredJobs(filtered)
  }, [jobs, filters])

  // Extract unique values
  const jobTypes = ['All Types', ...Array.from(new Set(jobs.map(job => job.type).filter(Boolean)))]
  const jobStatuses = ['All Status', ...Array.from(new Set(jobs.map(job => job.status).filter(Boolean)))]

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading job listings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">An error occurred</h3>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Open Positions
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
          Join our team and help us build the future. We offer competitive compensation, excellent benefits, and a collaborative work environment.
        </p>
      </div>

      {/* Filter section */}
      <div className="mt-12 flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
        <div>
          <label htmlFor="type-filter" className="sr-only">Filter by job type</label>
          <select 
            id="type-filter" 
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select 
            id="status-filter" 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {jobStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location-filter" className="sr-only">Search by location</label>
          <input
            type="text"
            id="location-filter"
            placeholder="Search by location"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Job listings */}
      <div className="mt-10">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No jobs match your criteria
              </h3>
              <p className="text-gray-500 dark:text-gray-300">
                Please adjust your filters or check back later.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
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
                        {job.status && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                            {job.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                  {job.description && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">
                      {job.description.length > 200 
                        ? `${job.description.substring(0, 200)}...` 
                        : job.description
                      }
                    </p>
                  )}
                  {job.requirements && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Key Requirements: </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {job.requirements.length > 100 
                          ? `${job.requirements.substring(0, 100)}...` 
                          : job.requirements
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total count display */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}{jobs.length !== filteredJobs.length && ` (of ${jobs.length} total)`}
        </p>
      </div>
    </div>
  )
} 