# AI Interview Website

A comprehensive AI-powered interview platform with job management and application tracking capabilities.

## Features

### Job Management System
- **Public Job Listings** (`/jobs`) - Browse available positions with filtering by type, location, and status
- **Job Details** (`/jobs/[id]`) - Detailed job information with responsibilities, requirements, benefits, and application deadlines
- **Job Applications** (`/jobs/[id]/apply`) - Complete application form with resume upload and cover letter
- **Admin Job Management** (`/admin/jobs`) - Full CRUD operations for job postings with enhanced fields

### Application Management System
- **Application Submission** - Candidates can apply with resumes, cover letters, and personal information
- **File Upload Support** - Resume upload with PDF, DOC, DOCX support (5MB limit)
- **Application Tracking** - Complete application lifecycle management
- **Admin Application Review** (`/admin/applications`) - View, filter, and manage all job applications
- **Status Management** - Track applications through: pending → reviewing → shortlisted → interview_scheduled → rejected/hired
- **Interview Scheduling** - Direct integration with interview system from applications

### AI Interview System
- **Interview Scheduling** - Assign interviews to candidates from applications
- **Real-time Video Recording** - 1-minute recording limits per question
- **Speech-to-Text Integration** - Automatic transcription using OpenAI Whisper
- **Interview Analytics** - Admin dashboard for reviewing completed interviews

### Authentication & User Management
- **Role-based Access Control** - Separate admin and user roles
- **User Registration/Login** - Email-based authentication with Supabase
- **Admin User Management** - Create, edit, and manage user accounts

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Services**: OpenAI (GPT for questions, Whisper for STT)
- **File Storage**: Supabase Storage

## Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  location TEXT,
  type TEXT,
  status TEXT DEFAULT 'active',
  department TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  salary_min INTEGER,
  salary_max INTEGER,
  experience_level TEXT,
  employment_type TEXT DEFAULT 'full-time',
  is_remote BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Applications Table
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT NOT NULL,
  linkedin_url TEXT,
  portfolio_url TEXT,
  expected_salary TEXT,
  start_date DATE,
  additional_info TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'rejected', 'hired')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Required Migrations
Before using the enhanced features, run the following SQL in your Supabase dashboard:

#### 1. Jobs Table Enhancement
```sql
-- Add new columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full-time';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;
```

#### 2. Applications Table Creation
```sql
-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT NOT NULL,
  linkedin_url TEXT,
  portfolio_url TEXT,
  expected_salary TEXT,
  start_date DATE,
  additional_info TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'rejected', 'hired')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(email);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin full access to applications" ON applications
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE email = 'admin@example.com'
    )
  );

CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (
    auth.uid() = user_id OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);
```

#### 3. Storage Setup for Resumes
```sql
-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false);

-- Create storage policies
CREATE POLICY "Anyone can upload resumes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Anyone can view resumes" ON storage.objects
  FOR SELECT USING (bucket_id = 'resumes');

CREATE POLICY "Admins can delete resumes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes' AND 
    auth.uid() IN (
      SELECT id FROM users WHERE email = 'admin@example.com'
    )
  );
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd ai-interview-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run database migrations**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run all the migration SQL provided above (Jobs, Applications, Storage)

5. **Start development server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Jobs API
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/[id]` - Get job details
- `PUT /api/jobs/[id]` - Update job (admin only)
- `DELETE /api/jobs/[id]` - Delete job (admin only)

### Applications API
- `GET /api/applications` - List applications (admin only, with filtering)
- `POST /api/applications` - Submit new application (with file upload)
- `GET /api/applications/[id]` - Get application details
- `PUT /api/applications/[id]` - Update application status/notes (admin only)
- `DELETE /api/applications/[id]` - Delete application (admin only)

### Admin APIs
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users` - Update user
- `DELETE /api/admin/users` - Delete user
- `POST /api/admin/users/sync` - Sync auth users with database

### Interview APIs
- `POST /api/interviews` - Create interview
- `GET /api/interviews` - List interviews
- `POST /api/speech-to-text` - Convert speech to text

## Application Management Features

### For Job Seekers (`/jobs/[id]/apply`)
- **Complete Application Form** - Personal information, contact details, and preferences
- **Resume Upload** - Support for PDF, DOC, DOCX files up to 5MB
- **Cover Letter** - Required detailed cover letter submission
- **Portfolio Integration** - LinkedIn and portfolio URL submission
- **Salary Expectations** - Optional salary range input with company range reference
- **Availability** - Start date preferences
- **Real-time Validation** - File type and size validation
- **User Account Integration** - Auto-populate email for logged-in users

### For Admins (`/admin/applications`)
- **Comprehensive Application View** - All application details in organized interface
- **Advanced Filtering** - Filter by job position, application status, and date ranges
- **Status Management** - Update application status through workflow stages
- **Resume Download** - Direct access to uploaded resume files
- **Admin Notes** - Internal notes and comments for each application
- **Interview Scheduling** - One-click integration with interview system
- **Bulk Operations** - Manage multiple applications efficiently
- **Application Timeline** - Track application progress and history

### Application Status Workflow
1. **Pending** → Initial status when application is submitted
2. **Reviewing** → Admin is actively reviewing the application
3. **Shortlisted** → Application passed initial screening
4. **Interview Scheduled** → Interview has been scheduled with candidate
5. **Rejected** → Application was not successful
6. **Hired** → Candidate was successfully hired

## Job Management Features

### For Admins (`/admin/jobs`)
- Create new job postings with rich details
- Edit existing job information
- Set application deadlines
- Configure salary ranges
- Mark positions as remote-friendly
- Organize jobs by departments
- Track job status (active/inactive/closed)

### For Job Seekers (`/jobs`)
- Browse all available positions
- Filter by job type, location, and status
- View detailed job descriptions
- See salary ranges and benefits
- Apply directly through the platform
- Upload resumes and portfolios

### Enhanced Job Fields
- **Responsibilities**: Detailed list of job duties
- **Benefits**: Company perks and benefits
- **Deadline**: Application closing date
- **Salary Range**: Min/max compensation
- **Department**: Organizational category
- **Experience Level**: Entry, Mid, Senior, Lead, Executive
- **Remote Work**: Availability indicator

## File Storage & Security

### Resume Storage
- **Supabase Storage Integration** - Secure file storage with access controls
- **File Organization** - Organized by job ID for easy management
- **Access Control** - Resume files accessible only to admins and file owners
- **Automatic Cleanup** - Files removed when applications are deleted
- **File Validation** - Type and size restrictions enforced

### Security Features
- **Row Level Security (RLS)** - Database-level access controls
- **Admin-only Access** - Sensitive operations restricted to admin users
- **User Data Protection** - Personal information properly secured
- **File Access Controls** - Resume files protected from unauthorized access

## Usage Tips

1. **First Time Setup**: Run all database migrations before creating jobs or accepting applications
2. **Job Creation**: Use the admin panel to create detailed job postings with all enhanced fields
3. **Application Review**: Use filters and status management to efficiently process applications
4. **Interview Integration**: Schedule interviews directly from application reviews
5. **File Management**: Monitor storage usage and clean up old applications as needed
6. **Status Tracking**: Maintain clear application status updates for candidate communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
