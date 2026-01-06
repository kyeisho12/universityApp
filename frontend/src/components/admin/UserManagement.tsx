import React, { useState, useEffect } from 'react'
import { getAllUsers, updateUserRole, setUserActiveStatus } from '../../services/adminService'

interface UserRecord {
id: string
full_name?: string
email?: string
  role: 'student' | 'recruiter' | 'admin'
  university?: string
  major?: string
  graduation_year?: string | number | null
  avatar_url?: string
  phone?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
  bio?: string
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | UserRecord['role']>('all')
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [showStatusConfirm, setShowStatusConfirm] = useState<{ id: string; nextStatus: boolean } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, searchTerm, filterRole])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...users]

    if (filterRole !== 'all') {
      result = result.filter((user) => user.role === filterRole)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.university?.toLowerCase().includes(term)
      )
    }

    setFilteredUsers(result)
  }

  const handleRoleChange = async (userId: string, newRole: UserRecord['role']) => {
    try {
      await updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
      alert('User role updated successfully')
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    }
  }

  const handleStatusChange = async (userId: string, nextStatus: boolean) => {
    try {
      const updated = await setUserActiveStatus(userId, nextStatus)
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, is_active: updated.is_active } : user)))
      setShowStatusConfirm(null)
      alert(nextStatus ? 'User enabled successfully' : 'User disabled successfully')
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleBadgeClass = (role: UserRecord['role']) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 ring-red-200'
      case 'recruiter':
        return 'bg-purple-50 text-purple-700 ring-purple-200'
      case 'student':
        return 'bg-blue-50 text-blue-700 ring-blue-200'
      default:
        return 'bg-neutral-50 text-neutral-700 ring-neutral-200'
    }
  }

  const getRoleTextClass = (role: UserRecord['role']) => {
    switch (role) {
      case 'admin':
        return 'text-red-700'
      case 'recruiter':
        return 'text-purple-700'
      case 'student':
        return 'text-blue-700'
      default:
        return 'text-neutral-800'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-700">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="mt-3 text-sm font-medium">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
          <label htmlFor="role-filter">Role:</label>
          <select
            id="role-filter"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRecord['role'] | 'all')}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="recruiter">Recruiters</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <span role="img" aria-label="refresh">
            🔄
          </span>
          Refresh
        </button>
      </div>

      <div className="text-sm text-neutral-600">Showing {filteredUsers.length} of {users.length} users</div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        {filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-10 text-sm text-neutral-500">
            <p>No users found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Major</th>
                <th className="px-4 py-3">Graduation</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.map((user) => {
                const isActive = user.is_active !== false
                return (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url && (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <span className="font-semibold text-neutral-900">{user.full_name || 'No name'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRecord['role'])}
                        className={`rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${getRoleTextClass(user.role)}`}
                      >
                        <option value="student">Student</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                        }`}
                      >
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{user.university || 'N/A'}</td>
                    <td className="px-4 py-3 text-neutral-700">{user.major || 'N/A'}</td>
                    <td className="px-4 py-3 text-neutral-700">{user.graduation_year || 'N/A'}</td>
                    <td className="px-4 py-3 text-neutral-700">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                          title="View/Edit Details"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setShowStatusConfirm({ id: user.id, nextStatus: !isActive })}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          title={isActive ? 'Disable User' : 'Enable User'}
                        >
                          {isActive ? '🚫' : '✅'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowStatusConfirm(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900">{showStatusConfirm.nextStatus ? 'Enable User' : 'Disable User'}</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {showStatusConfirm.nextStatus
                ? 'Re-enable this account so the student can sign back in?'
                : 'Disable this account? The user will retain data but lose access.'}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => handleStatusChange(showStatusConfirm.id, showStatusConfirm.nextStatus)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                {showStatusConfirm.nextStatus ? 'Enable' : 'Disable'}
              </button>
              <button
                onClick={() => setShowStatusConfirm(null)}
                className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900">User Details</h3>
            <div className="mt-4 grid gap-3">
              {[
                ['ID', editingUser.id],
                ['Full Name', editingUser.full_name || 'N/A'],
                ['Email', editingUser.email || 'N/A'],
                ['Phone', editingUser.phone || 'N/A'],
                [
                  'Role',
                  <span
                    key="role"
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRoleBadgeClass(editingUser.role)}`}
                  >
                    {editingUser.role}
                  </span>,
                ],
                ['University', editingUser.university || 'N/A'],
                ['Major', editingUser.major || 'N/A'],
                ['Graduation Year', editingUser.graduation_year || 'N/A'],
                ['Bio', editingUser.bio || 'No bio provided'],
                ['Joined', formatDate(editingUser.created_at)],
                ['Last Updated', formatDate(editingUser.updated_at)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="grid grid-cols-[140px_1fr] items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                >
                  <strong className="text-neutral-900">{label}:</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
