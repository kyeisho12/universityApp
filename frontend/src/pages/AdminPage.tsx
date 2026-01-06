import React, { useState, useEffect } from 'react'
import AdminNavbar from '../components/common/AdminNavbar'

export default function AdminPage(){
    return(
        <>
            <div className="flex min-h-screen">
                <AdminNavbar />
                <h1 className="bg-green-700 w-full">This is the admin page</h1>
            </div>
        </>
    )
}