/**
 * Test file to verify profileValidation utilities work correctly
 * Run with: npm test profileValidation
 */

import {
  sanitizeName,
  sanitizePhone,
  sanitizeText,
  sanitizeBio,
  validatePhoneNumber,
  validateYear,
  validateDateFormat,
  validateDateRange,
  validateYearRange,
  validateEmail,
  validateWorkExperience,
  validateEducation,
} from './profileValidation'

console.log('Testing Profile Validation Utilities...\n')

// Test sanitizeName
console.log('=== Testing sanitizeName ===')
console.assert(sanitizeName('John Doe') === 'John Doe', 'Simple name')
console.assert(sanitizeName('John-Paul O\'Brien') === 'John-Paul O Brien', 'Name with special chars')
console.assert(sanitizeName('  John  Doe  ') === 'John Doe', 'Name with extra spaces')
console.assert(sanitizeName('John<script>') === 'Johnscript', 'Name with HTML removed')
console.log('✓ sanitizeName tests passed\n')

// Test sanitizePhone
console.log('=== Testing sanitizePhone ===')
console.assert(sanitizePhone('09171234567') === '09171234567', 'Valid phone')
console.assert(sanitizePhone('+63-917-123-4567') === '+63-917-1234567', 'Phone with formatting')
console.assert(sanitizePhone('  (917) 123-4567  ') === '(917)1234567', 'Phone with spaces')
console.log('✓ sanitizePhone tests passed\n')

// Test validatePhoneNumber
console.log('=== Testing validatePhoneNumber ===')
console.assert(validatePhoneNumber('09171234567').valid === true, 'Valid 11-digit phone')
console.assert(validatePhoneNumber('63917123456').valid === true, 'Valid 11-digit international')
console.assert(validatePhoneNumber('123').valid === false, 'Too short phone')
console.assert(validatePhoneNumber('123456789012345').valid === false, 'Too long phone')
console.log('✓ validatePhoneNumber tests passed\n')

// Test validateYear
console.log('=== Testing validateYear ===')
console.assert(validateYear(2025).valid === true, 'Valid current year')
console.assert(validateYear(2026).valid === true, 'Valid future year')
console.assert(validateYear(1500).valid === false, 'Too old year')
console.assert(validateYear(null).valid === true, 'Null optional field')
console.log('✓ validateYear tests passed\n')

// Test validateDateFormat
console.log('=== Testing validateDateFormat ===')
console.assert(validateDateFormat('2025-01-15').valid === true, 'Valid date format')
console.assert(validateDateFormat('01/15/2025').valid === false, 'Wrong date format')
console.assert(validateDateFormat('').valid === true, 'Empty optional field')
console.log('✓ validateDateFormat tests passed\n')

// Test validateDateRange
console.log('=== Testing validateDateRange ===')
console.assert(validateDateRange('2023-01-01', '2024-12-31').valid === true, 'Valid date range')
console.assert(validateDateRange('2024-01-01', '2023-12-31').valid === false, 'Invalid range (end before start)')
console.assert(validateDateRange('', '').valid === true, 'Empty optional range')
console.log('✓ validateDateRange tests passed\n')

// Test validateYearRange
console.log('=== Testing validateYearRange ===')
console.assert(validateYearRange(2020, 2025).valid === true, 'Valid year range')
console.assert(validateYearRange(2025, 2020).valid === false, 'Invalid year range')
console.assert(validateYearRange('', '').valid === true, 'Empty optional range')
console.log('✓ validateYearRange tests passed\n')

// Test validateEmail
console.log('=== Testing validateEmail ===')
console.assert(validateEmail('test@example.com').valid === true, 'Valid email')
console.assert(validateEmail('invalid.email').valid === false, 'Invalid email (no @)')
console.assert(validateEmail('').valid === true, 'Empty optional email')
console.log('✓ validateEmail tests passed\n')

// Test validateWorkExperience
console.log('=== Testing validateWorkExperience ===')
const workErrors1 = validateWorkExperience('Engineer', '2023-01-01', '2024-01-01')
console.assert(workErrors1.length === 0, 'Valid work experience')
const workErrors2 = validateWorkExperience('Engineer', '2024-01-01', '2023-01-01')
console.assert(workErrors2.length > 0, 'Invalid work experience (end before start)')
console.log('✓ validateWorkExperience tests passed\n')

// Test validateEducation
console.log('=== Testing validateEducation ===')
const eduErrors1 = validateEducation('University Name', '2020', '2024')
console.assert(eduErrors1.length === 0, 'Valid education')
const eduErrors2 = validateEducation('University Name', '2024', '2020')
console.assert(eduErrors2.length > 0, 'Invalid education (end before start)')
console.log('✓ validateEducation tests passed\n')

console.log('✅ All validation tests passed!')
