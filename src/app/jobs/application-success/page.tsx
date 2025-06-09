'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ApplicationSuccessPage() {
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [applicantName, setApplicantName] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // URL 파라미터에서 정보 가져오기
    const title = searchParams.get('job')
    const name = searchParams.get('name')
    setJobTitle(title)
    setApplicantName(name)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Success Message */}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Application Submitted Successfully!
          </h2>
          
          <div className="mt-4 space-y-2">
            {applicantName && (
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Thank you, <span className="font-medium text-blue-600 dark:text-blue-400">{applicantName}</span>!
              </p>
            )}
            
            {jobTitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your application for <span className="font-medium">{jobTitle}</span> has been received.
              </p>
            )}
          </div>
        </div>

        {/* Next Steps Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            What happens next?
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium">
                  1
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Application Review
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Our hiring team will review your application and resume within 3-5 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium">
                  2
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Initial Screening
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If your profile matches our requirements, we'll contact you for an initial screening.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium">
                  3
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Interview Process
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selected candidates will be invited for interviews, which may include technical assessments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Have questions about your application?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Contact us at <a href="mailto:hr@company.com" className="underline hover:no-underline">hr@company.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/jobs"
            className="flex-1 bg-blue-600 text-white text-center py-3 px-4 rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Browse More Jobs
          </Link>
          
          <Link
            href="/"
            className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center py-3 px-4 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Return to Home
          </Link>
        </div>

        {/* Application Reference */}
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Application submitted on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  )
} 