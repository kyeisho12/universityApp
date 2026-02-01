# Dashboard Setup and Testing Guide

## Overview
The dashboard has been updated to display real data from Supabase. It now shows:
- Active job listings count and list
- User's resume count
- Upcoming events count and list
- Mock interviews count

## Backend Implementation

### New API Endpoints Created

#### 1. Jobs API (`/api/jobs`)
- **GET /api/jobs** - Get all active jobs with optional filtering
  - Query params: `status`, `category`, `job_type`, `location`, `include_inactive`
  - Returns: List of jobs with employer information
  
- **GET /api/jobs/<job_id>** - Get specific job details
- **GET /api/jobs/by-employer/<employer_id>** - Get jobs by specific employer
- **GET /api/jobs/search** - Search jobs by keyword
- **POST /api/jobs** - Create new job (admin only)
- **PUT /api/jobs/<job_id>** - Update job (admin only)
- **DELETE /api/jobs/<job_id>** - Delete job (admin only)

**Service**: `app/services/job_service.py` - Handles Supabase REST API calls for jobs

#### 2. Resumes API (`/api/resumes`)
- **GET /api/resumes/user/<user_id>** - Get all resumes for a user
- **GET /api/resumes/user/<user_id>/count** - Get resume count
- **GET /api/resumes/<resume_id>** - Get specific resume
- **POST /api/resumes** - Create resume record
- **PUT /api/resumes/<resume_id>** - Update resume
- **DELETE /api/resumes/<resume_id>** - Delete resume

**Service**: `app/services/resume_service.py` - Handles Supabase REST API calls for resumes

#### 3. Interviews API (`/api/interviews`)
- **GET /api/interviews/user/<user_id>** - Get all interviews for a user
- **GET /api/interviews/user/<user_id>/count** - Get interview count
- **GET /api/interviews/<interview_id>** - Get specific interview
- **POST /api/interviews** - Create interview record
- **PUT /api/interviews/<interview_id>** - Update interview
- **DELETE /api/interviews/<interview_id>** - Delete interview

**Service**: `app/services/interview_service.py` - Handles Supabase REST API calls for interviews

## Frontend Implementation

### Dashboard Component Updates

**File**: `frontend/src/components/student/Dashboard.tsx`

Changes made:
1. Added state management for dashboard data:
   - `jobsCount`, `resumesCount`, `eventsCount`, `interviewsCount`
   - `jobs`, `events` arrays for displaying items
   - `loading` state for loading indicators

2. Added `useEffect` hook to fetch data on component mount:
   ```typescript
   - Fetches all active jobs (limited to 5)
   - Fetches upcoming events
   - Fetches user's resumes (if logged in)
   - Fetches user's interviews (if logged in)
   ```

3. Updated UI to display real data:
   - StatCards now show actual counts instead of hardcoded "0"
   - Job listings section shows real jobs or loading skeleton
   - Events section shows upcoming events or empty state
   - Loading states with skeleton screens for better UX

### Data Flow

```
Dashboard Component
├── useEffect on mount
│   ├── Fetch Jobs (all active)
│   ├── Fetch Events (upcoming)
│   ├── Fetch Resumes (for current user)
│   └── Fetch Interviews (for current user)
├── Update State with fetched data
└── Re-render with:
    ├── Updated stat counts
    ├── Job listings
    ├── Event listings
    └── Loading states
```

## Database Setup

### Required Tables

The dashboard requires these Supabase tables:
1. **jobs** - Job postings with employer references
2. **employers** - Company information
3. **career_events** - Career events and announcements
4. **resumes** - User resume storage metadata
5. **interviews** - Interview records
6. **profiles** - User profiles with role information

### Sample Data

Run the SQL script to add sample data for testing:

```sql
-- File: database/seed_sample_data.sql
-- This adds:
-- - 3 sample employers (Tech Corp, Finance Plus, Creative Agency)
-- - 3 sample jobs (Engineer, Analyst, Designer)
-- - 4 sample events (Job Fair, Workshop, Seminar, Webinar)
```

**To add sample data:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy contents of `database/seed_sample_data.sql`
5. Run the query

## Testing the Dashboard

### Prerequisites
1. Environment variables set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (backend)
   - `SUPABASE_KEY` (backend)

2. Supabase database set up with required tables

3. Sample data inserted (optional, but helpful for testing)

### Test Steps

1. **Start Backend:**
   ```bash
   cd backend
   python -m flask run
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login** to the application with a student account

4. **Navigate** to Student Dashboard

5. **Verify** the following:
   - [ ] "Active Job Listings" count matches jobs in database
   - [ ] "My Résumés" count matches user's resumes
   - [ ] "Upcoming Events" count matches future events
   - [ ] "Mock Interviews" count matches user's interviews
   - [ ] Job listings display with title, company, location, type
   - [ ] Event listings display with title, type, date
   - [ ] Loading states work (skeleton screens appear initially)
   - [ ] "View All" buttons navigate correctly
   - [ ] "Start Mock Interview" button works
   - [ ] Empty states display appropriately when no data

### Test Data Scenarios

**Scenario 1: Full Dashboard**
- Add multiple jobs, events, resumes, and interviews
- Verify all counts are accurate
- Verify listings display properly

**Scenario 2: Empty Dashboard**
- Use a new user with no data
- Verify empty states display correctly
- Verify counts show "0"

**Scenario 3: Partial Data**
- Add only jobs
- Verify other sections show empty state
- Verify counts are accurate

## Troubleshooting

### Dashboard shows "0" for all counts
1. Check sample data was inserted into Supabase
2. Verify Supabase environment variables are correct
3. Check browser console for errors
4. Verify user is authenticated

### Jobs/Events not displaying
1. Check Supabase tables have data
2. Verify RLS policies allow reading data
3. Check network tab in DevTools for API errors
4. Check backend logs for service errors

### Loading states persist
1. Check browser console for errors
2. Verify Supabase credentials
3. Check network requests are completing
4. Check for CORS issues

### Component not rendering
1. Verify Dashboard component is imported correctly
2. Check for TypeScript errors
3. Verify all dependencies are installed
4. Clear browser cache and restart dev server

## Future Enhancements

1. Add filters to job/event listings
2. Add search functionality on dashboard
3. Add user-specific recommendations
4. Add job application tracking
5. Add event RSVP status
6. Add resume preview/download
7. Add interview feedback display
8. Add analytics and insights

## Related Files

- **Frontend:**
  - `src/components/student/Dashboard.tsx` - Main dashboard component
  - `src/pages/StudentDashboardPage.tsx` - Page wrapper
  - `src/lib/supabaseClient.js` - Supabase client configuration

- **Backend:**
  - `app/api/jobs.py` - Jobs API endpoints
  - `app/api/resumes.py` - Resumes API endpoints
  - `app/api/interviews.py` - Interviews API endpoints
  - `app/services/job_service.py` - Jobs service
  - `app/services/resume_service.py` - Resumes service
  - `app/services/interview_service.py` - Interviews service

- **Database:**
  - `database/create_jobs_table.sql` - Jobs table schema
  - `database/seed_sample_data.sql` - Sample data (NEW)
