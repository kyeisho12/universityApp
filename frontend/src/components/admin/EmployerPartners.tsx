import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminNavbar } from '../common/AdminNavbar'
import { X, Search, Plus, Bell, Menu, Edit, ExternalLink, Trash2, Building2, Globe } from 'lucide-react'
import EmployerService, { Employer } from '../../services/employerService'

const EmployerPartners = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [industryFilter, setIndustryFilter] = React.useState<string>('all');
  const [showAddModal, setShowAddModal] = React.useState<boolean>(false);
  const [formData, setFormData] = React.useState({
    name: '',
    website: '',
    industry: '',
    contact_email: '',
  });
  const [companies, setCompanies] = React.useState<Employer[]>([]);
  const [stats, setStats] = React.useState({ total: 0, verified: 0, activeListings: 0, pending: 0 });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const userName = user?.email?.split("@")[0] || '';
  const userID = "2024-00001";

  // Fetch employers on component mount
  React.useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmployerService.getAll(true);
      setCompanies(data);
      
      // Calculate stats
      const activeListings = data.reduce((sum: number, c: Employer) => sum + (c.job_listings_count || 0), 0);
      
      setStats({
        total: data.length,
        verified: data.length,
        activeListings,
        pending: 0,
      });
    } catch (err) {
      setError('Failed to load employers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!formData.name || !formData.industry || !formData.contact_email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await EmployerService.create({
        name: formData.name,
        website: formData.website,
        industry: formData.industry,
        contact_email: formData.contact_email,
      });
      
      // Reload employers
      await loadEmployers();
      
      // Close modal and reset form
      setShowAddModal(false);
      setFormData({ name: '', website: '', industry: '', contact_email: '' });
    } catch (err) {
      setError('Failed to add company');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  async function handleLogout() {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/login')
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/employer_partners"
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
                activeNav="admin/employer_partners"
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
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students, employers, reports..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Employer Partners</h1>
                <p className="text-gray-500 mt-1">Manage verified employer profiles and job postings</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#1e293b] hover:bg-[#2d3a4f] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Company
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setIndustryFilter('all')}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  industryFilter === 'all'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Industries
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-gray-900">{stats.verified}</div>
                <div className="text-sm text-gray-600 mt-1">Total Partners</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-gray-900">{stats.activeListings}</div>
                <div className="text-sm text-gray-600 mt-1">Active Listings</div>
              </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Listings
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12">
                          <div className="text-center">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No employer partners yet</p>
                            <p className="text-gray-400 text-xs mt-1">Add companies to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      companies
                        .filter(company => {
                          if (searchQuery) {
                            return company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                   company.industry.toLowerCase().includes(searchQuery.toLowerCase());
                          }
                          return true;
                        })
                        .map((company) => (
                          <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{company.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {company.website}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {company.industry}
                          </td>
                          <td className="px-6 py-4">
                            <a href={`mailto:${company.contact_email}`} className="text-gray-600 hover:text-cyan-600 flex items-center gap-1">
                              <span className="text-gray-400">✉</span>
                              {company.contact_email}
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700">
                              {company.job_listings_count}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Company</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  placeholder="e.g., example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Select an industry</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Data Analytics">Data Analytics</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="e.g., hr@company.com"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompany}
                disabled={loading}
                className="px-4 py-2 bg-[#1e293b] hover:bg-[#2d3a4f] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerPartners;
