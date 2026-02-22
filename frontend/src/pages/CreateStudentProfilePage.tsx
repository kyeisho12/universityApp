import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'

interface ProfileForm {
  full_name: string
  student_number: string
  phone: string
  address: string
  university: string
  major: string
  graduation_year: string | number | null
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

const initialState: ProfileForm = {
  full_name: '',
  student_number: '',
  phone: '',
  address: '',
  university: '',
  major: '',
  graduation_year: '',
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
    const cleaned = value.replace(/[^\d.]/g, '').trim()
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
        major: toStringValue(profile.major),
        graduation_year: profile.graduation_year ?? '',
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

  useEffect(() => {
    if (isProfileComplete && !isEditMode) {
      navigate('/', { replace: true })
    }
  }, [isProfileComplete, isEditMode, navigate])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
    const preferredJobTypes = formData.preferred_job_types.map((item) => item.trim()).filter(Boolean)
    const preferredIndustries = formData.preferred_industries.map((item) => item.trim()).filter(Boolean)
    const preferredLocations = formData.preferred_locations.map((item) => item.trim()).filter(Boolean)
    const expectedSalaryText = toStringValue(formData.expected_salary_range).trim()
    const payload = {
      ...formData,
      student_number: toStringValue(formData.student_number).trim(),
      graduation_year: formData.graduation_year ? Number(formData.graduation_year) : null,
      skills_entries: formData.skills_entries.map((item) => item.trim()).filter(Boolean),
      education_entries: formData.education_entries.filter((entry) =>
        entry.school || entry.degree || entry.field || entry.start_year || entry.end_year
      ),
      work_experience_entries: formData.work_experience_entries.filter((entry) =>
        entry.title || entry.company || entry.start_date || entry.end_date || entry.description
      ),
      preferred_job_types: preferredJobTypes,
      preferred_industries: preferredIndustries,
      preferred_locations: preferredLocations,
      expected_salary_range: expectedSalaryText,
      job_type: preferredJobTypes.join(', '),
      Pref_Industries: preferredIndustries.join(', '),
      Pref_Location: preferredLocations.join(', '),
      Expected_Salary: parseSalaryValue(expectedSalaryText),
    }
    const { error: saveError } = await saveProfile(payload)
    if (saveError) {
      const errorMessage = (saveError as { message?: string })?.message || ''
      if (errorMessage.includes("Could not find the") && errorMessage.includes("profiles")) {
        const {
          preferred_job_types,
          preferred_industries,
          preferred_locations,
          expected_salary_range,
          ...fallbackPayload
        } = payload
        const { error: fallbackError } = await saveProfile(fallbackPayload)
        if (!fallbackError) {
          try {
            localStorage.removeItem(draftKey)
          } catch (error) {
            console.error('Failed to clear profile draft:', error)
          }
          setMessage('Profile saved successfully')
          navigate(isEditMode ? '/student/profile' : '/', { replace: true })
          return
        }
        setError((fallbackError as { message?: string })?.message ?? 'Failed to save profile')
        return
      }
      setError(errorMessage || 'Failed to save profile')
      return
    }
    try {
      localStorage.removeItem(draftKey)
    } catch (error) {
      console.error('Failed to clear profile draft:', error)
    }
    setMessage('Profile saved successfully')
    setIsDirty(false)
    navigate(isEditMode ? '/student/profile' : '/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200/60">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
        <p className="text-sm text-neutral-600">Please complete all required fields (*) including your bio to access your dashboard.</p>
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
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          University *
          <input
            type="text"
            name="university"
            value={formData.university}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Major *
        <input
            type="text"
            name="major"
            value={formData.major}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
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
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-800">Skills & Competencies</span>
            {isEditMode && (
              <button
                type="button"
                onClick={addSkill}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Add Skill
              </button>
            )}
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
              {isEditMode && formData.skills_entries.length > 1 && (
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
            <span className="text-sm font-semibold text-neutral-800">Education</span>
            {isEditMode && (
              <button
                type="button"
                onClick={addEducation}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Add Education
              </button>
            )}
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
              {isEditMode && formData.education_entries.length > 1 && (
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
            <span className="text-sm font-semibold text-neutral-800">Work Experience</span>
            {isEditMode && (
              <button
                type="button"
                onClick={addWork}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Add Experience
              </button>
            )}
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
              {isEditMode && formData.work_experience_entries.length > 1 && (
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
            <span className="text-sm font-semibold text-neutral-800">Career Preferences</span>
            {isEditMode && (
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
            <span className="text-sm font-semibold text-neutral-800">Preferred Industries</span>
            {isEditMode && (
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
            <span className="text-sm font-semibold text-neutral-800">Preferred Locations</span>
            {isEditMode && (
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
        <button
          type="submit"
          disabled={isProfileLoading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isProfileLoading ? 'Saving...' : 'Save profile'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm font-semibold text-green-600">{message}</p>}
    </div>
  )
}
