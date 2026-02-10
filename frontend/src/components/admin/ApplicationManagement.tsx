import React, { useState, useEffect } from "react";
import { Search, Check, X, Clock, Eye, FileText, ExternalLink } from "lucide-react";
import { getAllApplications } from "../../services/applicationService";
import { supabase } from "../../lib/supabaseClient";

interface ApplicationWithDetails {
  id: string;
  student_id: string;
  job_id: string;
  employer_id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  cover_letter?: string;
  resume_id?: string;
  application_date: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  job_title?: string;
  employer_name?: string;
  resume_url?: string;
  resume_name?: string;
}

export function ApplicationManagement() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await getAllApplications();

      if (!data || data.length === 0) {
        setApplications([]);
        setFilteredApplications([]);
        setLoading(false);
        return;
      }

      // Enrich applications with student and job details
      const enrichedData = await Promise.all(
        data.map(async (app) => {
          try {
            const [studentRes, jobRes, employerRes, resumeRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", app.student_id)
                .maybeSingle(),
              supabase
                .from("jobs")
                .select("title")
                .eq("id", app.job_id)
                .maybeSingle(),
              supabase
                .from("employers")
                .select("name")
                .eq("id", app.employer_id)
                .maybeSingle(),
              app.resume_id
                ? supabase
                    .from("resumes")
                    .select("file_name, file_path")
                    .eq("id", app.resume_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            ]);

            // Generate signed URL for resume if it exists (private bucket)
            let resumeUrl: string | undefined;
            if (resumeRes.data?.file_path) {
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from("resumes")
                .createSignedUrl(resumeRes.data.file_path, 3600); // 1 hour expiry
              
              if (!signedUrlError && signedUrlData) {
                resumeUrl = signedUrlData.signedUrl;
              }
            }

            return {
              ...app,
              student_name: studentRes.data?.full_name || "Unknown Student",
              student_email: studentRes.data?.email || "N/A",
              job_title: jobRes.data?.title || "Unknown Job",
              employer_name: employerRes.data?.name || "Unknown Employer",
              resume_url: resumeUrl,
              resume_name: resumeRes.data?.file_name,
            };
          } catch (err) {
            console.error("Error enriching application:", err);
            return {
              ...app,
              student_name: "Unknown Student",
              student_email: "N/A",
              job_title: "Unknown Job",
              employer_name: "Unknown Employer",
            };
          }
        })
      );

      setApplications(enrichedData);
      filterApplications(enrichedData, searchTerm);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      setApplications([]);
      setFilteredApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = (
    data: ApplicationWithDetails[],
    search: string
  ) => {
    let filtered = data;

    if (search) {
      filtered = filtered.filter(
        (app) =>
          app.student_name?.toLowerCase().includes(search.toLowerCase()) ||
          app.job_title?.toLowerCase().includes(search.toLowerCase()) ||
          app.student_email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterApplications(applications, value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "accepted":
        return "bg-green-50 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "withdrawn":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "accepted":
        return <Check className="w-4 h-4" />;
      case "rejected":
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Applications</h2>
          <p className="text-gray-500 mt-1">
            Review student applications and details
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#00B4D8]">
            {applications.length}
          </div>
          <p className="text-sm text-gray-500">Total Applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, job, or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B4D8] mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading applications...</p>
            </div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">No applications found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Application Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {app.student_name}
                        </p>
                        <p className="text-sm text-gray-500">{app.student_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{app.job_title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{app.employer_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600">
                        {new Date(app.application_date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {getStatusIcon(app.status)}
                        {app.status.charAt(0).toUpperCase() +
                          app.status.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E0F7FA] text-[#00B4D8] hover:bg-[#B3E5FC] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {modalOpen && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Application Details
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedApp(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Application Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Application Details</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Student</p>
                    <p className="font-medium text-gray-900">
                      {selectedApp.student_name}
                    </p>
                    <p className="text-sm text-gray-600">{selectedApp.student_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Job Position</p>
                    <p className="font-medium text-gray-900">
                      {selectedApp.job_title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedApp.employer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Application Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedApp.application_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Status</p>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(
                        selectedApp.status
                      )}`}
                    >
                      {getStatusIcon(selectedApp.status)}
                      {selectedApp.status.charAt(0).toUpperCase() +
                        selectedApp.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApp.cover_letter && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Cover Letter
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              {/* Attached Resume */}
              {selectedApp.resume_url && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Attached Resume
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedApp.resume_name || 'Resume.pdf'}</p>
                        <p className="text-xs text-gray-500">Click to view in new tab</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(selectedApp.resume_url, '_blank')}
                      className="px-4 py-2 rounded-lg bg-[#E0F7FA] text-[#00B4D8] hover:bg-[#B3E5FC] transition-colors flex items-center gap-2 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Resume
                    </button>
                  </div>
                </div>
              )}

              {!selectedApp.resume_url && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> No resume was attached to this application.
                  </p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedApp(null);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
