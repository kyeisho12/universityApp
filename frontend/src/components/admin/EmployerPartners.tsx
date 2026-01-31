import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminNavbar } from '../common/AdminNavbar'
import { X, Search, Plus, Bell, Menu, Edit, ExternalLink, Trash2, Building2, Globe, Briefcase, MapPin, Calendar } from 'lucide-react'
import EmployerService, { Employer } from '../../services/employerService'

interface JobListing {
  id: string;
  title: string;
  company: string;
  company_id: string;
  location: string;
  type: string;
  category: string;
  salary_range?: string;
  deadline: string;
  description: string;
  requirements: string[];
  status: 'active' | 'closed';
  created_at: string;
}

const EmployerPartners = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<'companies' | 'jobs'>('companies');
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [industryFilter, setIndustryFilter] = React.useState<string>('all');
  const [showAddModal, setShowAddModal] = React.useState<boolean>(false);
  const [showEditModal, setShowEditModal] = React.useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<boolean>(false);
  const [showAddJobModal, setShowAddJobModal] = React.useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = React.useState<Employer | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    website: '',
    industry: '',
    contact_email: '',
  });
  const [jobFormData, setJobFormData] = React.useState({
    title: '',
    company_id: '',
    location: '',
    type: 'Full-time',
    category: 'Information Technology',
    salary_range: '',
    deadline: '',
    description: '',
    requirements: '',
  });
  const [companies, setCompanies] = React.useState<Employer[]>([]);
  const [jobs, setJobs] = React.useState<JobListing[]>([]);
  const [stats, setStats] = React.useState({ total: 0, verified: 0, activeListings: 0, pending: 0 });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const userName = user?.email?.split("@")[0] || '';
  const userID = "2024-00001";

  // Fetch employers on component mount
  React.useEffect(() => {
    loadEmployers();
    loadJobs();
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

  const loadJobs = async () => {
    // Mock data for now - you'll replace this with actual API call
    setJobs([
      {
        id: '1',
        title: 'Software Developer Intern',
        company: 'Accenture Philippines',
        company_id: 'acc-1',
        location: 'Tarlac City',
        type: 'Internship',
        category: 'Information Technology',
        salary_range: '₱15,000 - ₱20,000/month',
        deadline: '2024-01-15',
        description: 'Describe the role, responsibilities, and what makes it a great opportunity...',
        requirements: ['JavaScript/TypeScript', 'React or Vue.js', 'Git version control'],
        status: 'active',
        created_at: '2024-01-01'
      }
    ]);
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

  const handleEditCompany = async () => {
    if (!selectedCompany || !formData.name || !formData.industry || !formData.contact_email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await EmployerService.update(selectedCompany.id!, {
        name: formData.name,
        website: formData.website,
        industry: formData.industry,
        contact_email: formData.contact_email,
      });
      
      // Reload employers
      await loadEmployers();
      
      // Close modal and reset form
      setShowEditModal(false);
      setSelectedCompany(null);
      setFormData({ name: '', website: '', industry: '', contact_email: '' });
    } catch (err) {
      setError('Failed to update company');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      await EmployerService.delete(selectedCompany.id!);
      
      // Reload employers
      await loadEmployers();
      
      // Close modal and reset
      setShowDeleteConfirm(false);
      setSelectedCompany(null);
    } catch (err) {
      setError('Failed to delete company');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (company: Employer) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      website: company.website || '',
      industry: company.industry,
      contact_email: company.contact_email,
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (company: Employer) => {
    setSelectedCompany(company);
    setShowDeleteConfirm(true);
  };

  const handleAddJob = async () => {
    if (!jobFormData.title || !jobFormData.company_id || !jobFormData.location || !jobFormData.deadline) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const company = companies.find(c => c.id === jobFormData.company_id);
      const requirementsArray = jobFormData.requirements
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const newJob: JobListing = {
        id: Date.now().toString(),
        title: jobFormData.title,
        company: company?.name || '',
        company_id: jobFormData.company_id,
        location: jobFormData.location,
        type: jobFormData.type,
        category: jobFormData.category,
        salary_range: jobFormData.salary_range,
        deadline: jobFormData.deadline,
        description: jobFormData.description,
        requirements: requirementsArray,
        status: 'active',
        created_at: new Date().toISOString()
      };

      setJobs([...jobs, newJob]);
      
      // Close modal and reset form
      setShowAddJobModal(false);
      setJobFormData({
        title: '',
        company_id: '',
        location: '',
        type: 'Full-time',
        category: 'Information Technology',
        salary_range: '',
        deadline: '',
        description: '',
        requirements: '',
      });
    } catch (err) {
      setError('Failed to add job');
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (hidden on small screens) - Fixed position */}
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
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
      <div className="md:ml-72">
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
                onClick={() => activeTab === 'companies' ? setShowAddModal(true) : setShowAddJobModal(true)}
                className="bg-[#1e293b] hover:bg-[#2d3a4f] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {activeTab === 'companies' ? 'Add Company' : 'Add Job'}
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

            {/* Tabs */}
            <div className="bg-white rounded-t-lg border-b border-gray-200 mb-0">
              <div className="flex gap-1 px-2 pt-2">
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'companies'
                      ? 'bg-white text-cyan-600 border-b-2 border-cyan-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Companies ({companies.length})
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'jobs'
                      ? 'bg-white text-cyan-600 border-b-2 border-cyan-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Job Listings ({jobs.length})
                </button>
              </div>
            </div>

            {/* Companies Table */}
            {activeTab === 'companies' && (
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
                                onClick={() => openEditModal(company)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => company.website && window.open(company.website.startsWith('http') ? company.website : `https://${company.website}`, '_blank')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(company)}
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
            )}

            {/* Job Listings Table */}
            {activeTab === 'jobs' && (
            <div className="bg-white rounded-b-lg overflow-hidden">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deadline
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12">
                          <div className="text-center">
                            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No job listings yet</p>
                            <p className="text-gray-400 text-xs mt-1">Add jobs to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{job.title}</div>
                            <div className="text-sm text-gray-500">{job.category}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{job.company}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {job.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{job.location}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">{new Date(job.deadline).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              job.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
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
            )}
          </div>
        </main>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Company</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCompany(null);
                  setFormData({ name: '', website: '', industry: '', contact_email: '' });
                }}
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
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCompany(null);
                  setFormData({ name: '', website: '', industry: '', contact_email: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCompany}
                disabled={loading}
                className="px-4 py-2 bg-[#1e293b] hover:bg-[#2d3a4f] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delete Company</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedCompany(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{selectedCompany.name}</strong>? This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedCompany(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Add Job Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add Job Listing</h2>
              <button
                onClick={() => setShowAddJobModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Job Title - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Developer Intern"
                  value={jobFormData.title}
                  onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Company and Location - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Company
                  </label>
                  <select
                    value={jobFormData.company_id}
                    onChange={(e) => setJobFormData({ ...jobFormData, company_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Tarlac City"
                    value={jobFormData.location}
                    onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Job Type and Category - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Job Type
                  </label>
                  <select
                    value={jobFormData.type}
                    onChange={(e) => setJobFormData({ ...jobFormData, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Category
                  </label>
                  <select
                    value={jobFormData.category}
                    onChange={(e) => setJobFormData({ ...jobFormData, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Business Analytics">Business Analytics</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              {/* Salary Range and Deadline - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ₱15,000 - ₱20,000/month"
                    value={jobFormData.salary_range}
                    onChange={(e) => setJobFormData({ ...jobFormData, salary_range: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={jobFormData.deadline}
                    onChange={(e) => setJobFormData({ ...jobFormData, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Job Description - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Job Description
                </label>
                <textarea
                  placeholder="Describe the role, responsibilities, and what makes it a great opportunity..."
                  rows={4}
                  value={jobFormData.description}
                  onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Requirements - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Requirements (one per line)
                </label>
                <textarea
                  placeholder="JavaScript/TypeScript React or Vue.js Git version control"
                  rows={4}
                  value={jobFormData.requirements}
                  onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowAddJobModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddJob}
                disabled={loading}
                className="px-6 py-2.5 bg-[#1e293b] hover:bg-[#2d3a4f] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerPartners;
