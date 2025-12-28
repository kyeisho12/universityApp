import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
	baseURL,
	withCredentials: false,
})

export default api
