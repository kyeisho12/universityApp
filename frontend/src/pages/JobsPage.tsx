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
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";

function JobsPageContent({ email, onLogout, onNavigate }) {
  const userName = email.split("@")[0];
  const userID = "2024-00001";
  const [selectedJob, setSelectedJob] = useState(null);
  const [saved, setSaved] = useState(new Set());

  const jobs = [
    {
      id: 1,
      title: "Software Developer Intern",
      company: "TechCorp Philippines",
      location: "Tarlac City",
      type: "Internship",
      timeAgo: "1d ago",
      salary: "₱15,000 - ₱20,000/month",
      description:
        "Join our development team and work on exciting web and mobile projects. Great opportunity for fresh graduates.",
      requirements: [
        "JavaScript/TypeScript",
        "React or Vue.js",
        "Git version control",
      ],
      deadline: "2024-01-15",
    },
    {
      id: 2,
      title: "Junior Web Developer",
      company: "Digital Solutions Inc.",
      location: "Clark, Pampanga",
      type: "Full-time",
      timeAgo: "2d ago",
      salary: "₱18,000 - ₱25,000/month",
      description: "Work on cutting-edge web applications for various clients.",
      requirements: ["HTML/CSS", "JavaScript", "Backend knowledge"],
      deadline: "2024-01-20",
    },
    {
      id: 3,
      title: "IT Support Specialist",
      company: "Global Tech Services",
      location: "Remote",
      type: "Full-time",
      timeAgo: "3d ago",
      salary: "₱16,000 - ₱22,000/month",
      description: "Provide technical support and maintain company systems.",
      requirements: ["IT Troubleshooting", "Customer Service", "Networking"],
      deadline: "2024-01-18",
    },
    {
      id: 4,
      title: "Data Analyst Trainee",
      company: "Analytics PH",
      location: "Quezon City",
      type: "Internship",
      timeAgo: "4d ago",
      salary: "₱12,000 - ₱18,000/month",
      description:
        "Learn data analysis and work with real-world datasets from partner companies.",
      requirements: ["Excel", "SQL basics", "Attention to detail"],
      deadline: "2024-01-22",
    },
    {
      id: 5,
      title: "Business Development Associate",
      company: "Enterprise Solutions Corp",
      location: "Makati City",
      type: "Full-time",
      timeAgo: "5d ago",
      salary: "₱20,000 - ₱28,000/month",
      description: "Help expand our client base and manage business relationships.",
      requirements: ["Communication skills", "Sales experience", "Problem-solving"],
      deadline: "2024-01-25",
    },
  ];

  const toggleSave = (jobId) => {
    const newSaved = new Set(saved);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
    } else {
      newSaved.add(jobId);
    }
    setSaved(newSaved);
  };

  const currentJob = selectedJob ? jobs.find((j) => j.id === selectedJob) : jobs[0];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="jobs"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
        </div>

        {/* Content Area */}
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Job & Internship Listings
            </h1>
            <p className="text-gray-500">
              Browse verified opportunities from our partner companies
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Jobs List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Search by job title or company..."
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:ring-0 outline-none placeholder-gray-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm">
                      <option>All</option>
                      <option>Internship</option>
                      <option>Full-time</option>
                      <option>Part-time</option>
                    </select>
                    <select className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm">
                      <option>All Types</option>
                      <option>IT</option>
                      <option>Business</option>
                      <option>Analytics</option>
                    </select>
                    <button className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Showing {jobs.length} of {jobs.length} opportunities
                </p>

                {/* Jobs List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedJob === job.id
                          ? "border-[#1B2744] bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-gray-400"
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
                          <p className="text-xs text-gray-500">{job.company}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                            <Clock className="w-3 h-3 ml-2" />
                            {job.timeAgo}
                          </div>
                          <span className="inline-block text-xs font-medium text-[#00B4D8] mt-2">
                            {job.type}
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
              </div>
            </div>

            {/* Job Details */}
            {currentJob && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-8 h-8 text-gray-400"
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
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">
                          {currentJob.title}
                        </h2>
                        <p className="text-gray-600 mb-2">{currentJob.company}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="inline-block text-sm font-medium text-[#00B4D8] bg-blue-50 px-3 py-1 rounded-full">
                            {currentJob.type}
                          </span>
                          <div className="flex items-center gap-1">
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
                  <div className="flex gap-3 mb-8">
                    <button className="flex-1 bg-[#1B2744] text-white py-3.5 rounded-xl font-semibold hover:bg-[#131d33] transition-colors flex items-center justify-center gap-2">
                      Apply Now <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="px-6 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Save for Later
                    </button>
                  </div>

                  {/* Salary */}
                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Salary Range
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {currentJob.salary}
                    </p>
                  </div>

                  {/* Job Description */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Job Description
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {currentJob.description}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Requirements
                    </h3>
                    <ul className="space-y-3">
                      {currentJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-[#00B4D8] rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-600">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Application Deadline */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-gray-900">
                      Application Deadline
                    </h3>
                    <p className="text-gray-600 font-medium">{currentJob.deadline}</p>
                  </div>
                </div>
              </div>
            )}
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
    await signOut()
    navigate('/login')
  }

  function handleNavigate(route: string) {
    navigate(route)
  }

  return (
    <JobsPageContent 
      email={user?.email || ''} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate} 
    />
  )
}

