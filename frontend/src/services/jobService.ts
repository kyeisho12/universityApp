import { supabase } from '../lib/supabaseClient'

export interface Job {
  id?: string
  employer_id: string
  title: string
  description?: string
  requirements?: string[]
  category: string
  job_type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract'
  location: string
  salary_range?: string
  deadline: string
  status?: 'active' | 'closed' | 'archived'
  applications_count?: number
  created_at?: string
  updated_at?: string
}

export interface JobWithEmployer extends Job {
  employer_name?: string
  employer_website?: string
}

/**
 * Get all active jobs with employer information
 */
export async function getAllJobs(includeInactive = false): Promise<JobWithEmployer[]> {
  try {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          name,
          website
        )
      `)
      .order('deadline', { ascending: true })
    
    // Filter to active jobs unless explicitly requested
    if (!includeInactive) {
      query = query.eq('status', 'active')
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Transform data to flatten employer info
    return (data || []).map((job: any) => ({
      ...job,
      employer_name: job.employer?.name,
      employer_website: job.employer?.website
    }))
  } catch (error) {
    console.error('Error fetching jobs:', error)
    throw error
  }
}

/**
 * Get jobs by employer
 */
export async function getJobsByEmployer(employerId: string, includeInactive = false): Promise<Job[]> {
  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
    
    if (!includeInactive) {
      query = query.eq('status', 'active')
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching jobs by employer:', error)
    throw error
  }
}

/**
 * Get a specific job by ID
 */
export async function getJobById(jobId: string): Promise<JobWithEmployer | null> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          name,
          website
        )
      `)
      .eq('id', jobId)
      .single()
    
    if (error) throw error
    if (!data) return null
    
    return {
      ...data,
      employer_name: data.employer?.name,
      employer_website: data.employer?.website
    }
  } catch (error) {
    console.error('Error fetching job:', error)
    throw error
  }
}

/**
 * Create a new job posting
 */
export async function createJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'applications_count'>): Promise<Job> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        employer_id: job.employer_id,
        title: job.title,
        description: job.description || null,
        requirements: job.requirements || [],
        category: job.category,
        job_type: job.job_type,
        location: job.location,
        salary_range: job.salary_range || null,
        deadline: job.deadline,
        status: 'active',
        applications_count: 0
      })
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to create job')
    
    return data
  } catch (error) {
    console.error('Error creating job:', error)
    throw error
  }
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<Job> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Failed to update job')
    
    return data
  } catch (error) {
    console.error('Error updating job:', error)
    throw error
  }
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
    
    if (error) throw error
  } catch (error) {
    console.error('Error deleting job:', error)
    throw error
  }
}

/**
 * Close a job (set status to closed)
 */
export async function closeJob(jobId: string): Promise<Job> {
  try {
    return await updateJob(jobId, { status: 'closed' })
  } catch (error) {
    console.error('Error closing job:', error)
    throw error
  }
}

/**
 * Archive a job (set status to archived)
 */
export async function archiveJob(jobId: string): Promise<Job> {
  try {
    return await updateJob(jobId, { status: 'archived' })
  } catch (error) {
    console.error('Error archiving job:', error)
    throw error
  }
}

/**
 * Search jobs by title, description, or location
 */
export async function searchJobs(query: string, includeInactive = false): Promise<JobWithEmployer[]> {
  try {
    let supabaseQuery = supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          name,
          website
        )
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
    
    if (!includeInactive) {
      supabaseQuery = supabaseQuery.eq('status', 'active')
    }
    
    const { data, error } = await supabaseQuery
    
    if (error) throw error
    
    return (data || []).map((job: any) => ({
      ...job,
      employer_name: job.employer?.name,
      employer_website: job.employer?.website
    }))
  } catch (error) {
    console.error('Error searching jobs:', error)
    throw error
  }
}

/**
 * Get jobs by category
 */
export async function getJobsByCategory(category: string, includeInactive = false): Promise<JobWithEmployer[]> {
  try {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          name,
          website
        )
      `)
      .eq('category', category)
      .order('deadline', { ascending: true })
    
    if (!includeInactive) {
      query = query.eq('status', 'active')
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return (data || []).map((job: any) => ({
      ...job,
      employer_name: job.employer?.name,
      employer_website: job.employer?.website
    }))
  } catch (error) {
    console.error('Error fetching jobs by category:', error)
    throw error
  }
}

/**
 * Increment application count for a job
 */
export async function incrementApplicationCount(jobId: string): Promise<Job> {
  try {
    const job = await getJobById(jobId)
    if (!job) throw new Error('Job not found')
    
    const newCount = (job.applications_count || 0) + 1
    return await updateJob(jobId, { applications_count: newCount })
  } catch (error) {
    console.error('Error incrementing application count:', error)
    throw error
  }
}
