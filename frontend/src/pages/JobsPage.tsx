import React, { useState, useMemo } from "react";
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
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { getAllJobs, type JobWithEmployer } from "../services/jobService";
import { submitJobApplication, checkIfApplied } from "../services/applicationService";
import { supabase } from "../lib/supabaseClient";
import { queryCache } from "../utils/queryCache";

function JobsPageContent({ email, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All Types");
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  // Fetch user profile data with caching
  const { data: userData } = useCachedQuery(
    `user-profile-${user?.id}`,
    async () => {
      if (!user?.id) return null;
      const { data, error: err } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (err) throw err;
      return data;
    },
    { enabled: !!user?.id }
  );

  // Get display name and ID from user data or fall back to email
  const userName = userData?.full_name || email?.split("@")[0] || "User";
  const userID = userData?.student_id || "2024-00001";

  // Load jobs from Supabase with caching
  const { data: jobs = [], isLoading: loading, error: jobsError } = useCachedQuery(
    `jobs-list-${user?.id}`,
    async () => {
      const data = await getAllJobs(false); // false = only active jobs for students
      
      // Check which jobs the student has applied to
      if (user?.id && data) {
        const appliedSet = new Set<string>();
        for (const job of data) {
          const { hasApplied } = await checkIfApplied(user.id, job.id);
          if (hasApplied) {
            appliedSet.add(job.id);
          }
        }
        setAppliedJobs(appliedSet);
      }
      
      if (data && data.length > 0 && !selectedJob) {
        setSelectedJob(data[0].id || null);
      }
      
      return data || [];
    },
    { enabled: !!user?.id }
  );

  const error = jobsError?.message || null;

  // Load user resumes with caching
  const { data: userResumes = [] } = useCachedQuery(
    `resumes-${user?.id}`,
    async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0 && !selectedResume) {
        setSelectedResume(data[0].id);
      }
      
      return data || [];
    },
    { enabled: !!user?.id }
  );

  // Handle job application
  const handleApplyNow = async () => {
    if (!user?.id || !currentJob) return;

    if (!coverLetter.trim()) {
      setApplyMessage({
        type: 'error',
        text: 'Cover letter is required to submit your application.'
      });
      return;
    }

    setApplyingJobId(currentJob.id);
    setApplyMessage(null);

    try {
      const result = await submitJobApplication(
        user.id,
        currentJob.id,
        currentJob.employer_id,
        coverLetter.trim() || undefined,
        selectedResume || undefined
      );

      if (result.success) {
        setAppliedJobs(new Set(appliedJobs).add(currentJob.id));
        setShowApplyModal(false);
        setCoverLetter('');
        
        // Invalidate jobs and applications cache to reflect new application
        queryCache.invalidate(`jobs-list-${user.id}`);
        queryCache.invalidate(`applications-${user.id}`);
        
        navigate("/student/apply-outlook", {
          state: {
            jobTitle: currentJob.title,
            jobType: currentJob.job_type,
            employerId: currentJob.employer_id,
            employerName: currentJob.employer_name,
            employerEmail: currentJob.employer_email,
            resumeId: selectedResume,
            coverLetter: coverLetter.trim(),
          },
        });
      } else {
        setApplyMessage({
          type: 'error',
          text: result.error || 'Failed to submit application'
        });
      }
    } catch (err) {
      setApplyMessage({
        type: 'error',
        text: 'An error occurred while submitting your application'
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  // Filter jobs based on search and filters
  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesSearch =
      searchTerm === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.employer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "All" || job.job_type === filterType;
    const matchesCategory =
      filterCategory === "All Types" || job.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  }), [jobs, searchTerm, filterType, filterCategory]);

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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 mb-8">
                    {appliedJobs.has(currentJob.id) ? (
                      <button disabled className="flex-1 bg-green-100 text-green-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-base cursor-not-allowed">
                        <CheckCircle className="w-5 h-5" /> Applied
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setCoverLetter('');
                          setShowApplyModal(true);
                        }}
                        className="flex-1 bg-[#2C3E5C] text-white py-3 rounded-lg font-medium hover:bg-[#1B2744] transition-colors flex items-center justify-center gap-2 text-base"
                      >
                        Apply Now <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Application Message */}
                  {applyMessage && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                      applyMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {applyMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <p className={applyMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {applyMessage.text}
                      </p>
                    </div>
                  )}

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

      {/* Application Modal */}
      {showApplyModal && currentJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Apply for {currentJob.title}</h3>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setCoverLetter('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select Resume to Attach
                </label>
                {userResumes.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-2">No resumes uploaded yet</p>
                    <button
                      onClick={() => {
                        setShowApplyModal(false);
                        onNavigate('student/resumes');
                      }}
                      className="text-[#00B4D8] hover:underline text-sm"
                    >
                      Upload a resume first
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userResumes.map((resume) => (
                      <button
                        key={resume.id}
                        onClick={() => setSelectedResume(resume.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${ 
                          selectedResume === resume.id
                            ? 'border-[#00B4D8] bg-[#E0F7FA]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{resume.file_name}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Cover Letter
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Write a brief cover letter to support your application"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:ring-0 outline-none text-sm resize-none"
                />
              </div>

              {userResumes.length > 0 && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowApplyModal(false);
                      setCoverLetter('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyNow}
                    disabled={applyingJobId === currentJob.id || !selectedResume || !coverLetter.trim()}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#2C3E5C] text-white hover:bg-[#1B2744] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingJobId === currentJob.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

