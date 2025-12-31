import React, { useState, useEffect } from 'react'
import {
  getAllUsers,
  getUsersByRole,
  updateUserRole,
  setUserActiveStatus,
  searchUsers
} from '../../services/adminService'
import '../../styles/UserManagement.css'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [showStatusConfirm, setShowStatusConfirm] = useState(null)

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

    // Filter by role
    if (filterRole !== 'all') {
      result = result.filter(user => user.role === filterRole)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(user =>
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.university?.toLowerCase().includes(term)
      )
    }

    setFilteredUsers(result)
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole)
      
      // Update local state
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))
      
      alert('User role updated successfully')
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    }
  }

  const handleStatusChange = async (userId, nextStatus) => {
    try {
      const updated = await setUserActiveStatus(userId, nextStatus)

      // Update local state
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_active: updated.is_active } : user
      ))
      setShowStatusConfirm(null)
      
      alert(nextStatus ? 'User enabled successfully' : 'User disabled successfully')
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-admin'
      case 'recruiter':
        return 'badge-recruiter'
      case 'student':
        return 'badge-student'
      default:
        return 'badge-default'
    }
  }

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    )
  }

  return (
    <div className="user-management">
      {/* Controls */}
      <div className="user-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-box">
          <label htmlFor="role-filter">Filter by role:</label>
          <select
            id="role-filter"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="recruiter">Recruiters</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <button onClick={loadUsers} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Results Count */}
      <div className="results-info">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>No users found</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>University</th>
                <th>Major</th>
                <th>Graduation</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isActive = user.is_active !== false
                return (
                <tr key={user.id}>
                  <td>
                    <div className="user-name-cell">
                      {user.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="user-avatar"
                        />
                      )}
                      <span>{user.full_name || 'No name'}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`role-select ${getRoleBadgeClass(user.role)}`}
                    >
                      <option value="student">Student</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${isActive ? 'badge-active' : 'badge-disabled'}`}>
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{user.university || 'N/A'}</td>
                  <td>{user.major || 'N/A'}</td>
                  <td>{user.graduation_year || 'N/A'}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="btn-edit"
                        title="View/Edit Details"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setShowStatusConfirm({ id: user.id, nextStatus: !isActive })}
                        className="btn-delete"
                        title={isActive ? 'Disable User' : 'Enable User'}
                      >
                        {isActive ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* Status Confirmation Modal */}
      {showStatusConfirm && (
        <div className="modal-overlay" onClick={() => setShowStatusConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{showStatusConfirm.nextStatus ? 'Enable User' : 'Disable User'}</h3>
            <p>
              {showStatusConfirm.nextStatus
                ? 'Re-enable this account so the student can sign back in?'
                : 'Disable this account? The user will retain data but lose access.'}
            </p>
            <div className="modal-actions">
              <button
                onClick={() => handleStatusChange(showStatusConfirm.id, showStatusConfirm.nextStatus)}
                className="btn-confirm-delete"
              >
                {showStatusConfirm.nextStatus ? 'Enable' : 'Disable'}
              </button>
              <button
                onClick={() => setShowStatusConfirm(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>User Details</h3>
            <div className="user-details">
              <div className="detail-row">
                <strong>ID:</strong>
                <span>{editingUser.id}</span>
              </div>
              <div className="detail-row">
                <strong>Full Name:</strong>
                <span>{editingUser.full_name || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Email:</strong>
                <span>{editingUser.email}</span>
              </div>
              <div className="detail-row">
                <strong>Phone:</strong>
                <span>{editingUser.phone || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Role:</strong>
                <span className={`badge ${getRoleBadgeClass(editingUser.role)}`}>
                  {editingUser.role}
                </span>
              </div>
              <div className="detail-row">
                <strong>University:</strong>
                <span>{editingUser.university || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Major:</strong>
                <span>{editingUser.major || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Graduation Year:</strong>
                <span>{editingUser.graduation_year || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Bio:</strong>
                <span>{editingUser.bio || 'No bio provided'}</span>
              </div>
              <div className="detail-row">
                <strong>Joined:</strong>
                <span>{formatDate(editingUser.created_at)}</span>
              </div>
              <div className="detail-row">
                <strong>Last Updated:</strong>
                <span>{formatDate(editingUser.updated_at)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setEditingUser(null)} className="btn-close">
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
