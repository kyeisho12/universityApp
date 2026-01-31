import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Bookmark,
  MapPin,
  Clock,
  Filter,
  ArrowRight,
  LayoutGrid,
  X,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { getAllJobs, type JobWithEmployer } from "../services/jobService";
import { supabase } from "../lib/supabaseClient";

function JobsPageContent({ email, onLogout, onNavigate }) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [saved, setSaved] = useState(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [jobs, setJobs] = useState<JobWithEmployer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All Types");

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      try {
        const { data, error: err } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (err) throw err;
        setUserData(data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  // Get display name and ID from user data or fall back to email
  const userName = userData?.full_name || email?.split("@")[0] || "User";
  const userID = userData?.student_id || "2024-00001";

  // Load jobs from Supabase
  React.useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllJobs(false); // false = only active jobs for students
        setJobs(data || []);
        if (data && data.length > 0) {
          setSelectedJob(data[0].id || null);
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError("Failed to load job listings");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  const toggleSave = (jobId) => {
    const newSaved = new Set(saved);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
    } else {
      newSaved.add(jobId);
    }
    setSaved(newSaved);
  };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchTerm === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.employer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "All" || job.job_type === filterType;
    const matchesCategory =
      filterCategory === "All Types" || job.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const currentJob = selectedJob
    ? filteredJobs.find((j) => j.id === selectedJob)
    : filteredJobs[0];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="jobs"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden"> 
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
              <Sidebar
                userName={userName}
                userID={userID}
                onLogout={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                onNavigate={(r) => {
                  setMobileOpen(false);
                  onNavigate(r);
                }}
                activeNav="student/jobs"
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between z-10 gap-3 flex-shrink-0">
          <div className="md:hidden mr-2">
            <button
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <LayoutGrid className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 cursor-pointer hover:text-gray-900 flex-shrink-0" />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6 flex-shrink-0">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Job & Internship Listings
            </h1>
            <p className="text-gray-500">
              Browse verified opportunities from our partner companies
            </p>
          </div>

          {/* Search and Filters - Now at top level */}
          <div className="mb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by job title or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border-2 border-gray-200 focus:border-[#00B4D8] focus:ring-0 outline-none placeholder-gray-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[140px]"
                >
                  <option>All</option>
                  <option>Internship</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[140px]"
                >
                  <option>All Types</option>
                  <option>Information Technology</option>
                  <option>Data Science</option>
                  <option>Software Engineering</option>
                  <option>Business Analytics</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                </select>
                <button className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Showing count */}
          <p className="text-sm text-gray-500 mb-4 flex-shrink-0">
            Showing {filteredJobs.length} of {jobs.length} opportunities
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
            {/* Jobs List */}
            <div className="lg:col-span-1 flex flex-col overflow-hidden">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                {/* Jobs List */}
                <div className="flex-1 overflow-y-auto py-1 px-0.5">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B4D8] mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading jobs...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center py-12">
                        <p className="text-red-500 font-medium mb-2">{error}</p>
                        <p className="text-gray-400 text-sm">Try refreshing the page</p>
                      </div>
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center py-12">
                        <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium mb-2">No job listings available</p>
                        <p className="text-gray-400 text-sm">Check back soon for new opportunities</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 px-0.5">
                      {filteredJobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => setSelectedJob(job.id || null)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedJob === job.id
                              ? "border-[#1B2744] bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                                {job.title}
                              </h4>
                              <p className="text-xs text-gray-500">{job.employer_name}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                                <Clock className="w-3 h-3 ml-2" />
                                {new Date(job.created_at || "").toLocaleDateString()}
                              </div>
                              <span className="inline-block text-xs font-medium text-[#00B4D8] bg-[#E0F7FA] px-2 py-1 rounded mt-2">
                                {job.job_type}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSave(job.id);
                              }}
                              className="flex-shrink-0"
                            >
                              <Bookmark
                                className={`w-5 h-5 ${
                                  saved.has(job.id)
                                    ? "fill-gray-400 text-gray-400"
                                    : "text-gray-400"
                                }`}
                              />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden">
              {currentJob ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-8 h-8 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {currentJob.title}
                        </h2>
                        <p className="text-base text-gray-500 mb-3">{currentJob.employer_name}</p>
                        <div className="flex items-center gap-3">
                          <span className="inline-block text-xs font-medium text-[#00B4D8] bg-[#E0F7FA] px-2.5 py-1 rounded">
                            {currentJob.job_type}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            {currentJob.location}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Bookmark className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 mb-8">
                    <button className="flex-1 bg-[#2C3E5C] text-white py-3 rounded-lg font-medium hover:bg-[#1B2744] transition-colors flex items-center justify-center gap-2 text-base">
                      Apply Now <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(currentJob.id);
                      }}
                      className="px-8 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors text-base whitespace-nowrap">
                      Save for Later
                    </button>
                  </div>

                  {/* Salary */}
                  <div className="mb-8">
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      Salary Range
                    </h3>
                    <p className="text-2xl font-bold text-[#1B2744]">
                      {currentJob.salary_range || "Not specified"}/month
                    </p>
                  </div>

                  {/* Job Description */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      Job Description
                    </h3>
                    <p className="text-base text-gray-500 leading-relaxed">
                      {currentJob.description}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Requirements
                    </h3>
                    <ul className="space-y-3">
                      {currentJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 bg-[#00B4D8] rounded-full mt-2 flex-shrink-0" />
                          <span className="text-base text-gray-500">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Application Deadline */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <h3 className="text-base font-normal text-gray-600">
                      Application Deadline
                    </h3>
                    <p className="text-base text-gray-900 font-medium">
                      {new Date(currentJob.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex items-center justify-center h-full">
                  <div className="text-center py-16">
                    <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg mb-2">No job selected</p>
                    <p className="text-gray-400">Select a job from the list to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

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
    <JobsPageContent 
      email={user?.email || ''} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate} 
    />
  )
}

