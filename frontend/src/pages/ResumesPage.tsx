import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Upload, Download, Trash2, FileText, AlertCircle, CheckCircle2, RefreshCw, Eye } from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudent } from "../context/StudentContext";
import { supabase } from "../lib/supabaseClient";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  deleteResume,
  getDownloadUrl,
  listResumes,
  uploadResume,
  validateResumeFile,
  type ResumeWithUrl,
} from "../services/resumeService";

type NavigateHandler = (route: string) => void;

interface ResumesPageContentProps {
  userId: string;
  userName: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

function ResumesPageContent({ userId, userName, studentId, onLogout, onNavigate }: ResumesPageContentProps & { studentId?: string }) {
  const userID = studentId || "2024-00001";
  const [resumes, setResumes] = useState<ResumeWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allowedFormatsLabel = useMemo(() => ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", "), []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) return;
      setIsLoading(true);
      const { data, error } = await listResumes(userId);
      if (!active) return;
      if (error) {
        setErrorMessage(error.message || "Unable to load resumes.");
      }
      setResumes(data);
      setIsLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
    event.target.value = "";
  };

  const handleUpload = async (file: File) => {
    const validation = validateResumeFile(file);
    if (validation) {
      setErrorMessage(validation);
      return;
    }
    if (!userId) {
      setErrorMessage("You must be signed in to upload a résumé.");
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const { data, error } = await uploadResume(file, userId);
    if (error || !data) {
      setErrorMessage(error?.message || "Failed to upload résumé. Please try again.");
    } else {
      setResumes((prev) => [data, ...prev]);
      setStatusMessage("Résumé uploaded successfully.");
    }
    setIsUploading(false);
  };

  const handleDelete = async (resume: ResumeWithUrl) => {
    if (!window.confirm(`Delete ${resume.file_name}?`)) return;
    setErrorMessage(null);
    const { error } = await deleteResume(resume.id, resume.file_path, userId);
    if (error) {
      setErrorMessage(error.message || "Failed to delete résumé.");
      return;
    }
    setResumes((prev) => prev.filter((r) => r.id !== resume.id));
  };

  const handleDownload = async (resume: ResumeWithUrl) => {
    const url = resume.signed_url || (await getDownloadUrl(resume.file_path));
    if (!url) {
      setErrorMessage("Unable to generate download link right now.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleViewDetails = async (resume: ResumeWithUrl) => {
    const url = resume.signed_url || (await getDownloadUrl(resume.file_path));
    if (!url) {
      setErrorMessage("Unable to view document right now.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userId}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/resumes"
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Résumé Management</h1>
            <p className="text-gray-500">Upload, create, and manage your résumés and documents</p>
          </div>

          {(errorMessage || statusMessage) && (
            <div
              className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${errorMessage ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
            >
              {errorMessage ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              <span>{errorMessage || statusMessage}</span>
            </div>
          )}

          {/* Upload Section */}
          <div className="bg-white rounded-2xl p-12 shadow-sm border-2 border-dashed border-gray-300 mb-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Résumé</h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your file here, or click to browse.
              <br />
              Supported: {allowedFormatsLabel} • Max {(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB
            </p>
            <div className="flex gap-3 justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handleBrowseClick}
                disabled={isUploading}
                className="bg-[#1B2744] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <Upload className={`w-5 h-5 ${isUploading ? "animate-bounce" : ""}`} />
                {isUploading ? "Uploading..." : "Browse Files"}
              </button>
              <button
                disabled={isLoading}
                onClick={() => {
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setIsLoading(true);
                  listResumes(userId).then(({ data, error }) => {
                    if (error) setErrorMessage(error.message || "Unable to refresh resumes.");
                    setResumes(data);
                    setIsLoading(false);
                  });
                }}
                className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* My Documents */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Documents ({resumes.length})</h2>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-600">Loading your resumes...</div>
            ) : resumes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-800 mb-1">No résumés yet</p>
                <p className="text-gray-500 text-sm">Upload your first résumé to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{resume.file_name}</h4>
                        <p className="text-sm text-gray-500">
                          Uploaded {formatDate(resume.created_at)} · {formatSize(resume.file_size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => handleViewDetails(resume)}
                        className="px-3 py-1.5 bg-[#1B2744] text-white text-sm font-medium rounded-lg hover:bg-[#131d33] transition-colors flex items-center gap-1.5"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleDownload(resume)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Download résumé"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(resume)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete résumé"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tips for Your Résumé</h3>
            <div className="space-y-3">
              <TipItem text="Keep your résumé concise and relevant to the job you're applying for" />
              <TipItem text="Use action verbs and quantify achievements when possible" />
              <TipItem text="Proofread carefully for spelling and grammar errors" />
              <TipItem text="Use a professional format and easy-to-read fonts" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className="text-gray-600">{text}</span>
    </div>
  );
}

export default function ResumesPage() {
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const navigate = useNavigate();
  const [studentId, setStudentId] = React.useState<string>('2024-00001');

  const userId = user?.id || "";
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

  React.useEffect(() => {
    const fetchStudentId = async () => {
      if (!user?.id) return;
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('student_id')
          .eq('id', user.id)
          .single();
        
        if (err) throw err;
        setStudentId(data?.student_id || '2024-00001');
      } catch (err) {
        console.error('Failed to fetch student_id:', err);
      }
    };

    fetchStudentId();
  }, [user?.id]);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <ResumesPageContent
      userId={userId}
      userName={displayName}
      studentId={studentId}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}
