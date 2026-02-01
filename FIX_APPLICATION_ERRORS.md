# Fix for ApplicationManagement 404 Errors

## Issue
The admin applications page is showing 404 errors because the `applications` table hasn't been created in Supabase yet.

## Solution

### Step 1: Deploy SQL Schema to Supabase
You need to run the SQL script to create the applications table:

1. Go to your Supabase project
2. Open the SQL Editor
3. Copy and paste the entire contents of: `database/create_applications_table.sql`
4. Click "Run" to execute the script

This will create:
- ✅ `applications` table with all required columns
- ✅ Indexes for performance
- ✅ RLS policies for security
- ✅ Triggers for data validation

### Step 2: Verify in Browser
After running the SQL:
1. Refresh the admin applications page
2. The 404 errors should disappear
3. You'll see an empty state (no applications yet since table is new)

### Step 3: Test the Flow
1. Go to student jobs page
2. Click "Apply Now" on a job
3. Check admin applications page - the application should appear

## Why This Works
- The frontend code is correct and ready
- It just needs the database table to exist
- Once the table exists, all queries will work properly
- RLS policies will automatically handle security

## Quick Deployment Steps
```
1. Open Supabase Dashboard
   ↓
2. Navigate to SQL Editor
   ↓
3. Create New Query
   ↓
4. Copy contents of database/create_applications_table.sql
   ↓
5. Paste into SQL Editor
   ↓
6. Click "Run"
   ↓
7. Refresh browser
```

No code changes needed - just create the database table!
