# Applications Table Migration

## Create Applications Table for Job Application Management

### SQL Commands to run in Supabase SQL Editor:

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

-- Create indexes for better performance
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(email);

-- Create RLS policies for applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow admins to do everything
CREATE POLICY "Admin full access to applications" ON applications
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE email = 'admin@example.com'
    )
  );

-- Allow users to view their own applications
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (
    auth.uid() = user_id OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow anyone to create applications (for public job applications)
CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Storage Bucket for Resumes

```sql
-- Create storage bucket for resumes (run this in SQL editor)
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

### Field Descriptions:

1. **job_id** (UUID) - References the job posting
2. **user_id** (UUID) - References authenticated user (null for guest applications)
3. **full_name** (TEXT) - Applicant's full name
4. **email** (TEXT) - Contact email
5. **phone** (TEXT) - Phone number
6. **resume_url** (TEXT) - URL to uploaded resume file
7. **cover_letter** (TEXT) - Cover letter content
8. **linkedin_url** (TEXT) - LinkedIn profile URL
9. **portfolio_url** (TEXT) - Portfolio website URL
10. **expected_salary** (TEXT) - Salary expectations
11. **start_date** (DATE) - Available start date
12. **additional_info** (TEXT) - Additional information
13. **status** (TEXT) - Application status (pending, reviewing, shortlisted, interview_scheduled, rejected, hired)
14. **admin_notes** (TEXT) - Internal admin notes about the application

### Application Status Flow:
- **pending** → Initial status when application is submitted
- **reviewing** → Admin is reviewing the application  
- **shortlisted** → Application passed initial review
- **interview_scheduled** → Interview has been scheduled
- **rejected** → Application was not successful
- **hired** → Candidate was hired 