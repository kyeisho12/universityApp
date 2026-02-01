import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Sidebar } from "../components/common/Sidebar";
import {
  FileText,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Application {
  id: string;
  job_id: string;
  employer_id: string;
  status: string;
  application_date: string;
  cover_letter: string | null;
  resume_id: string | null;
  job_title: string;
  employer_name: string;
  job_location?: string;
  job_type?: string;
}

const MyApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userName = user?.email?.split("@")[0] || "Student";
  const userID = "2024-00001";

  useEffect(() => {
    fetchApplications();
  }, []);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to view applications");
        return;
      }

      // Fetch applications with job and employer details
      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("*")
        .eq("student_id", user.id)
        .order("application_date", { ascending: false });

      if (appsError) throw appsError;

      // Enrich with job and employer details
      const enrichedApps = await Promise.all(
        (appsData || []).map(async (app) => {
          const [jobRes, employerRes] = await Promise.all([
            supabase.from("jobs").select("*").eq("id", app.job_id).single(),
            supabase
              .from("employers")
              .select("name")
              .eq("id", app.employer_id)
              .single(),
          ]);

          return {
            ...app,
            job_title: jobRes.data?.title || "Unknown Job",
            employer_name: employerRes.data?.name || "Unknown Employer",
            job_location: jobRes.data?.location,
            job_type: jobRes.data?.job_type,
          };
        })
      );

      setApplications(enrichedApps);
    } catch (err: any) {
      console.error("Error fetching applications:", err);
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Rejected
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-4 h-4" />
            {status}
          </span>
        );
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filterStatus === "all") return true;
    return app.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => a.status.toLowerCase() === "pending")
      .length,
    accepted: applications.filter((a) => a.status.toLowerCase() === "accepted")
      .length,
    rejected: applications.filter((a) => a.status.toLowerCase() === "rejected")
      .length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="student/applications"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <Sidebar
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
              activeNav="student/applications"
            />
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
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              My Applications
            </h2>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            aria-label="Logout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Applications
              </h1>
              <p className="text-sm text-gray-600">
                Track the status of your job applications
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {statusCounts.all}
                </div>
                <div className="text-sm text-gray-600">Total Applications</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4">
                <div className="text-2xl font-bold text-yellow-800">
                  {statusCounts.pending}
                </div>
                <div className="text-sm text-yellow-700">Pending Review</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
                <div className="text-2xl font-bold text-green-800">
                  {statusCounts.accepted}
                </div>
                <div className="text-sm text-green-700">Accepted</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
                <div className="text-2xl font-bold text-red-800">
                  {statusCounts.rejected}
                </div>
                <div className="text-sm text-red-700">Rejected</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 flex gap-2 flex-wrap">
              {["all", "pending", "accepted", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 text-sm opacity-75">
                    ({statusCounts[status as keyof typeof statusCounts]})
                  </span>
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-600 mb-6">
                  {filterStatus === "all"
                    ? "You haven't applied to any jobs yet."
                    : `You don't have any ${filterStatus} applications.`}
                </p>
                <button
                  onClick={() => handleNavigate("student/jobs")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Explore Available Jobs
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Briefcase className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              {app.job_title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {app.employer_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Applied{" "}
                                {new Date(app.application_date).toLocaleDateString()}
                              </div>
                              {app.resume_id && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <FileText className="w-4 h-4" />
                                  Resume Attached
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {app.cover_letter && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {app.cover_letter}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyApplicationsPage;
