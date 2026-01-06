# Admin System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER REGISTRATION                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │  Register.jsx   │
                    │  (Frontend)     │
                    └─────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │ authService.js  │
                    │  signUp()       │
                    └─────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │ Supabase Auth   │
                    │ auth.users      │ ← Stores credentials
                    └─────────────────┘
                              │
                              ↓ (Trigger fires automatically)
                              │
                    ┌─────────────────┐
                    │ Trigger         │
                    │ handle_new_user │
                    └─────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │ Supabase DB     │
                    │ public.profiles │ ← Stores user metadata
                    └─────────────────┘
                              │
                              ↓
                    User is now in system!


┌─────────────────────────────────────────────────────────────┐
│                     ADMIN ACCESS FLOW                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                  ┌──────────────────────┐
                  │ User navigates to    │
                  │ /admin               │
                  └──────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  AdminDashboardPage.jsx          │
           │  - Checks if user is admin       │
           │  - Loads user statistics         │
           └──────────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  adminService.js                 │
           │  - isCurrentUserAdmin()          │
           │  - getUserStats()                │
           └──────────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  Supabase RLS Policies           │
           │  ✓ Check: Is user.role='admin'?  │
           └──────────────────────────────────┘
                      │              │
                  YES │              │ NO
                      ↓              ↓
           ┌──────────────┐   ┌──────────────┐
           │ Grant Access │   │ Deny Access  │
           │ Show all     │   │ Redirect to  │
           │ users        │   │ home page    │
           └──────────────┘   └──────────────┘


┌─────────────────────────────────────────────────────────────┐
│                  USER MANAGEMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  UserManagement.jsx              │
           │  (Admin Component)               │
           └──────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ↓             ↓             ↓
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Search   │  │ Filter   │  │ Update   │
        │ Users    │  │ by Role  │  │ Role     │
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                │             │             │
                └─────────────┼─────────────┘
                              ↓
           ┌──────────────────────────────────┐
           │  adminService.js                 │
           │  - getAllUsers()                 │
           │  - searchUsers()                 │
           │  - updateUserRole()              │
           │  - setUserActiveStatus()         │
           └──────────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  Supabase API                    │
           │  + RLS Policies                  │
           └──────────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────┐
           │  public.profiles                 │
           │  (Data updated/retrieved)        │
           └──────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────┐
│              auth.users (Supabase)              │
│                                                 │
│  - id (UUID) PRIMARY KEY                        │
│  - email                                        │
│  - encrypted_password                           │
│  - email_confirmed_at                           │
│  - created_at                                   │
└─────────────────────────────────────────────────┘
                    │
                    │ Foreign Key (CASCADE)
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│           public.profiles (Custom)              │
│                                                 │
│  - id (UUID) → references auth.users(id)        │
│  - email (TEXT)                                 │
│  - full_name (TEXT)                             │
│  - avatar_url (TEXT)                            │
│  - role (TEXT) DEFAULT 'student'                │
│    ↳ CHECK: 'student' | 'admin' | 'recruiter'   │
│  - phone (TEXT)                                 │
│  - university (TEXT)                            │
│  - major (TEXT)                                 │
│  - graduation_year (INTEGER)                    │
│  - bio (TEXT)                                   │
│  - created_at (TIMESTAMP)                       │
│  - updated_at (TIMESTAMP)                       │
└─────────────────────────────────────────────────┘
```

## Row Level Security (RLS) Policies

```
┌─────────────────────────────────────────────────────┐
│                  RLS Policies                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. "Users can view own profile"                    │
│     SELECT WHERE auth.uid() = id                    │
│                                                     │
│  2. "Users can update own profile"                  │
│     UPDATE WHERE auth.uid() = id                    │
│                                                     │
│  3. "Admins can view all profiles"                  │
│     SELECT WHERE EXISTS (                           │
│       SELECT 1 FROM profiles                        │
│       WHERE id = auth.uid() AND role = 'admin'      │
│     )                                               │
│                                                     │
│  4. "Admins can update all profiles"                │
│     UPDATE WHERE EXISTS (...)                       │
│                                                     │
│  5. "Admins can delete profiles"                    │
│     DELETE WHERE EXISTS (...)                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.jsx
│
├── Route: /register
│   └── Register.jsx
│       └── authService.signUp()
│           └── Supabase Auth
│
├── Route: /login
│   └── Login.jsx
│       └── authService.signIn()
│
└── Route: /admin (Protected)
    └── AdminDashboardPage.jsx
        │
        ├── Header (Stats Overview)
        │   └── getUserStats() → Shows counts
        │
        ├── Tabs Navigation
        │   ├── Users (Active)
        │   ├── Jobs
        │   ├── Events
        │   ├── Interviews
        │   └── Reports
        │
        └── Tab Content
            └── UserManagement.jsx
                │
                ├── Search & Filter Controls
                │   ├── Search Input
                │   ├── Role Filter Dropdown
                │   └── Refresh Button
                │
                ├── Users Table
                │   ├── Name Column
                │   ├── Email Column
                │   ├── Role Dropdown (editable)
                │   ├── University Column
                │   ├── Actions Column
                │   │   ├── Edit Button → View Details Modal
                │   │   └── Delete Button → Confirm Modal
                │
                └── Modals
                    ├── User Details Modal
                    └── Delete Confirmation Modal
