import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudent } from "../context/StudentContext";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { supabase } from "../lib/supabaseClient";
import { submitJobApplication } from "../services/applicationService";
import { queryCache } from "../utils/queryCache";
import type { JobWithEmployer } from "../services/jobService";

function getCoverLetterDocIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`cover_letter_document_ids_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const studentId = profile?.student_number != null ? String(profile.student_number) : '';
  const navigate = useNavigate();

  const [job, setJob] = useState<JobWithEmployer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [optimisticApplied, setOptimisticApplied] = useState(false);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

  // Fetch job by id
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("jobs")
      .select("*, employer:employer_id(name, website, contact_email)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const employer = Array.isArray(data.employer) ? data.employer[0] : data.employer;
        setJob({
          ...data,
          employer_name: employer?.name,
          employer_website: employer?.website,
          employer_email: employer?.contact_email,
        });
        setLoading(false);
      });
  }, [id]);

  // Fetch applied jobs
  const { data: appliedJobIds = [], refetch: refetchAppliedJobIds } = useCachedQuery(
    `applied-jobs-${user?.id}`,
    async () => {
      if (!user?.id) return [] as string[];
      const { data, error } = await supabase
        .from("applications")
        .select("job_id")
        .eq("student_id", user.id)
        .neq("status", "withdrawn");
      if (error) throw error;
      return (data || []).map((a) => a.job_id).filter(Boolean);
    },
    { enabled: !!user?.id }
  );

  const alreadyApplied = optimisticApplied || appliedJobIds.includes(id ?? "");

  // Fetch resumes
  const { data: userResumes = [] } = useCachedQuery(
    `resumes-list-${user?.id}`,
    async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    { enabled: !!user?.id }
  );

  const resumeDocs = useMemo(() =>
    userResumes.filter((r) => {
      const name = r.file_name?.toLowerCase() || "";
      const path = r.file_path?.toLowerCase() || "";
      if (name.includes("cover_letter") || path.includes("cover_letter")) return false;
      return name.includes("resume") || name.includes("cv") || !name.includes("cover");
    }),
    [userResumes]
  );

  const coverLetterDocs = useMemo(() => {
    const ids = user?.id ? getCoverLetterDocIds(user.id) : [];
    return userResumes.filter((r) => {
      if (ids.includes(r.id)) return true;
      const name = r.file_name?.toLowerCase() || "";
      const path = r.file_path?.toLowerCase() || "";
      return name.includes("cover_letter") || name.includes("cover-letter") ||
        name.includes("coverletter") || path.includes("cover_letter") ||
        path.includes("cover-letter") || path.includes("coverletter");
    });
  }, [userResumes, user?.id]);

  const openApplyModal = () => {
    setApplyMessage(null);
    if (resumeDocs.length > 0 && !selectedResume) setSelectedResume(resumeDocs[0].id);
    setShowApplyModal(true);
  };

  const handleApplyNow = async () => {
    if (!user?.id || !job) return;
    if (!selectedResume) {
      setApplyMessage({ type: "error", text: "Please select a resume to attach." });
      return;
    }
    setApplyingJobId(job.id ?? null);
    setApplyMessage(null);
    try {
      const result = await submitJobApplication(
        user.id, job.id!, job.employer_id,
        undefined, selectedResume || undefined, selectedCoverLetter || undefined
      );
      if (result.success) {
        setOptimisticApplied(true);
        setShowApplyModal(false);
        queryCache.invalidate(`jobs-list-${user.id}`);
        queryCache.invalidate(`applications-${user.id}`);
        queryCache.invalidate(`applied-jobs-${user.id}`);
        void refetchAppliedJobIds();
        navigate("/student/apply-outlook", {
          state: {
            jobTitle: job.title,
            jobType: job.job_type,
            employerId: job.employer_id,
            employerName: job.employer_name,
            employerEmail: job.employer_email,
            resumeId: selectedResume,
            coverLetterId: selectedCoverLetter,
            coverLetter: "",
          },
        });
      } else {
        setApplyMessage({ type: "error", text: (result as any).error || "Failed to submit application." });
      }
    } catch {
      setApplyMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setApplyingJobId(null);
    }
  };

  async function handleLogout() {
    try { await signOut(); } catch { /* ignore */ } finally { navigate("/login"); }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        userName={displayName}
        userID={studentId}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        activeNav="student/jobs"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate("/student/jobs")} className="p-1 rounded-md hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-sm font-medium text-gray-900 truncate">{job?.title || "Job Details"}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Back button — desktop */}
          <button
            type="button"
            onClick={() => navigate("/student/jobs")}
            className="hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job Listings
          </button>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B4D8]" />
            </div>
          )}

          {notFound && !loading && (
            <div className="text-center py-24">
              <p className="text-gray-500 text-lg font-medium">Job not found.</p>
              <button type="button" onClick={() => navigate("/student/jobs")} className="mt-4 text-[#00B4D8] hover:underline text-sm">
                Back to listings
              </button>
            </div>
          )}

          {job && !loading && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h1>
                  <p className="text-base text-gray-500 mb-3">{job.employer_name}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-[#00B4D8] bg-[#E0F7FA] px-2.5 py-1 rounded">
                      {job.job_type}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply button */}
              <div className="mb-8">
                {alreadyApplied ? (
                  <button type="button" disabled className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                    <CheckCircle className="w-5 h-5" /> Applied
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openApplyModal}
                    className="w-full bg-[#2C3E5C] text-white py-3 rounded-lg font-medium hover:bg-[#1B2744] transition-colors flex items-center justify-center gap-2"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Apply message */}
              {applyMessage && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${applyMessage.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  {applyMessage.type === "success"
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                  <p className={applyMessage.type === "success" ? "text-green-700" : "text-red-700"}>{applyMessage.text}</p>
                </div>
              )}

              {/* Salary */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-2">Salary Range</h3>
                <p className="text-2xl font-bold text-[#1B2744]">
                  {job.salary_range || "Not specified"}{job.salary_range ? "/month" : ""}
                </p>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Job Description</h3>
                <p className="text-base text-gray-500 leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>

              {/* Requirements */}
              {(job.requirements ?? []).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Requirements</h3>
                  <ul className="space-y-3">
                    {(job.requirements ?? []).map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-[#00B4D8] rounded-full mt-2 flex-shrink-0" />
                        <span className="text-base text-gray-500">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deadline */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <h3 className="text-base font-normal text-gray-600">Application Deadline</h3>
                <p className="text-base text-gray-900 font-medium">
                  {new Date(job.deadline).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && job && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Apply for {job.title}</h3>
              <button type="button" aria-label="Close" onClick={() => setShowApplyModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Resume selector */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Select Resume to Attach</label>
                {resumeDocs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-2">No resumes uploaded yet</p>
                    <button type="button" onClick={() => { setShowApplyModal(false); navigate("/student/resumes"); }} className="text-[#00B4D8] hover:underline text-sm">
                      Upload a resume first
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resumeDocs.map((resume) => (
                      <button
                        type="button"
                        key={resume.id}
                        onClick={() => setSelectedResume(resume.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedResume === resume.id ? "border-[#00B4D8] bg-[#E0F7FA]" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <p className="font-medium text-gray-900">{resume.file_name}</p>
                        <p className="text-xs text-gray-500">Uploaded {new Date(resume.created_at).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover letter selector */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Attach Cover Letter (Optional)</label>
                {coverLetterDocs.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No cover letter documents yet</p>
                    <button type="button" onClick={() => { setShowApplyModal(false); navigate("/student/resumes"); }} className="text-[#00B4D8] hover:underline text-sm">
                      Create a cover letter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coverLetterDocs.map((doc) => (
                      <button
                        type="button"
                        key={doc.id}
                        onClick={() => setSelectedCoverLetter(selectedCoverLetter === doc.id ? null : doc.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedCoverLetter === doc.id ? "border-[#00B4D8] bg-[#E0F7FA]" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-xs text-gray-500">Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {applyMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${applyMessage.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 ${applyMessage.type === "error" ? "text-red-600" : "text-green-600"}`} />
                  <p className={`text-sm ${applyMessage.type === "error" ? "text-red-700" : "text-green-700"}`}>{applyMessage.text}</p>
                </div>
              )}

              {resumeDocs.length > 0 && (
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNow}
                    disabled={applyingJobId === job.id || !selectedResume}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#2C3E5C] text-white hover:bg-[#1B2744] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingJobId === job.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Submitting...
                      </div>
                    ) : "Submit Application"}
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
