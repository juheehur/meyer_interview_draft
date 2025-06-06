import Link from 'next/link';

// This would normally come from a database or API
const jobsData = [
  {
    id: 1,
    title: 'Software Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'New York, NY',
    description: 'We are looking for a software engineer to join our team and help build innovative solutions.',
    responsibilities: [
      'Design, develop, and maintain high-quality software applications',
      'Collaborate with cross-functional teams to define, design, and ship new features',
      'Implement clean, maintainable code with comprehensive tests',
      'Optimize application for speed and scalability',
      'Participate in code reviews and mentor junior engineers',
    ],
    requirements: [
      'Bachelor\'s degree in Computer Science or related field, or equivalent experience',
      '3+ years of professional software development experience',
      'Strong proficiency in JavaScript and TypeScript',
      'Experience with React, Next.js, and related technologies',
      'Familiarity with RESTful APIs and modern frontend build pipelines',
      'Strong problem-solving skills and attention to detail',
    ],
    benefits: [
      'Competitive salary and equity package',
      'Health, dental, and vision insurance',
      'Flexible work schedule and remote work options',
      'Professional development budget',
      'Generous PTO policy',
      'Company-sponsored events and team building activities',
    ],
    deadlineDate: '2023-12-31',
  },
  {
    id: 2,
    title: 'UX Designer',
    department: 'Design',
    type: 'Full-time',
    location: 'San Francisco, CA',
    description: 'We are seeking a talented UX designer to create intuitive and engaging user experiences for our products.',
    responsibilities: [
      'Create user-centered designs by understanding business requirements, user feedback, and research insights',
      'Develop wireframes, user flows, prototypes, and high-fidelity mockups',
      'Collaborate with product managers and engineers to define feature specifications',
      'Conduct usability testing and analyze user feedback',
      'Create and maintain design systems and documentation',
    ],
    requirements: [
      'Bachelor\'s degree in Design, HCI, or related field, or equivalent experience',
      '3+ years of experience in UX/UI design',
      'Proficiency in design tools such as Figma, Sketch, or Adobe XD',
      'Strong portfolio demonstrating user-centered design process',
      'Understanding of accessibility standards and responsive design',
      'Excellent communication and presentation skills',
    ],
    benefits: [
      'Competitive salary and equity package',
      'Health, dental, and vision insurance',
      'Flexible work schedule and remote work options',
      'Professional development budget',
      'Generous PTO policy',
      'Company-sponsored events and team building activities',
    ],
    deadlineDate: '2023-11-30',
  },
  {
    id: 3,
    title: 'Data Scientist',
    department: 'Analytics',
    type: 'Full-time',
    location: 'Remote',
    description: 'Join our data science team to analyze complex datasets and derive meaningful insights for our business.',
    responsibilities: [
      'Develop and implement data models and algorithms to extract insights from large datasets',
      'Work with stakeholders to identify opportunities for data-driven solutions',
      'Create visualizations to communicate findings to technical and non-technical audiences',
      'Build and optimize machine learning models',
      'Collaborate with engineering teams to implement data science solutions',
    ],
    requirements: [
      'Master\'s or PhD in Statistics, Computer Science, or related field',
      '3+ years of experience in data science or related field',
      'Strong programming skills in Python and SQL',
      'Experience with machine learning frameworks such as TensorFlow or PyTorch',
      'Knowledge of statistical analysis and modeling techniques',
      'Excellent problem-solving and communication skills',
    ],
    benefits: [
      'Competitive salary and equity package',
      'Health, dental, and vision insurance',
      'Flexible work schedule and remote work options',
      'Professional development budget',
      'Generous PTO policy',
      'Company-sponsored events and team building activities',
    ],
    deadlineDate: '2023-12-15',
  },
];

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const jobId = parseInt(params.id);
  const job = jobsData.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Job not found
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
    );
  }

  // Calculate days remaining until deadline
  const today = new Date();
  const deadline = new Date(job.deadlineDate);
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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
              <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                <span>{job.department}</span>
                <span className="mx-2">&middot;</span>
                <span>{job.type}</span>
                <span className="mx-2">&middot;</span>
                <span>{job.location}</span>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                {daysRemaining > 0 
                  ? `Deadline: ${daysRemaining} days remaining` 
                  : 'Deadline passed'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="prose dark:prose-invert max-w-none">
            <p>{job.description}</p>
            
            <h2 className="text-xl font-bold mt-8 mb-4">Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              {job.responsibilities.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            
            <h2 className="text-xl font-bold mt-8 mb-4">Requirements</h2>
            <ul className="list-disc pl-5 space-y-2">
              {job.requirements.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            
            <h2 className="text-xl font-bold mt-8 mb-4">Benefits</h2>
            <ul className="list-disc pl-5 space-y-2">
              {job.benefits.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="text-sm text-gray-500 dark:text-gray-300">
              <p>Application deadline: {new Date(job.deadlineDate).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 