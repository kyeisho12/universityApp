# Cover Letter Attachment Feature Implementation

## Task: Allow students to attach cover letter files to job applications

## Status: ✅ COMPLETED

### Changes Made:

### 1. Database: Add cover_letter_id column to applications table ✅
- Created `database/add_cover_letter_id_to_applications.sql`
- Added `cover_letter_id UUID REFERENCES resumes(id)` column to applications table
- Created index for better query performance

### 2. Backend: Update application_service.py ✅
- Added `cover_letter_id` parameter to `submit_application` method

### 3. Frontend: Update applicationService.ts ✅
- Added `coverLetterId` parameter to `submitJobApplication` function
- Updated `Application` interface to include `cover_letter_id`

### 4. Frontend: Update JobsPage.tsx ✅
- Added cover letter document selector in the apply modal
- Filter resumes to show only cover letter documents
- Updated application submission to include cover letter ID
- Added state management for selected cover letter document
- Updated draft persistence to include selected cover letter

### 5. Frontend: Update ApplyOutlookPage.tsx ✅
- Added `coverLetterId` to ApplyOutlookState interface
- Fetch cover letter document using coverLetterId from resumes table
- Generate signed URL for cover letter file download
- Display attached cover letter file with download button

## Feature Summary:
- Students can now attach a cover letter PDF file to their job applications
- Students can either write a text cover letter OR attach a file OR both
- The attached cover letter is stored in the resumes table and referenced via cover_letter_id
- The Apply Outlook page shows the attached cover letter with download option

