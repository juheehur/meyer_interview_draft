# Supabase Jobs Table Migration

## Required Additional Fields for Jobs Table

Please add the following columns to your `jobs` table in the Supabase dashboard:

### SQL Commands to run in Supabase SQL Editor:

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

### Field Descriptions:

1. **responsibilities** (TEXT) - Job responsibilities as newline-separated text or JSON array
2. **benefits** (TEXT) - Company benefits as newline-separated text or JSON array  
3. **deadline** (TIMESTAMP WITH TIME ZONE) - Application deadline date
4. **salary_min** (INTEGER) - Minimum salary range
5. **salary_max** (INTEGER) - Maximum salary range
6. **department** (TEXT) - Department name (e.g., Engineering, Marketing)
7. **experience_level** (TEXT) - Experience level (Entry Level, Mid Level, Senior Level, etc.)
8. **employment_type** (TEXT) - Employment type (defaults to 'full-time')
9. **is_remote** (BOOLEAN) - Whether remote work is available (defaults to false)

### How to Apply:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL commands above
4. Run the migration
5. Verify the new columns appear in your jobs table

After adding these fields, the enhanced job posting system will work with full functionality including:
- Detailed job information display
- Salary ranges
- Application deadlines
- Remote work indicators
- Department categorization
- Experience level filtering 