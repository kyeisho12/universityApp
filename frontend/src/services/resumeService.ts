import { supabase } from '../lib/supabaseClient'

export const RESUME_BUCKET = 'resumes'
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit
export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'] as const

export type ResumeRecord = {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string | null
  status?: string | null
  created_at: string
  updated_at?: string | null
}

export type ResumeWithUrl = ResumeRecord & { signed_url: string | null }

type ResumeInsertPayload = {
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  status: string
  skills?: string[]
  ratings?: Record<string, unknown>
}

const MISSING_COLUMN_ERRORS = [
  "Could not find the 'skills' column",
  "Could not find the 'ratings' column",
] as const

function isMissingOptionalColumnError(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? ''
  return MISSING_COLUMN_ERRORS.some((snippet) => message.includes(snippet))
}

async function insertResumeMetadata(payload: ResumeInsertPayload) {
  const basePayload = {
    user_id: payload.user_id,
    file_name: payload.file_name,
    file_path: payload.file_path,
    file_size: payload.file_size,
    file_type: payload.file_type,
    status: payload.status,
  }

  // Try writing parser-enriched metadata first; fallback keeps uploads working on older schemas.
  const enrichedPayload = {
    ...basePayload,
    skills: payload.skills,
    ratings: payload.ratings,
  }

  const firstAttempt = await supabase.from('resumes').insert(enrichedPayload).select().single()
  if (!firstAttempt.error) return firstAttempt
  if (!isMissingOptionalColumnError(firstAttempt.error)) return firstAttempt

  return supabase.from('resumes').insert(basePayload).select().single()
}

function sanitizeFileName(originalName: string) {
  const trimmed = originalName.trim()
  const name = trimmed || 'resume'
  return name
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}

export function validateResumeFile(file: File): string | null {
  if (!file) return 'No file selected.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File too large. Maximum size is 5MB.'
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return 'Unsupported format. Please upload a PDF, DOC, or DOCX file.'
  }
  return null
}

async function getSignedUrl(filePath: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(filePath, expiresInSeconds)
  if (error) {
    console.warn('Failed to create signed URL for resume', error)
    return null
  }
  return data?.signedUrl ?? null
}

export async function listResumes(userId: string) {
  if (!userId) return { data: [] as ResumeWithUrl[], error: new Error('User not authenticated') }

  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: [] as ResumeWithUrl[], error }

  const withUrls: ResumeWithUrl[] = await Promise.all(
    (data ?? []).map(async (row) => ({ ...row, signed_url: await getSignedUrl(row.file_path) }))
  )

  return { data: withUrls, error: null }
}

export async function uploadResume(file: File, userId: string) {
  const validationMessage = validateResumeFile(file)
  if (validationMessage) return { data: null as ResumeWithUrl | null, error: new Error(validationMessage) }
  if (!userId) return { data: null as ResumeWithUrl | null, error: new Error('User not authenticated') }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
  const safeName = sanitizeFileName(file.name) || `resume.${ext}`
  const objectPath = `${userId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from(RESUME_BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (uploadError) return { data: null as ResumeWithUrl | null, error: uploadError }

  // Call backend resume parsing API
  let skills: string[] = [];
  let ratings: any = {};
  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/resume/parse', {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) {
      const result = await resp.json();
      skills = Array.isArray(result.skills) ? result.skills : [];
      ratings = result.ratings || {};
    }
  } catch (e) {
    console.warn('Resume parsing failed:', e);
  }

  const { data, error } = await insertResumeMetadata({
    user_id: userId,
    file_name: file.name,
    file_path: objectPath,
    file_size: file.size,
    file_type: file.type || `.${ext}`,
    status: 'active',
    skills,
    ratings,
  })

  if (error) {
    await supabase.storage.from(RESUME_BUCKET).remove([objectPath])
    return { data: null as ResumeWithUrl | null, error }
  }

  const signedUrl = await getSignedUrl(objectPath)
  return { data: { ...data, signed_url: signedUrl }, error: null }
}

export async function deleteResume(id: string, filePath: string, userId: string) {
  if (!id || !filePath) return { data: null, error: new Error('Missing resume id or file path') }
  if (!userId) return { data: null, error: new Error('User not authenticated') }

  const { error: deleteError } = await supabase.from('resumes').delete().eq('id', id).eq('user_id', userId)
  if (deleteError) return { data: null, error: deleteError }

  const { error: storageError } = await supabase.storage.from(RESUME_BUCKET).remove([filePath])
  if (storageError) {
    console.warn('Resume metadata deleted but file removal failed', storageError)
  }

  return { data: true, error: null }
}

export async function createResumeFromBlob(
  pdfBlob: Blob,
  fileName: string,
  userId: string,
  extractedSkills: string[] = [],
  extractedRatings: any = {}
) {
  if (!userId) return { data: null as ResumeWithUrl | null, error: new Error('User not authenticated') }
  
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
  const safeName = sanitizeFileName(fileName) || `resume.${ext}`
  const objectPath = `${userId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from(RESUME_BUCKET).upload(objectPath, pdfBlob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  })

  if (uploadError) return { data: null as ResumeWithUrl | null, error: uploadError }

  const { data, error } = await insertResumeMetadata({
    user_id: userId,
    file_name: fileName,
    file_path: objectPath,
    file_size: pdfBlob.size,
    file_type: 'application/pdf',
    status: 'active',
    skills: extractedSkills,
    ratings: extractedRatings,
  })

  if (error) {
    await supabase.storage.from(RESUME_BUCKET).remove([objectPath])
    return { data: null as ResumeWithUrl | null, error }
  }

  const signedUrl = await getSignedUrl(objectPath)
  return { data: { ...data, signed_url: signedUrl }, error: null }
}

export async function getDownloadUrl(filePath: string) {
  if (!filePath) return null
  return getSignedUrl(filePath)
}
