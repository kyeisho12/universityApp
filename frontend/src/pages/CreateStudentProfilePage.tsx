import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { queryCache } from '../utils/queryCache'
import {
  sanitizeName,
  sanitizePhone,
  sanitizeText,
  sanitizeBio,
  validatePhoneNumber,
  validateYear,
  validateDateRange,
  validateYearRange,
  validateWorkExperience,
  validateEducation,
  ValidationError,
} from '../utils/profileValidation'


interface ProfileForm {
  full_name: string
  student_number: string
  phone: string
  address: string
  university: string
  college: string
  major: string
  graduation_year: string | number | null
  year_level: string | number | null  // Added year level field
  bio: string
  skills_entries: string[]
  education_entries: {
    school: string
    degree: string
    field: string
    start_year: string
    end_year: string
  }[]
  work_experience_entries: {
    title: string
    company: string
    start_date: string
    end_date: string
    description: string
  }[]
  preferred_job_types: string[]
  preferred_industries: string[]
  preferred_locations: string[]
  expected_salary_range: string
}

const UNIVERSITIES = [
  'Tarlac State University',
  'University of the Philippines Diliman',
  'University of the Philippines Los Baños',
  'University of the Philippines Manila',
  'Ateneo de Manila University',
  'De La Salle University',
  'University of Santo Tomas',
  'Mapúa University',
  'Far Eastern University',
  'Polytechnic University of the Philippines',
  'Technological University of the Philippines',
  'Philippine Normal University',
  'Adamson University',
  'Bulacan State University',
  'Cavite State University',
  'Central Luzon State University',
  'Holy Angel University',
  'Nueva Ecija University of Science and Technology',
  'Pampanga State Agricultural University',
  'Saint Louis University',
  'University of Baguio',
  'Benguet State University',
  'Cagayan State University',
  'Isabela State University',
  'Batangas State University',
  'Laguna State Polytechnic University',
  'Lyceum of the Philippines University',
  'Wesleyan University Philippines',
  'Cebu Institute of Technology - University',
  'University of San Carlos',
  'University of the Visayas',
  'Visayas State University',
  'University of San Agustin',
  'Mindanao State University',
  'University of Southeastern Philippines',
  'Xavier University - Ateneo de Cagayan',
  'Ateneo de Davao University',
]

const initialState: ProfileForm = {
  full_name: '',
  student_number: '',
  phone: '',
  address: '',
  university: '',
  college: '',
  major: '',
  graduation_year: '',
  year_level: '',  // Added year level initial state
  bio: '',
  skills_entries: [''],
  education_entries: [{ school: '', degree: '', field: '', start_year: '', end_year: '' }],
  work_experience_entries: [
    { title: '', company: '', start_date: '', end_date: '', description: '' },
  ],
  preferred_job_types: [''],
  preferred_industries: [''],
  preferred_locations: [''],
  expected_salary_range: '',
}

