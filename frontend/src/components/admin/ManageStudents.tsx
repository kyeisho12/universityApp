import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminNavbar } from '../common/AdminNavbar'
import { X } from 'lucide-react'

export default function ManageStudents(){
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
    const userName = user?.email?.split("@")[0] || ''
    const userID = "2024-00001"

    async function handleLogout() {
        await signOut()
        navigate('/login')
    }

    function handleNavigate(route: string) {
        // Handle special case for dashboard which maps to admin path
        if (route === 'dashboard') {
            navigate('/admin')
        } else {
            navigate(`/${route}`)
        }
    }

    return(
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar (hidden on small screens) */}
            <div className="hidden md:block">
                <AdminNavbar
                    userName={userName}
                    userID={userID}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    activeNav="admin/manage_students"
                />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                    <div className="relative h-full">
                        <div className="absolute left-0 top-0 bottom-0">
                            <AdminNavbar
                                userName={userName}
                                userID={userID}
                                onLogout={() => {
                                    setMobileOpen(false);
                                    handleLogout();
                                }}
                                onNavigate={(r) => {
                                    setMobileOpen(false);
                                    handleNavigate(r);
                                }}
                                activeNav="admin/manage_students"
                            />
                        </div>
                        <button
                            aria-label="Close sidebar"
                            className="absolute top-4 right-4 p-2 rounded-md bg-white/90"
                            onClick={() => setMobileOpen(false)}
                        >
                            <X className="w-5 h-5 text-gray-800" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
                <h1 className="bg-green-700 w-full p-4 text-white">This is the Manage Students page</h1>
            </div>
        </div>
    )
}
