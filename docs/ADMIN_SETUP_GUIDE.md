# Admin Page Setup Guide

## Overview
This guide will help you set up the admin page for managing all users in your UniversityApp system using Supabase.

## ✅ What Has Been Created

1. **Database Schema** ([database/supabase_setup.sql](database/supabase_setup.sql))
   - `profiles` table for user metadata
   - Automatic profile creation triggers
   - Row Level Security (RLS) policies
   - Admin-only access controls

2. **Admin Service** ([frontend/src/services/adminService.js](frontend/src/services/adminService.js))
   - `getAllUsers()` - Get all registered users
   - `getUsersByRole()` - Filter users by role
   - `updateUserRole()` - Change user roles
  - `setUserActiveStatus()` - Enable/disable users
   - `searchUsers()` - Search functionality
   - `getUserStats()` - User statistics
   - `isCurrentUserAdmin()` - Check admin access

3. **Admin Dashboard Page** ([frontend/src/pages/AdminDashboardPage.jsx](frontend/src/pages/AdminDashboardPage.jsx))
   - User statistics overview
   - Navigation tabs for different management sections
   - Admin-only access protection

4. **User Management Component** ([frontend/src/components/admin/UserManagement.jsx](frontend/src/components/admin/UserManagement.jsx))
   - View all users in a table
   - Search and filter capabilities
   - Change user roles (student/admin/recruiter)
   - Delete users
   - View detailed user information

## 🚀 Setup Instructions

### Step 1: Run Database Migration in Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy the entire content from `database/supabase_setup.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

This will create:
- The `profiles` table
- Automatic triggers to create profiles when users sign up
- Row Level Security policies to protect user data
- Indexes for better performance

### Step 2: Create Your First Admin User

After running the migration, you need to designate an admin:

1. **Sign up** for an account through your app's registration form
2. Go back to **Supabase SQL Editor**
3. Run this query (replace with your email):

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

4. Sign out and sign back in to your app

### Step 3: Update Your App Routing

Make sure your routing includes the admin dashboard. In your `App.jsx` or router file, add:

```jsx
import AdminDashboardPage from './pages/AdminDashboardPage'

// In your routes
<Route path="/admin" element={<AdminDashboardPage />} />
```

### Step 4: Add Navigation to Admin Dashboard

In your main navigation or user menu, add a link for admins:

```jsx
import { isCurrentUserAdmin } from './services/adminService'
import { useEffect, useState } from 'react'

function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false)
  
  useEffect(() => {
    checkAdmin()
  }, [])
  
  const checkAdmin = async () => {
    const adminStatus = await isCurrentUserAdmin()
    setIsAdmin(adminStatus)
  }
  
  return (
    <nav>
      {/* other nav items */}
      {isAdmin && (
        <a href="/admin">Admin Dashboard</a>
      )}
    </nav>
  )
}
```

## 🔒 Security Features

### Row Level Security (RLS)
The database schema includes RLS policies that ensure:

- **Students can only view/edit their own profile**
- **Admins can view/edit all profiles**
- **Only admins can delete users**
- **Role changes require admin privileges**

### Frontend Protection
- Admin pages check for admin role before rendering
- Non-admin users are automatically redirected
- All admin API calls are validated server-side

## 📊 Features

### User Management Dashboard
- **Search**: Find users by name, email, or university
- **Filter**: Filter users by role (student/admin/recruiter)
- **Role Management**: Change user roles with dropdown
- **Disable/Enable Users**: Temporarily revoke or restore access
- **View Details**: See complete user profiles
- **Statistics**: Overview of total users and breakdown by role

### User Roles
- **Student**: Regular user with limited access
- **Recruiter**: Can post jobs and manage interviews
- **Admin**: Full system access and user management

## 🎯 Usage Examples

### Get All Users
```javascript
import { getAllUsers } from './services/adminService'

const users = await getAllUsers()
console.log(users)
```

### Check if User is Admin
```javascript
import { isCurrentUserAdmin } from './services/adminService'

const isAdmin = await isCurrentUserAdmin()
if (isAdmin) {
  // Show admin features
}
```

### Update User Role
```javascript
import { updateUserRole } from './services/adminService'

await updateUserRole(userId, 'recruiter')
```

### Search Users
```javascript
import { searchUsers } from './services/adminService'

const results = await searchUsers('john')
```

## 🔧 Customization

### Adding New Fields to Profiles

1. Update the `profiles` table in Supabase:
```sql
ALTER TABLE public.profiles
ADD COLUMN linkedin_url TEXT;
```

2. Update the User Management component to display the new field

### Adding More Roles

1. Update the table constraint:
```sql
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'admin', 'recruiter', 'mentor'));
```

2. Update the frontend role selects to include the new role

## 🐛 Troubleshooting

### Users can't be loaded
- Check that you've run the SQL migration
- Verify your Supabase connection in `.env` file
- Check browser console for errors

### Not showing as admin after update
- Sign out and sign back in
- Check the profiles table directly in Supabase
- Verify the RLS policies were created

### Permission denied errors
- Ensure RLS policies are active
- Check that the user's role is correctly set
- Verify Supabase API keys are correct

## 📝 Next Steps

1. ✅ Run the database migration
2. ✅ Create your first admin user
3. ✅ Test the admin dashboard
4. Consider adding:
   - User activity logs
   - Bulk actions (bulk delete, bulk role changes)
   - Export user data to CSV
   - Email notifications when role changes
   - User suspension/ban functionality

## 🔗 Related Files

- Database Schema: [database/supabase_setup.sql](database/supabase_setup.sql)
- Admin Service: [frontend/src/services/adminService.js](frontend/src/services/adminService.js)
- Admin Dashboard: [frontend/src/pages/AdminDashboardPage.jsx](frontend/src/pages/AdminDashboardPage.jsx)
- User Management: [frontend/src/components/admin/UserManagement.jsx](frontend/src/components/admin/UserManagement.jsx)
- Styles: [frontend/src/styles/AdminDashboard.css](frontend/src/styles/AdminDashboard.css)

## 💡 Tips

- Always test admin features with a test account first
- Regularly backup your Supabase database
- Monitor admin actions for security
- Keep admin credentials secure
- Consider implementing audit logs for admin actions
