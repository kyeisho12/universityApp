-- Resume storage + metadata setup for Supabase
-- Run this script in the Supabase SQL editor after supabase_setup.sql

-- Use direct insert/update to avoid create_bucket signature differences across Supabase versions
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
where id = 'resumes';

-- 2) Metadata table
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_path text not null unique,
  file_type text,
  file_size integer not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reuse the updated_at trigger helper if present; create it if missing.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'handle_updated_at') then
    create or replace function public.handle_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end
$$;

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
before update on public.resumes
for each row execute function public.handle_updated_at();

create index if not exists idx_resumes_user_created on public.resumes (user_id, created_at desc);

-- 3) Row Level Security
alter table public.resumes enable row level security;

drop policy if exists "Users can view own resumes" on public.resumes;
create policy "Users can view own resumes"
  on public.resumes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
  on public.resumes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
  on public.resumes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can manage all resumes" on public.resumes;
create policy "Admins can manage all resumes"
  on public.resumes
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 4) Storage RLS for bucket
-- Allow authenticated users to upload, read, and delete only within the resumes bucket.
drop policy if exists "Resume uploads" on storage.objects;
create policy "Resume uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'resumes' and auth.role() = 'authenticated');

drop policy if exists "Resume downloads" on storage.objects;
create policy "Resume downloads"
  on storage.objects
  for select
  using (
    bucket_id = 'resumes' and (
      owner = auth.uid() or
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists "Resume deletions" on storage.objects;
create policy "Resume deletions"
  on storage.objects
  for delete
  using (
    bucket_id = 'resumes' and (
      owner = auth.uid() or
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );
