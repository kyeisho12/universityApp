import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudentId } from "../hooks/useStudentId";

type NavigateHandler = (route: string) => void;

interface CoverLettersPageContentProps {
  userId: string;
  userName: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

type CoverLetterDraft = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

function CoverLettersPageContent({ userId, userName, studentId, onLogout, onNavigate }: CoverLettersPageContentProps & { studentId?: string }) {
  const userID = studentId || "2024-00001";
  const [coverLetters, setCoverLetters] = useState<CoverLetterDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const STORAGE_KEY = `cover_letters_${userId}`;

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as CoverLetterDraft[];
      setCoverLetters(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Failed to restore cover letters:", error);
    }
  }, [STORAGE_KEY, userId]);

  const persistCoverLetters = (next: CoverLetterDraft[]) => {
    setCoverLetters(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to persist cover letters:", error);
    }
  };

  const openBuilder = (draft?: CoverLetterDraft) => {
    if (draft) {
      setActiveDraftId(draft.id);
      setDraftTitle(draft.title);
      setDraftBody(draft.body);
    } else {
      setActiveDraftId(null);
      setDraftTitle("");
      setDraftBody("");
    }
    setShowBuilder(true);
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setActiveDraftId(null);
    setDraftTitle("");
    setDraftBody("");
  };

  const handleSaveDraft = () => {
    setErrorMessage(null);
    setStatusMessage(null);
    if (!draftBody.trim()) {
      setErrorMessage("Please enter your cover letter before saving.");
      return;
    }

    const now = new Date().toISOString();
    if (activeDraftId) {
      const next = coverLetters.map((item) =>
        item.id === activeDraftId
          ? {
              ...item,
              title: draftTitle.trim() || "Untitled Cover Letter",
              body: draftBody.trim(),
              updatedAt: now,
            }
          : item
      );
      persistCoverLetters(next);
      setStatusMessage("Cover letter updated.");
    } else {
      const nextDraft: CoverLetterDraft = {
        id: crypto.randomUUID(),
        title: draftTitle.trim() || "Untitled Cover Letter",
        body: draftBody.trim(),
        createdAt: now,
        updatedAt: now,
      };
      persistCoverLetters([nextDraft, ...coverLetters]);
      setStatusMessage("Cover letter saved.");
    }

    closeBuilder();
  };

  const handleDelete = (draft: CoverLetterDraft) => {
    if (!window.confirm(`Delete ${draft.title}?`)) return;
    const next = coverLetters.filter((item) => item.id !== draft.id);
    persistCoverLetters(next);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const now = new Date().toISOString();
      const nextDraft: CoverLetterDraft = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, "") || "Uploaded Cover Letter",
        body: text.trim(),
        createdAt: now,
        updatedAt: now,
      };
      persistCoverLetters([nextDraft, ...coverLetters]);
      setStatusMessage("Cover letter uploaded.");
    } catch (error) {
      console.error("Failed to upload cover letter:", error);
      setErrorMessage("Failed to upload cover letter.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/cover-letters"
      />

      <div className="flex-1 overflow-auto">
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

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Cover Letter Management</h1>
            <p className="text-gray-500">Create, upload, and manage your cover letters</p>
          </div>

          {(errorMessage || statusMessage) && (
            <div
              className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${errorMessage ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
            >
              {errorMessage ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              <span>{errorMessage || statusMessage}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl p-12 shadow-sm border-2 border-dashed border-gray-300 mb-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Cover Letter</h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your file here, or click to browse.
              <br />
              Supported: TXT, MD
            </p>
            <div className="flex gap-3 justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
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
                onClick={() => openBuilder()}
                className="border-2 border-[#1B2744] text-[#1B2744] px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1B2744] hover:text-white transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Cover Letter
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Cover Letters ({coverLetters.length})</h2>

            {coverLetters.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-800 mb-1">No cover letters yet</p>
                <p className="text-gray-500 text-sm">Create your first cover letter to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coverLetters.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{draft.title}</h4>
                        <p className="text-sm text-gray-500">
                          Updated {formatDate(draft.updatedAt)} · {draft.body.split(/\s+/).filter(Boolean).length} words
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => openBuilder(draft)}
                        className="px-3 py-1.5 bg-[#1B2744] text-white text-sm font-medium rounded-lg hover:bg-[#131d33] transition-colors flex items-center gap-1.5"
                        title="View cover letter"
                      >
                        <Eye className="w-4 h-4" />
                        View Cover Letter
                      </button>
                      <button
                        onClick={() => handleDelete(draft)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete cover letter"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tips for Your Cover Letter</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>Tailor each cover letter to the role and highlight the most relevant skills.</p>
              <p>Keep it concise—three to four short paragraphs is usually enough.</p>
              <p>Show enthusiasm and explain why you are a great fit for the company.</p>
              <p>Proofread for clarity, grammar, and tone before sending.</p>
            </div>
          </div>
        </div>
      </div>

      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeDraftId ? "Edit Cover Letter" : "Create New Cover Letter"}
                </h2>
              </div>
              <button
                onClick={closeBuilder}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter Title</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g., Application for Marketing Intern"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter</label>
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="Write your cover letter here..."
                    rows={12}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">{draftBody.trim().length} characters</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeBuilder}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-lg bg-[#1B2744] text-white text-sm font-semibold hover:bg-[#131d33]"
                >
                  Save Cover Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoverLettersPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const studentId = useStudentId(user?.id);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  const userName = useMemo(() => user?.email?.split("@")[0] || "Student", [user?.email]);

  return (
    <CoverLettersPageContent
      userId={user?.id || ""}
      userName={userName}
      studentId={studentId}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}
