import Link from 'next/link';

export default function JobsPage() {
  // Sample job data
  const jobs = [
    {
      id: 1,
      title: 'Software Engineer',
      department: 'Engineering',
      type: 'Full-time',
      location: 'New York, NY',
      description: 'We are looking for a software engineer to join our team and help build innovative solutions.',
    },
    {
      id: 2,
      title: 'UX Designer',
      department: 'Design',
      type: 'Full-time',
      location: 'San Francisco, CA',
      description: 'We are seeking a talented UX designer to create intuitive and engaging user experiences for our products.',
    },
    {
      id: 3,
      title: 'Data Scientist',
      department: 'Analytics',
      type: 'Full-time',
      location: 'Remote',
      description: 'Join our data science team to analyze complex datasets and derive meaningful insights for our business.',
    },
    {
      id: 4,
      title: 'Product Manager',
      department: 'Product',
      type: 'Full-time',
      location: 'Austin, TX',
      description: 'We need a product manager to lead the development of our next-generation products.',
    },
    {
      id: 5,
      title: 'Marketing Specialist',
      department: 'Marketing',
      type: 'Full-time',
      location: 'Chicago, IL',
      description: 'Join our marketing team to develop and execute strategies that drive growth and engagement.',
    },
    {
      id: 6,
      title: 'DevOps Engineer',
      department: 'Engineering',
      type: 'Full-time',
      location: 'Remote',
      description: 'We are looking for a DevOps engineer to help us build and maintain our cloud infrastructure.',
    },
    {
      id: 7,
      title: 'HR Coordinator',
      department: 'Human Resources',
      type: 'Part-time',
      location: 'Boston, MA',
      description: 'Help us manage our HR operations and create a great employee experience.',
    },
    {
      id: 8,
      title: 'Sales Representative',
      department: 'Sales',
      type: 'Full-time',
      location: 'Multiple Locations',
      description: 'Join our sales team to help grow our customer base and drive revenue.',
    },
  ];

  // Job types for filtering
  const jobTypes = ['All Types', 'Full-time', 'Part-time', 'Internship', 'Contract'];
  
  // Departments for filtering
  const departments = ['All Departments', 'Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Human Resources', 'Analytics'];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Open Positions
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
          Join our team and help us build the future. We offer competitive compensation, great benefits, and a collaborative work environment.
        </p>
      </div>

      {/* Filter section */}
      <div className="mt-12 flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
        <div>
          <label htmlFor="type-filter" className="sr-only">Filter by job type</label>
          <select 
            id="type-filter" 
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {jobTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="department-filter" className="sr-only">Filter by department</label>
          <select 
            id="department-filter" 
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {departments.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location-filter" className="sr-only">Search by location</label>
          <input
            type="text"
            id="location-filter"
            placeholder="Search by location"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Jobs list */}
      <div className="mt-10 space-y-6">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {job.title}
                  </h3>
                  <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                    <span>{job.department}</span>
                    <span className="mx-2">&middot;</span>
                    <span>{job.type}</span>
                    <span className="mx-2">&middot;</span>
                    <span>{job.location}</span>
                  </div>
                </div>
                <Link 
                  href={`/jobs/${job.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Details
                </Link>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">
                {job.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 