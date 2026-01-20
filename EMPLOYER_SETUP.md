# Backend Setup Instructions for Employer Partners Feature

## Step 1: Install Dependencies

Run this command in the `backend` folder:

```bash
pip install -r requirements.txt
```

This will install:
- Flask and Flask-CORS
- python-dotenv (for environment variables)
- supabase-py (to connect to Supabase)
- requests (for HTTP)

## Step 2: Get Your Supabase Credentials

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **API** (or **Project Settings**)
3. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon Public Key** (the public/anon key)

## Step 3: Update Your .env File

Edit `backend/.env` and add:

```
FLASK_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_public_key_here
CORS_ORIGINS=*
```

**Important:** Replace with your actual Supabase URL and key!

## Step 4: Run the SQL Migration

1. Go to Supabase Dashboard
2. Open the **SQL Editor**
3. Create a new query and copy the entire contents of `database/create_employers_table.sql`
4. Click **Run** to create the employers table

## Step 5: Start the Backend Server

From the `backend` folder:

```bash
python run.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

## Step 6: Test in Frontend

Now go to your frontend (http://localhost:5173/admin/employer_partners) and try:
1. Click "Add Company"
2. Fill in the form
3. Click "Add Company"
4. Check Supabase dashboard to see if the company was created

## Troubleshooting

**Error: "Failed to add company"**
- Make sure backend is running on port 5000
- Check that SUPABASE_URL and SUPABASE_KEY are correct in `.env`
- Check terminal for error messages

**Error: "Cannot find module"**
- Run `pip install -r requirements.txt` again

**No data in Supabase**
- Check Supabase RLS policies are set correctly
- Verify employers table exists in Supabase
