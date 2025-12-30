// Legacy API file - Not currently used
// All API calls should use Supabase client from lib/supabaseClient.js

import axios from 'axios'

// This axios instance is a placeholder for future backend integration
// For Sprint 1, use Supabase directly via: import { supabase } from '@/lib/supabaseClient'
const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
	baseURL,
	withCredentials: false,
})

export default api
