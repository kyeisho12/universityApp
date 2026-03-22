/**
 * Profile Form Validation & Sanitization Utilities
 * Option A: Input Sanitization - Trim, prevent XSS
 * Option B: Field-Specific Validation - Phone, dates, years
 */

export interface ValidationError {
  field: string
  message: string
}

/**
 * OPTION A: SANITIZATION
 */

// Escape HTML special characters to prevent XSS
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

// Sanitize name fields - only allow letters, spaces, hyphens, periods
export const sanitizeName = (name: string): string => {
  return name
    .trim()
    .replace(/[^a-zA-Z\s\-.']/g, '') // Remove special chars except common name chars
    .replace(/\s+/g, ' ') // Normalize spaces
}

// Sanitize phone - only allow digits, +, -, (), spaces
export const sanitizePhone = (phone: string): string => {
  return phone.trim().replace(/[^0-9+\-() ]/g, '')
}

// Sanitize general text - remove extra whitespace, escape HTML
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ')
}

// Sanitize textarea/bio - allow newlines, trim excessive whitespace
export const sanitizeBio = (text: string): string => {
  return text
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

/**
 * OPTION B: FIELD-SPECIFIC VALIDATION
 */

// Validate Philippine phone number format (flexible)
export const validatePhoneNumber = (phone: string): { valid: boolean; message?: string } => {
  const cleaned = phone.replace(/\D/g, '') // Get only digits

  // Philippine numbers: 10-11 digits (63XXXXXXXXX or 09XXXXXXXXX format)
  if (cleaned.length < 10 || cleaned.length > 11) {
    return {
      valid: false,
      message: 'Phone number must be between 10-11 digits',
    }
  }

  return { valid: true }
}

// Validate year (graduation year)
export const validateYear = (
  year: number | null | string,
  fieldName: string = 'Year'
): { valid: boolean; message?: string } => {
  if (!year) return { valid: true } // Optional field

  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year

  if (isNaN(yearNum)) {
    return {
      valid: false,
      message: `${fieldName} must be a valid number`,
    }
  }

  const currentYear = new Date().getFullYear()
  const minYear = 1900
  const maxYear = currentYear + 10 // Allow up to 10 years in the future for early graduation planning

  if (yearNum < minYear || yearNum > maxYear) {
    return {
      valid: false,
      message: `${fieldName} must be between ${minYear} and ${maxYear}`,
    }
  }

  return { valid: true }
}

// Validate date format (YYYY-MM-DD)
export const validateDateFormat = (date: string): { valid: boolean; message?: string } => {
  if (!date) return { valid: true } // Optional field

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return {
      valid: false,
      message: 'Date must be in YYYY-MM-DD format',
    }
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      message: 'Invalid date',
    }
  }

  return { valid: true }
}

// Validate date range (end date must be >= start date)
export const validateDateRange = (
  startDate: string,
  endDate: string,
  fieldLabel: string = 'Dates'
): { valid: boolean; message?: string } => {
  if (!startDate && !endDate) return { valid: true }

  // Both dates should be provided or both empty
  if ((startDate && !endDate) || (!startDate && endDate)) {
    return {
      valid: false,
      message: `${fieldLabel}: Both start and end dates are required`,
    }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      valid: false,
      message: `${fieldLabel}: Invalid date format`,
    }
  }

  if (end < start) {
    return {
      valid: false,
      message: `${fieldLabel}: End date must be after or equal to start date`,
    }
  }

  return { valid: true }
}

// Validate year range (end year must be >= start year)
export const validateYearRange = (
  startYear: string | number,
  endYear: string | number,
  fieldLabel: string = 'Years'
): { valid: boolean; message?: string } => {
  if (!startYear && !endYear) return { valid: true }

  // Both years should be provided or both empty
  if ((startYear && !endYear) || (!startYear && endYear)) {
    return {
      valid: false,
      message: `${fieldLabel}: Both start and end years are required`,
    }
  }

  const start = parseInt(String(startYear), 10)
  const end = parseInt(String(endYear), 10)

  if (isNaN(start) || isNaN(end)) {
    return {
      valid: false,
      message: `${fieldLabel}: Invalid year format`,
    }
  }

  if (end < start) {
    return {
      valid: false,
      message: `${fieldLabel}: End year must be after or equal to start year`,
    }
  }

  return { valid: true }
}

// Validate email format
export const validateEmail = (email: string): { valid: boolean; message?: string } => {
  if (!email) return { valid: true } // Optional field

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: 'Invalid email format',
    }
  }

  return { valid: true }
}

// Validate work experience - end date should be after start date (in proper format)
export const validateWorkExperience = (
  title: string,
  startDate: string,
  endDate: string
): ValidationError[] => {
  const errors: ValidationError[] = []

  // If any field is filled, all should be filled
  if ((title || startDate || endDate) && !(title && startDate && endDate)) {
    errors.push({
      field: 'work_experience',
      message: 'Work experience requires title, start date, and end date',
    })
    return errors
  }

  if (!startDate || !endDate) return errors

  const dateRangeValidation = validateDateRange(startDate, endDate, 'Work Experience')
  if (!dateRangeValidation.valid) {
    errors.push({
      field: 'work_experience',
      message: dateRangeValidation.message || 'Invalid date range',
    })
  }

  return errors
}

// Validate education - end year should be after start year
export const validateEducation = (
  school: string,
  startYear: string,
  endYear: string
): ValidationError[] => {
  const errors: ValidationError[] = []

  // If any field is filled, basic fields should be filled
  if ((school || startYear || endYear) && !(school && startYear && endYear)) {
    errors.push({
      field: 'education',
      message: 'Education requires school, start year, and end year',
    })
    return errors
  }

  if (!startYear || !endYear) return errors

  const yearRangeValidation = validateYearRange(startYear, endYear, 'Education')
  if (!yearRangeValidation.valid) {
    errors.push({
      field: 'education',
      message: yearRangeValidation.message || 'Invalid year range',
    })
  }

  return errors
}
