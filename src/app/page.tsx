import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  // Job examples for the opportunities section
  const featuredJobs = [
    {
      id: 1,
      title: 'Product Innovation Intern',
      location: 'Bangkok',
      type: 'Internship',
      icon: '🧪',
    },
    {
      id: 2,
      title: 'Manufacturing Engineer',
      location: 'Chonburi',
      type: 'Full-Time',
      icon: '🔧',
    },
    {
      id: 3,
      title: 'Global Supply Chain Analyst',
      location: 'Remote',
      type: 'Full-Time',
      icon: '📦',
    },
  ];

  // Core values data
  const coreValues = [
    {
      icon: '💎',
      title: 'Excellence',
      description: 'Delivering superior results through people, processes, and products.'
    },
    {
      icon: '🔒',
      title: 'Accountability',
      description: 'Owning our actions with integrity and transparency.'
    },
    {
      icon: '💡',
      title: 'Innovation',
      description: 'Embracing creativity, speed, and boundary-pushing ideas.'
    },
    {
      icon: '🤝',
      title: 'Collaboration',
      description: 'Building global trust and unity through teamwork.'
    },
    {
      icon: '🚀',
      title: 'Continual Improvement',
      description: 'Constantly learning, evolving, and refining.'
    },
    {
      icon: '😊',
      title: 'Customer Satisfaction',
      description: 'Meeting the needs of internal and external customers with empathy and precision.'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Multiple Overlays */}
        <div className="absolute inset-0">
        <Image
            src="/images/hero-team-cooking.png"
            alt="Team Cooking Hero"
            fill
            style={{objectFit: 'cover'}}
          priority
            className="scale-105"
          />
          {/* 오버레이를 기존보다 살짝 더 어둡게 조정 */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#023da6]/25 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-[#023da6] rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-blue-300 rounded-full animate-ping"></div>
          <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-[#023da6]/60 rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-20 right-10 w-2 h-2 bg-blue-200/40 rounded-full animate-ping delay-1000"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-20 text-center max-w-7xl mx-auto px-6 lg:px-8">
          {/* Brand Badge */}
          <div className="inline-flex items-center bg-black/30 backdrop-blur-sm border border-white/30 rounded-full px-6 py-2 mb-8 shadow-2xl">
            <div className="w-2 h-2 bg-[#023da6] rounded-full mr-3 animate-pulse"></div>
            <span className="text-white text-sm font-medium tracking-wide drop-shadow-lg">MEYER INDUSTRIES LIMITED</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white leading-none drop-shadow-2xl">
              <span className="block opacity-90 transform hover:scale-105 transition-all duration-700">
                <span className="text-blue-100 font-extralight drop-shadow-xl">"If you</span>
                <span className="text-white font-light drop-shadow-xl"> cook,</span>
              </span>
              <span className="block mt-4 transform hover:scale-105 transition-all duration-700 delay-150">
                <span className="text-white font-medium drop-shadow-xl">you are a</span>
                <span className="text-[#023da6] font-bold ml-4 relative drop-shadow-2xl">
                  chef."
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#023da6] to-blue-400 rounded-full transform scale-x-0 hover:scale-x-100 transition-transform duration-500 shadow-lg"></div>
                </span>
              </span>
            </h1>
            
            {/* Decorative Line */}
            <div className="flex items-center justify-center space-x-4 my-8">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-white/50"></div>
              <div className="w-4 h-4 bg-[#023da6] rounded-full relative shadow-lg">
                <div className="absolute inset-0 bg-[#023da6] rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="w-32 h-px bg-gradient-to-r from-white/50 via-[#023da6]/70 to-white/50"></div>
              <div className="w-4 h-4 bg-blue-400 rounded-full relative shadow-lg">
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75 delay-500"></div>
              </div>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-white/50"></div>
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-16">
            <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white tracking-wide drop-shadow-xl">
              <span className="inline-block transform hover:scale-105 transition-all duration-500">Join Meyer.</span>
              <span className="inline-block ml-4 text-white font-medium transform hover:scale-105 transition-all duration-500 delay-100">Create Joy.</span>
            </p>
            <p className="text-lg md:text-xl text-blue-100 mt-4 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
              Where culinary passion meets manufacturing excellence
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
            <Link
              href="/ai-interview"
              className="group relative overflow-hidden bg-[#023da6] hover:bg-[#034bb8] text-white px-8 py-4 rounded-2xl text-lg font-medium transition-all duration-500 flex items-center justify-center shadow-2xl hover:shadow-[#023da6]/50 transform hover:-translate-y-2 hover:scale-105 w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#023da6] to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
              <span className="relative flex items-center drop-shadow-lg">
                <span className="text-2xl mr-3 group-hover:animate-bounce">🎤</span>
                Try AI Interview
                <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>

            <Link
              href="/jobs"
              className="group relative overflow-hidden bg-white/95 hover:bg-white text-[#023da6] px-8 py-4 rounded-2xl text-lg font-medium transition-all duration-500 flex items-center justify-center shadow-2xl hover:shadow-white/30 transform hover:-translate-y-2 hover:scale-105 backdrop-blur-sm border border-white/50 w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-[#023da6]/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
              <span className="relative flex items-center font-semibold">
                <span className="text-2xl mr-3 group-hover:animate-bounce">📄</span>
                View Positions
                <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Bottom Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#023da6] transition-colors duration-300 drop-shadow-xl">150,000+</div>
              <div className="text-blue-100 text-sm uppercase tracking-wide drop-shadow-lg">Pans Daily</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#023da6] transition-colors duration-300 drop-shadow-xl">4,000+</div>
              <div className="text-blue-100 text-sm uppercase tracking-wide drop-shadow-lg">Team Members</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#023da6] transition-colors duration-300 drop-shadow-xl">70+</div>
              <div className="text-blue-100 text-sm uppercase tracking-wide drop-shadow-lg">Years Excellence</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/70 rounded-full p-1 shadow-lg backdrop-blur-sm">
            <div className="w-1 h-3 bg-white rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* About Meyer Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <div className="inline-block">
                  <span className="text-sm font-semibold text-[#023da6] uppercase tracking-wide">About Us</span>
                  <div className="w-12 h-0.5 bg-[#023da6] mt-2"></div>
                </div>
                <h2 className="text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mt-6 leading-tight">
                  World's Second-Largest
                  <span className="block font-medium text-[#023da6]">Cookware Manufacturer</span>
                </h2>
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Your next career starts here.
              </p>
              <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                  Meyer Industries Limited is a global leader in cookware manufacturing. Established in 1951 and 
                  headquartered in the U.S., Meyer operates worldwide with unwavering commitment to quality.
                </p>
                <p>
                  Our Thailand factory in Chonburi, founded in 1990, stands as Meyer's largest manufacturing facility, 
                  producing over <span className="font-semibold text-[#023da6]">150,000 pans daily</span> and employing over 
                  <span className="font-semibold text-[#023da6]"> 4,000 dedicated professionals</span>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <h4 className="font-semibold text-[#023da6] mb-3">Our Brands</h4>
                    <p className="text-sm leading-relaxed">Circulon, Anolon, Rachael Ray, Prestige, Farberware, Essteele</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <h4 className="font-semibold text-[#023da6] mb-3">Global Markets</h4>
                    <p className="text-sm leading-relaxed">U.S., U.K., Thailand, Australia, Hong Kong, China, Italy, and more</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <Image
                src="/images/meyer-factory-exterior.png"
                alt="Meyer Factory Exterior"
                width={600}
                height={400}
                className="relative rounded-xl w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* People & Culture Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="relative">
            <Image
                  src="/images/diverse-global-team.png"
                  alt="Diverse Global Team"
                  width={600}
                  height={400}
                  className="relative rounded-xl w-full h-auto"
                  priority
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <span className="text-sm font-semibold text-[#023da6] uppercase tracking-wide">People & Culture</span>
                <div className="w-12 h-0.5 bg-[#023da6] mt-2"></div>
                <h2 className="text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mt-6 leading-tight">
                  We don't just make cookware —
                  <span className="block font-medium text-[#023da6]">we build careers</span>
                </h2>
              </div>
              <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                <p>
                  Working at Meyer means joining a <span className="font-medium text-[#023da6]">global family</span> where 
                  innovation meets purpose and every team member contributes to our shared success.
                </p>
                <p>
                  We believe in collaboration, creativity, and delivering joy — to both our customers and our people. 
                  Our commitment extends beyond manufacturing excellence to nurturing human potential.
                </p>
                <p>
                  Whether you're starting your career or taking it to the next level, we provide the space, 
                  support, and inspiration to grow alongside a company that values your unique contributions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-sm font-semibold text-[#023da6] uppercase tracking-wide">Our Foundation</span>
            <div className="w-12 h-0.5 bg-gradient-to-r from-[#023da6] to-blue-500 mx-auto mt-2"></div>
            <h2 className="text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mt-6 mb-6 leading-tight">
              The 6 Core Values
              <span className="block font-medium text-[#023da6] mt-2">That Guide Us</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              These principles shape our culture, drive our decisions, and define our commitment to excellence in everything we do.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {coreValues.map((value, index) => (
              <div key={index} className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 border border-gray-100 dark:border-gray-700 hover:border-[#023da6]/30 overflow-hidden">
                {/* Subtle background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#023da6]/5 via-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                
                {/* Icon container with improved styling */}
                <div className="relative z-10 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#023da6]/10 to-blue-100/70 dark:from-[#023da6]/20 dark:to-blue-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{value.icon}</div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 group-hover:text-[#023da6] transition-colors duration-300">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {value.description}
                  </p>
                </div>
                
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#023da6]/10 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Opportunities Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-800 dark:via-blue-900/10 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[#023da6] uppercase tracking-wide">Join Our Team</span>
            <div className="w-12 h-0.5 bg-[#023da6] mx-auto mt-2"></div>
            <h2 className="text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mt-6 mb-6 leading-tight">
              Explore Career
              <span className="block font-medium text-[#023da6]">Opportunities</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
              Find your next role at Meyer and be part of shaping the future of cookware manufacturing.
            </p>
            
            {/* Search Filters */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <select className="px-6 py-3 border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm focus:ring-2 focus:ring-[#023da6] focus:border-[#023da6] transition-all duration-200">
                <option>All Employment Types</option>
                <option>Internship</option>
                <option>Full-Time</option>
                <option>Contract</option>
              </select>
              <select className="px-6 py-3 border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm focus:ring-2 focus:ring-[#023da6] focus:border-[#023da6] transition-all duration-200">
                <option>All Departments</option>
                <option>Manufacturing</option>
                <option>Engineering</option>
                <option>Quality Assurance</option>
                <option>Supply Chain</option>
                <option>R&D</option>
                <option>Sales & Marketing</option>
              </select>
            </div>
          </div>

          {/* Job Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {featuredJobs.map((job) => (
              <div key={job.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 hover:border-[#023da6]/30">
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{job.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-[#023da6] transition-colors duration-300">
                  {job.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 flex items-center">
                  <span className="inline-block w-2 h-2 bg-[#023da6] rounded-full mr-2"></span>
                  {job.location}
                </p>
                <span className="inline-block bg-[#023da6]/10 text-[#023da6] text-sm px-4 py-2 rounded-full font-medium">
                  {job.type}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/jobs"
              className="inline-flex items-center bg-[#023da6] hover:bg-[#034bb8] text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              🎯 See All Openings
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Interview Experience Section */}
      <section className="py-24 bg-gradient-to-br from-[#023da6] via-[#034bb8] to-blue-600">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <span className="text-sm font-semibold text-blue-100 uppercase tracking-wide">Innovation in Hiring</span>
                <div className="w-12 h-0.5 bg-blue-200 mt-2"></div>
                <h2 className="text-4xl lg:text-5xl font-light text-white mt-6 leading-tight">
                  AI Interview
                  <span className="block font-medium">Experience</span>
                </h2>
              </div>
              <p className="text-xl text-blue-100 leading-relaxed">
                Practice makes confidence. Try our AI interview tool before you apply and gain valuable insights into your interview performance.
              </p>
              <div className="space-y-4">
                {[
                  'Realistic AI-generated questions based on the role',
                  'Speak, type, or record video answers',
                  'Instant feedback report with strengths and improvement areas',
                  'Your report is sent to our HR team with your application'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold mr-4 mt-1">
                      ✓
                    </div>
                    <p className="text-blue-100 leading-relaxed">{feature}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/ai-interview"
                className="inline-flex items-center bg-white hover:bg-blue-50 text-[#023da6] px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🎯 Start AI Interview
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 "></div>
          <Image
                src="/images/ai-interview-screenshot.png"
                alt="AI Interview Platform Screenshot"
                width={600}
                height={400}
                className="relative rounded-xl w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
          <Image
                src="/images/meyer-logo-footer.png"
                alt="Meyer Industries Limited"
                width={240}
                height={72}
                className="mb-8"
                priority
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 text-gray-300">
                  <p className="flex items-center text-lg">
                    <span className="mr-3 text-[#023da6]">🏢</span>
                    <span className="font-medium">Meyer Industries Limited</span>
                  </p>
                  <p className="flex items-start">
                    <span className="mr-3 mt-1 text-[#023da6]">📍</span>
                    <span className="leading-relaxed">38/9 Moo 5, Tungsukhla, Sriracha, Chonburi 20230, Thailand</span>
                  </p>
                  <p className="flex items-center">
                    <span className="mr-3 text-[#023da6]">✉️</span>
                    <a href="mailto:careers@meyer-mil.com" className="hover:text-white transition-colors duration-200 font-medium">
                      careers@meyer-mil.com
                    </a>
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-white text-lg">Quick Links</h4>
                  <div className="space-y-2 text-gray-300">
                    <Link href="/jobs" className="block hover:text-white transition-colors duration-200">Career Opportunities</Link>
                    <Link href="/ai-interview" className="block hover:text-white transition-colors duration-200">AI Interview</Link>
                    <Link href="/admin" className="block hover:text-white transition-colors duration-200">Admin Portal</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div className="mb-8 lg:mb-0">
                <Link
                  href="#"
                  className="inline-flex items-center bg-[#023da6] hover:bg-[#034bb8] text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  🔗 Visit Corporate Site
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Meyer Industries Limited. All rights reserved. | Crafting excellence since 1951.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
