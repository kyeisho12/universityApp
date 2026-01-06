import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { StudentProvider } from './context/StudentContext'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)
root.render(
  <React.StrictMode>
    <AuthProvider>
      <StudentProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StudentProvider>
    </AuthProvider>
  </React.StrictMode>
)