```

## API Service Layer

```
┌─────────────────────────────────────────────────┐
│           adminService.js (API Layer)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  User Queries:                                  │
│  ├─ getAllUsers()                               │
│  ├─ getUsersByRole(role)                        │
│  ├─ getUserById(userId)                         │
│  └─ searchUsers(searchTerm)                     │
│                                                 │
│  User Mutations:                                │
│  ├─ updateUserProfile(userId, updates)          │
│  ├─ updateUserRole(userId, newRole)             │
│  └─ setUserActiveStatus(userId, isActive)       │
│                                                 │
│  Statistics:                                    │
│  └─ getUserStats()                              │
│                                                 │
│  Auth Helpers:                                  │
│  ├─ isCurrentUserAdmin()                        │
│  └─ getCurrentUserProfile()                     │
│                                                 │
└─────────────────────────────────────────────────┘
                    │
                    ↓
         Uses supabase client from:
       frontend/src/lib/supabaseClient.js
```

## Security Layers

```
┌──────────────────────────────────────────────┐
│         Security Layer 1: Frontend           │
│  - isCurrentUserAdmin() check                │
│  - Redirect non-admins to home page          │
│  - Hide admin navigation for non-admins      │
└──────────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────┐
│      Security Layer 2: Supabase Client       │
│  - RLS policies enforced on all queries      │
│  - User's JWT token sent with requests       │
└──────────────────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────┐
│       Security Layer 3: Database RLS         │
│  - PostgreSQL Row Level Security             │
│  - Checks user's role in database            │
│  - Returns only authorized rows              │
└──────────────────────────────────────────────┘
```

## Data Flow Example: Changing User Role

```
1. Admin clicks role dropdown in UserManagement table
   │
   ↓
2. handleRoleChange(userId, 'recruiter') called
   │
   ↓
3. adminService.updateUserRole(userId, 'recruiter')
   │
   ↓
4. Supabase query:
   UPDATE profiles SET role = 'recruiter' WHERE id = userId
   │
   ↓
5. RLS Policy checks: Is current user an admin?
   │
   ├─ YES → Update allowed, proceed
   │  │
   │  ↓
   │  Database updates role
   │  │
   │  ↓
   │  Success response returned
   │  │
   │  ↓
   │  Frontend updates local state
   │  │
   │  ↓
   │  User sees updated role in table
   │
   └─ NO → Update denied
      │
      ↓
      Error: "new row violates row-level security policy"
      │
      ↓
      Frontend shows error message
```

## File Dependencies

```
AdminDashboardPage.jsx
    ├── imports: adminService.js
    │   └── imports: lib/supabaseClient.js
    │       └── uses: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    │
    ├── imports: UserManagement.jsx
    │   ├── imports: adminService.js
    │   └── imports: styles/UserManagement.css
    │
    └── imports: styles/AdminDashboard.css

Register.jsx
    ├── imports: authService.js
    │   └── imports: lib/supabaseClient.js
    │
    └── imports: styles/Auth.css
```