export default function CreateStudentProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, isProfileLoading, saveProfile, isProfileComplete } = useStudent()
  const [formData, setFormData] = useState<ProfileForm>(initialState)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const draftKey = useMemo(() => {
    const id = profile?.id || 'draft'
    return `student_profile_draft_${id}`
  }, [profile?.id])
  const [isDirty, setIsDirty] = useState(false)
  const [universityOpen, setUniversityOpen] = useState(false)
  const universitySuggestions = useMemo(() => {
    if (!universityOpen) return []
    const query = formData.university.toLowerCase()
    if (!query) return UNIVERSITIES.slice(0, 8)
    return UNIVERSITIES.filter((u) => u.toLowerCase().includes(query)).slice(0, 8)
  }, [formData.university, universityOpen])

  const normalizeList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      const cleaned = value.map((item) => `${item}`.trim()).filter(Boolean)
      return cleaned.length > 0 ? cleaned : ['']
    }
    if (typeof value === 'string') {
      const cleaned = value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean)
      return cleaned.length > 0 ? cleaned : ['']
    }
    return ['']
  }

  const toStringValue = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (value == null) return ''
    return String(value)
  }

  const parseSalaryValue = (value: string): number | null => {
    // Don't parse salary range strings (e.g., "30000 - 35000") as numbers
    // Only parse simple numeric values without dashes or spaces
    const trimmed = value.trim()
    // If it contains a dash or space (likely a range), don't parse
    if (trimmed.includes('-') || trimmed.includes(' ') || trimmed.includes('–')) {
      return null
    }
    const cleaned = trimmed.replace(/[^\d.]/g, '')
    if (!cleaned) return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }

  const pageTitle = useMemo(() => (profile && isProfileComplete ? 'Update Profile' : 'Create Your Student Profile'), [
    profile,
    isProfileComplete,
  ])

  useEffect(() => {
    if (profile) {
      let draftData: ProfileForm | null = null
      try {
        const savedDraft = localStorage.getItem(draftKey)
        if (savedDraft) {
          draftData = JSON.parse(savedDraft) as ProfileForm
        }
      } catch (error) {
        console.error('Failed to restore profile draft:', error)
      }

      if (draftData) {
        setFormData(draftData)
        setIsDirty(true)
        return
      }
    }
    if (profile && !isDirty) {
      setFormData({
        full_name: toStringValue(profile.full_name),
        student_number: toStringValue(profile.student_number ?? profile.student_id),
        phone: toStringValue(profile.phone),
        address: toStringValue(profile.address),
        university: toStringValue(profile.university),
        college: toStringValue(profile.college),
        major: toStringValue(profile.major),
        graduation_year: profile.graduation_year ?? '',
        year_level: (profile.year_level as string | number | null | undefined) ?? '',
        bio: toStringValue(profile.bio),
        skills_entries: Array.isArray(profile.skills_entries)
          ? profile.skills_entries
          : profile.skills
          ? String(profile.skills)
              .split(/[\n,]/g)
              .map((item: string) => item.trim())
              .filter(Boolean)
          : [''],
        education_entries: Array.isArray(profile.education_entries) && profile.education_entries.length > 0
          ? profile.education_entries
          : [{ school: '', degree: '', field: '', start_year: '', end_year: '' }],
        work_experience_entries: Array.isArray(profile.work_experience_entries) && profile.work_experience_entries.length > 0
          ? profile.work_experience_entries
          : [{ title: '', company: '', start_date: '', end_date: '', description: '' }],
        preferred_job_types: normalizeList(profile.preferred_job_types ?? profile.job_type),
        preferred_industries: normalizeList(profile.preferred_industries ?? profile.Pref_Industries),
        preferred_locations: normalizeList(profile.preferred_locations ?? profile.Pref_Location),
        expected_salary_range: toStringValue(profile.expected_salary_range ?? profile.Expected_Salary),
      })
    }
  }, [profile, draftKey, isDirty])

  useEffect(() => {
    if (!isDirty) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(formData))
    } catch (error) {
      console.error('Failed to persist profile draft:', error)
    }
  }, [formData, draftKey, isDirty])

  const isEditMode = new URLSearchParams(location.search).get('edit') === '1'
  const showOptionalSections = true  // Always show optional sections including career preferences

  useEffect(() => {
    if (isProfileComplete && !isEditMode) {
      navigate('/', { replace: true })
    }
  }, [isProfileComplete, isEditMode, navigate])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function updateSkill(index: number, value: string) {
    setIsDirty(true)
    setFormData((prev) => {
      const next = [...prev.skills_entries]
      next[index] = value
      return { ...prev, skills_entries: next }
    })
  }

  function addSkill() {
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, skills_entries: [...prev.skills_entries, ''] }))
  }

  function removeSkill(index: number) {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      skills_entries: prev.skills_entries.filter((_, idx) => idx !== index),
    }))
  }

  function updateEducation(index: number, field: string, value: string) {
    setIsDirty(true)
    setFormData((prev) => {
      const next = [...prev.education_entries]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, education_entries: next }
    })
  }

  function addEducation() {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      education_entries: [...prev.education_entries, { school: '', degree: '', field: '', start_year: '', end_year: '' }],
    }))
  }

  function removeEducation(index: number) {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      education_entries: prev.education_entries.filter((_, idx) => idx !== index),
    }))
  }

  function updateWork(index: number, field: string, value: string) {
    setIsDirty(true)
    setFormData((prev) => {
      const next = [...prev.work_experience_entries]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, work_experience_entries: next }
    })
  }

  function addWork() {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      work_experience_entries: [
        ...prev.work_experience_entries,
        { title: '', company: '', start_date: '', end_date: '', description: '' },
      ],
    }))
  }

  function removeWork(index: number) {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      work_experience_entries: prev.work_experience_entries.filter((_, idx) => idx !== index),
    }))
  }

  function updatePreference(listKey: 'preferred_job_types' | 'preferred_industries' | 'preferred_locations', index: number, value: string) {
    setIsDirty(true)
    setFormData((prev) => {
      const next = [...prev[listKey]]
      next[index] = value
      return { ...prev, [listKey]: next }
    })
  }

  function addPreference(listKey: 'preferred_job_types' | 'preferred_industries' | 'preferred_locations') {
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [listKey]: [...prev[listKey], ''] }))
  }

  function removePreference(listKey: 'preferred_job_types' | 'preferred_industries' | 'preferred_locations', index: number) {
    setIsDirty(true)
    setFormData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, idx) => idx !== index),
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')

    // VALIDATION
    const validationErrors: ValidationError[] = []

    // Required field validation
    if (!formData.college) {
      validationErrors.push({
        field: 'college',
        message: 'Please select a college.',
      })
    }

    const requiredTextChecks = [
      { field: 'student_number', label: 'Student number' },
      { field: 'university', label: 'University' },
      { field: 'major', label: 'Major' },
      { field: 'address', label: 'Address' },
      { field: 'bio', label: 'Short bio' },
    ] as const

    requiredTextChecks.forEach(({ field, label }) => {
      const value = sanitizeText(String(formData[field] ?? ''))
      if (!value) {
        validationErrors.push({
          field,
          message: `${label} is required.`,
        })
      }
    })

    // Validate career preferences (now required)
    const validJobTypes = formData.preferred_job_types.filter((item) => sanitizeText(item))
    const validIndustries = formData.preferred_industries.filter((item) => sanitizeText(item))
    const validLocations = formData.preferred_locations.filter((item) => sanitizeText(item))

    if (validJobTypes.length === 0) {
      validationErrors.push({
        field: 'preferred_job_types',
        message: 'Please add at least one preferred job type.',
      })
    }

    if (validIndustries.length === 0) {
      validationErrors.push({
        field: 'preferred_industries',
        message: 'Please add at least one preferred industry.',
      })
    }

    if (validLocations.length === 0) {
      validationErrors.push({
        field: 'preferred_locations',
        message: 'Please add at least one preferred location.',
      })
    }

    // Validate skills, education, and work experience (now required)
    const validSkills = formData.skills_entries.map((s) => sanitizeText(s)).filter(Boolean)
    if (validSkills.length === 0) {
      validationErrors.push({
        field: 'skills_entries',
        message: 'Please add at least one skill or competency.',
      })
    }

    const hasEducation = formData.education_entries.some(
      (entry) => entry.school || entry.degree || entry.field || entry.start_year || entry.end_year
    )
    if (!hasEducation) {
      validationErrors.push({
        field: 'education_entries',
        message: 'Please add at least one education entry.',
      })
    }

    const hasWork = formData.work_experience_entries.some(
      (entry) => entry.title || entry.company || entry.start_date || entry.end_date || entry.description
    )
    if (!hasWork) {
      validationErrors.push({
        field: 'work_experience_entries',
        message: 'Please add at least one work experience entry.',
      })
    }

    // OPTION A: SANITIZATION + OPTION B: FIELD-SPECIFIC VALIDATION

    // Sanitize and validate full name
    const sanitizedName = sanitizeName(formData.full_name)
    if (!sanitizedName) {
      validationErrors.push({
        field: 'full_name',
        message: 'Full name cannot be empty or contain only special characters.',
      })
    }

    // Sanitize and validate phone
    const sanitizedPhone = sanitizePhone(formData.phone)
    if (!sanitizedPhone) {
      validationErrors.push({
        field: 'phone',
        message: 'Phone number cannot be empty.',
      })
    } else {
      const phoneValidation = validatePhoneNumber(sanitizedPhone)
      if (!phoneValidation.valid) {
        validationErrors.push({
          field: 'phone',
          message: phoneValidation.message || 'Invalid phone number.',
        })
      }
    }

    // Validate graduation year
    if (formData.graduation_year) {
      const yearValidation = validateYear(formData.graduation_year, 'Graduation year')
      if (!yearValidation.valid) {
        validationErrors.push({
          field: 'graduation_year',
          message: yearValidation.message || 'Invalid graduation year.',
        })
      }
    }

    // Validate education entries
    formData.education_entries.forEach((entry, index) => {
      if (entry.school || entry.degree || entry.field || entry.start_year || entry.end_year) {
        const eduValidation = validateEducation(entry.school, entry.start_year, entry.end_year)
        if (eduValidation.length > 0) {
          validationErrors.push(
            ...eduValidation.map((err) => ({
              ...err,
              message: `Education ${index + 1}: ${err.message}`,
            }))
          )
        }
      }
    })

    // Validate work experience entries
    formData.work_experience_entries.forEach((entry, index) => {
      if (entry.title || entry.company || entry.start_date || entry.end_date || entry.description) {
        const workValidation = validateWorkExperience(entry.title, entry.start_date, entry.end_date)
        if (workValidation.length > 0) {
          validationErrors.push(
            ...workValidation.map((err) => ({
              ...err,
              message: `Work Experience ${index + 1}: ${err.message}`,
            }))
          )
        }
      }
    })

    // If there are validation errors, display them and return
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map((err) => err.message).join('\n')
      setError(errorMessages)
      return
    }

    // SANITIZE ALL DATA BEFORE SAVING
    const preferredJobTypes = formData.preferred_job_types
      .map((item) => sanitizeText(item))
      .filter(Boolean)
    const preferredIndustries = formData.preferred_industries
      .map((item) => sanitizeText(item))
      .filter(Boolean)
    const preferredLocations = formData.preferred_locations
      .map((item) => sanitizeText(item))
      .filter(Boolean)

    const payload = {
      full_name: sanitizedName,
      student_number: sanitizeText(formData.student_number),
      phone: sanitizedPhone,
      address: sanitizeText(formData.address),
      university: sanitizeText(formData.university),
      college: toStringValue(formData.college).trim(),
      major: sanitizeText(formData.major),
      graduation_year: formData.graduation_year ? Number(formData.graduation_year) : null,
      year_level: formData.year_level ? Number(formData.year_level) : null,
      bio: sanitizeBio(formData.bio),
      skills_entries: formData.skills_entries.map((item) => sanitizeText(item)).filter(Boolean),
      education_entries: formData.education_entries
        .filter(
          (entry) =>
            entry.school || entry.degree || entry.field || entry.start_year || entry.end_year
        )
        .map((entry) => ({
          school: sanitizeText(entry.school),
          degree: sanitizeText(entry.degree),
          field: sanitizeText(entry.field),
          start_year: sanitizeText(entry.start_year),
          end_year: sanitizeText(entry.end_year),
        })),
      work_experience_entries: formData.work_experience_entries
        .filter(
          (entry) =>
            entry.title || entry.company || entry.start_date || entry.end_date || entry.description
        )
        .map((entry) => ({
          title: sanitizeText(entry.title),
          company: sanitizeText(entry.company),
          start_date: sanitizeText(entry.start_date),
          end_date: sanitizeText(entry.end_date),
          description: sanitizeBio(entry.description),
        })),
      preferred_job_types: preferredJobTypes,
      preferred_industries: preferredIndustries,
      preferred_locations: preferredLocations,
      expected_salary_range: sanitizeText(formData.expected_salary_range),
    }

    const { error: saveError } = await saveProfile(payload)
    if (saveError) {
      const errorMessage = (saveError as { message?: string })?.message || 'Failed to save profile'
      setError(errorMessage)
      return
    }
    try {
      localStorage.removeItem(draftKey)
    } catch (error) {
      console.error('Failed to clear profile draft:', error)
    }
    if (profile?.id) {
      queryCache.invalidate(`user-profile-${profile.id}`)
    }
    console.log(payload)
    setMessage('Profile saved successfully')
    setIsDirty(false)
    navigate(isEditMode ? '/student/profile' : '/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-3 py-6 sm:px-4 sm:py-8">
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-neutral-200/60">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
        <p className="text-sm text-neutral-600">Please complete all required fields (*) including your bio and career preferences to access your dashboard.</p>
      </div>
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Full name *
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Student Number *
          <input
            type="text"
            name="student_number"
            value={formData.student_number}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div className="grid gap-1 text-sm font-semibold text-neutral-800">
          University *
          <div className="relative">
            <input
              type="text"
              name="university"
              aria-label="University"
              placeholder="e.g., Tarlac State University"
              value={formData.university}
              onChange={handleChange}
              onFocus={() => setUniversityOpen(true)}
              onBlur={() => setTimeout(() => setUniversityOpen(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Escape') setUniversityOpen(false) }}
              required
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            {universityOpen && universitySuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                {universitySuggestions.map((u) => (
                  <li
                    key={u}
                    onMouseDown={() => {
                      setFormData((prev) => ({ ...prev, university: u }))
                      setUniversityOpen(false)
                    }}
                    className="cursor-pointer px-4 py-2.5 text-sm font-normal text-neutral-800 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          College *
          <select
            name="college"
            value={formData.college}
            onChange={handleChange}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            required
          >
            <option value="">Select College</option>
            <option value="CASS">CASS</option>
            <option value="CAFA">CAFA</option>
            <option value="CBA">CBA</option>
            <option value="CCS">CCS</option>
            <option value="COE">COE</option>
            <option value="CIT">CIT</option>
            <option value="CCJE">CCJE</option>
            <option value="CPAG">CPAG</option>
            <option value="COED">COED</option>
            <option value="COS">COS</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Graduation year *
          <input
            type="number"
            name="graduation_year"
            min="1900"
            max="2100"
            value={formData.graduation_year ?? ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Year Level *
          <select
            name="year_level"
            value={formData.year_level ?? ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Select Year Level</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
        Phone *
        <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Address *
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Short bio *
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            required
            maxLength={500}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <span className={`text-xs text-right ${formData.bio.length >= 480 ? 'text-amber-500' : 'text-neutral-400'}`}>
            {formData.bio.length}/500
          </span>
        </label>
        {showOptionalSections && (
          <>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Skills & Competencies *</span>
                <button
                  type="button"
                  onClick={addSkill}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  + Add Skill
                </button>
              </div>
              {formData.skills_entries.map((skill, index) => (
                <div key={`skill-${index}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    placeholder="e.g., JavaScript"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  {formData.skills_entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Education *</span>
                <button
                  type="button"
                  onClick={addEducation}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  + Add Education
                </button>
              </div>
              {formData.education_entries.map((entry, index) => (
                <div key={`edu-${index}`} className="grid gap-3 rounded-xl border border-neutral-200 p-4">
                  <input
                    type="text"
                    placeholder="School"
                    value={entry.school}
                    onChange={(e) => updateEducation(index, 'school', e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Degree"
                      value={entry.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Field of Study"
                      value={entry.field}
                      onChange={(e) => updateEducation(index, 'field', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Start Year"
                      value={entry.start_year}
                      onChange={(e) => updateEducation(index, 'start_year', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="End Year"
                      value={entry.end_year}
                      onChange={(e) => updateEducation(index, 'end_year', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </div>
                  {formData.education_entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 text-left"
                    >
                      Remove Education
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Work Experience *</span>
                <button
                  type="button"
                  onClick={addWork}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  + Add Experience
                </button>
              </div>
              {formData.work_experience_entries.map((entry, index) => (
                <div key={`work-${index}`} className="grid gap-3 rounded-xl border border-neutral-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Role"
                      value={entry.title}
                      onChange={(e) => updateWork(index, 'title', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={entry.company}
                      onChange={(e) => updateWork(index, 'company', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Start Date"
                      value={entry.start_date}
                      onChange={(e) => updateWork(index, 'start_date', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="End Date"
                      value={entry.end_date}
                      onChange={(e) => updateWork(index, 'end_date', e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="Describe your responsibilities"
                    value={entry.description}
                    onChange={(e) => updateWork(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  {formData.work_experience_entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWork(index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 text-left"
                    >
                      Remove Experience
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Career Preferences *</span>
                {(
                  <button
                    type="button"
                    onClick={() => addPreference('preferred_job_types')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Job Type
                  </button>
                )}
              </div>
              {formData.preferred_job_types.map((item, index) => (
                <div key={`job-type-${index}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePreference('preferred_job_types', index, e.target.value)}
                    placeholder="e.g., Internship"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  {isEditMode && formData.preferred_job_types.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePreference('preferred_job_types', index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Preferred Industries *</span>
                {(
                  <button
                    type="button"
                    onClick={() => addPreference('preferred_industries')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Industry
                  </button>
                )}
              </div>
              {formData.preferred_industries.map((item, index) => (
                <div key={`industry-${index}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePreference('preferred_industries', index, e.target.value)}
                    placeholder="e.g., Software Development"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  {isEditMode && formData.preferred_industries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePreference('preferred_industries', index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800">Preferred Locations *</span>
                {(
                  <button
                    type="button"
                    onClick={() => addPreference('preferred_locations')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Location
                  </button>
                )}
              </div>
              {formData.preferred_locations.map((item, index) => (
                <div key={`location-${index}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePreference('preferred_locations', index, e.target.value)}
                    placeholder="e.g., Remote"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  {isEditMode && formData.preferred_locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePreference('preferred_locations', index)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Expected Salary Range
                <input
                  type="text"
                  name="expected_salary_range"
                  value={formData.expected_salary_range}
                  onChange={handleChange}
                  placeholder="e.g., ₱15,000 - ₱30,000/month"
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={isProfileLoading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isProfileLoading ? 'Saving...' : 'Save profile'}
        </button>
      </form>
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-semibold text-red-800 whitespace-pre-wrap">{error}</p>
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-semibold text-green-800">{message}</p>
        </div>
      )}
    </div>
    </div>
  )
}
