import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { StudentProvider } from './context/StudentContext'
import './styles/globals.css'

const root = createRoot(document.getElementById('root'))
root.render(
	<AuthProvider>
		<StudentProvider>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</StudentProvider>
	</AuthProvider>
)
