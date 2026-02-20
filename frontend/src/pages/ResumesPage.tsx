import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Upload, Download, Trash2, FileText, AlertCircle, CheckCircle2, Eye, Plus, X } from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useStudent } from "../context/StudentContext";
import { useStudentId } from "../hooks/useStudentId";
import { supabase } from "../lib/supabaseClient";
import { queryCache } from "../utils/queryCache";
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
import { generateCoverLetterPDF, generateResumePDF } from "../utils/pdfGenerator";

type NavigateHandler = (route: string) => void;

interface ResumesPageContentProps {
  userId: string;
  userName: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

function ResumesPageContent({ userId, userName, studentId, onLogout, onNavigate }: ResumesPageContentProps & { studentId?: string }) {
  const userID = studentId || "2024-00001";
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [showCoverLetterBuilder, setShowCoverLetterBuilder] = useState(false);
  const [coverLetterDocumentIds, setCoverLetterDocumentIds] = useState<string[]>([]);
  const [resumeName, setResumeName] = useState("");
  const [coverLetterName, setCoverLetterName] = useState("");
  const [coverLetterForm, setCoverLetterForm] = useState({
    senderName: "",
    senderTitle: "",
    senderPhone: "",
    senderEmail: "",
    senderLocation: "",
    letterDate: "",
    recipientName: "",
    recipientTitle: "",
    companyName: "",
    companyAddress: "",
    positionTitle: "",
    salutation: "Dear Hiring Manager,",
    introParagraph: "",
    experienceParagraph: "",
    closingParagraph: "",
    complimentaryClose: "Sincerely,",
    signatureName: "",
  });
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    linkedin: "",
    portfolio: "",
    summary: "",
  });
  const [skills, setSkills] = useState("");
  const [educationEntries, setEducationEntries] = useState([
    { id: 1, school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" },
  ]);
  const [experienceEntries, setExperienceEntries] = useState([
    { id: 1, company: "", position: "", startDate: "", endDate: "", current: false, description: "" },
  ]);
  const [projectEntries, setProjectEntries] = useState([
    { id: 1, name: "", technologies: "", link: "", description: "" },
  ]);
  const [certificationEntries, setCertificationEntries] = useState([
    { id: 1, name: "", organization: "", dateIssued: "", credentialId: "" },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const DRAFT_KEY = `resume_draft_${userId}`;
  const MODAL_KEY = `resume_builder_open_${userId}`;
  const COVER_LETTER_DRAFT_KEY = `cover_letter_draft_${userId}`;
  const COVER_LETTER_MODAL_KEY = `cover_letter_builder_open_${userId}`;
  const COVER_LETTER_DOC_IDS_KEY = `cover_letter_document_ids_${userId}`;

  const allowedFormatsLabel = useMemo(() => ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", "), []);

  // Use cached query for resumes
  const { data: resumes = [], isLoading, error: resumesError, refetch } = useCachedQuery(
    `resumes-list-${userId}`,
    async () => {
      if (!userId) return [];
      const { data, error } = await listResumes(userId);
      if (error) throw error;
      return data;
    },
    { enabled: !!userId }
  );

  const isLoadingResumes = isLoading;

  const openResumeBuilder = () => {
    try {
      localStorage.setItem(MODAL_KEY, "true");
    } catch (error) {
      console.error("Failed to persist modal state:", error);
    }
    setShowResumeBuilder(true);
  };

  const closeResumeBuilder = () => {
    try {
      localStorage.removeItem(MODAL_KEY);
    } catch (error) {
      console.error("Failed to clear modal state:", error);
    }
    setShowResumeBuilder(false);
  };

  const openCoverLetterBuilder = () => {
    try {
      localStorage.setItem(COVER_LETTER_MODAL_KEY, "true");
    } catch (error) {
      console.error("Failed to persist cover letter modal state:", error);
    }
    setShowCoverLetterBuilder(true);
  };

  const closeCoverLetterBuilder = () => {
    try {
      localStorage.removeItem(COVER_LETTER_MODAL_KEY);
    } catch (error) {
      console.error("Failed to clear cover letter modal state:", error);
    }
    setShowCoverLetterBuilder(false);
  };

  // Restore modal open state when returning to the page
  useEffect(() => {
    try {
      const shouldOpen = localStorage.getItem(MODAL_KEY) === "true";
      if (shouldOpen) {
        setShowResumeBuilder(true);
      }
    } catch (error) {
      console.error("Failed to restore modal state:", error);
    }
  }, [MODAL_KEY]);

  // Restore saved cover letter document ids for reliable type labels
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COVER_LETTER_DOC_IDS_KEY);
      if (!saved) {
        setCoverLetterDocumentIds([]);
        return;
      }
      const parsed = JSON.parse(saved);
      setCoverLetterDocumentIds(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Failed to restore cover letter document ids:", error);
      setCoverLetterDocumentIds([]);
    }
  }, [COVER_LETTER_DOC_IDS_KEY]);

  // Restore cover letter modal open state when returning to the page
  useEffect(() => {
    try {
      const shouldOpen = localStorage.getItem(COVER_LETTER_MODAL_KEY) === "true";
      if (shouldOpen) {
        setShowCoverLetterBuilder(true);
      }
    } catch (error) {
      console.error("Failed to restore cover letter modal state:", error);
    }
  }, [COVER_LETTER_MODAL_KEY]);


  // Load draft from localStorage when modal opens
  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setResumeName(draft.resumeName || "");
        setPersonalInfo(draft.personalInfo || {
          fullName: "",
          email: "",
          phone: "",
          address: "",
          linkedin: "",
          portfolio: "",
          summary: "",
        });
        setSkills(draft.skills || "");
        setEducationEntries(draft.educationEntries || [{ id: 1, school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" }]);
        setExperienceEntries(draft.experienceEntries || [
          { id: 1, company: "", position: "", startDate: "", endDate: "", current: false, description: "" },
        ]);
        setProjectEntries(draft.projectEntries || [{ id: 1, name: "", technologies: "", link: "", description: "" }]);
        setCertificationEntries(draft.certificationEntries || [{ id: 1, name: "", organization: "", dateIssued: "", credentialId: "" }]);
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  };

  const saveDraft = () => {
    try {
      const draft = {
        resumeName,
        personalInfo,
        skills,
        educationEntries,
        experienceEntries,
        projectEntries,
        certificationEntries,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error("Failed to clear draft:", error);
    }
  };

  const loadCoverLetterDraft = () => {
    try {
      const savedDraft = localStorage.getItem(COVER_LETTER_DRAFT_KEY);
      if (!savedDraft) return;
      const draft = JSON.parse(savedDraft);
      setCoverLetterName(draft.coverLetterName || "");
      setCoverLetterForm(
        draft.coverLetterForm || {
          senderName: "",
          senderTitle: "",
          senderPhone: "",
          senderEmail: "",
          senderLocation: "",
          letterDate: "",
          recipientName: "",
          recipientTitle: "",
          companyName: "",
          companyAddress: "",
          positionTitle: "",
          salutation: "Dear Hiring Manager,",
          introParagraph: "",
          experienceParagraph: "",
          closingParagraph: "",
          complimentaryClose: "Sincerely,",
          signatureName: "",
        }
      );
    } catch (error) {
      console.error("Failed to load cover letter draft:", error);
    }
  };

  const saveCoverLetterDraft = () => {
    try {
      const draft = {
        coverLetterName,
        coverLetterForm,
      };
      localStorage.setItem(COVER_LETTER_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Failed to save cover letter draft:", error);
    }
  };

  const clearCoverLetterDraft = () => {
    try {
      localStorage.removeItem(COVER_LETTER_DRAFT_KEY);
    } catch (error) {
      console.error("Failed to clear cover letter draft:", error);
    }
  };

  const rememberCoverLetterDocumentId = (id?: string) => {
    if (!id) return;
    setCoverLetterDocumentIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(COVER_LETTER_DOC_IDS_KEY, JSON.stringify(next));
      } catch (error) {
        console.error("Failed to persist cover letter document ids:", error);
      }
      return next;
    });
  };

  const resetResumeBuilder = () => {
    setResumeName("");
    setPersonalInfo({
      fullName: "",
      email: "",
      phone: "",
      address: "",
      linkedin: "",
      portfolio: "",
      summary: "",
    });
    setSkills("");
    setEducationEntries([{ id: 1, school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" }]);
    setExperienceEntries([
      { id: 1, company: "", position: "", startDate: "", endDate: "", current: false, description: "" },
    ]);
    setProjectEntries([{ id: 1, name: "", technologies: "", link: "", description: "" }]);
    setCertificationEntries([{ id: 1, name: "", organization: "", dateIssued: "", credentialId: "" }]);
    clearDraft();
  };

  const resetCoverLetterBuilder = () => {
    setCoverLetterName("");
    setCoverLetterForm({
      senderName: "",
      senderTitle: "",
      senderPhone: "",
      senderEmail: "",
      senderLocation: "",
      letterDate: "",
      recipientName: "",
      recipientTitle: "",
      companyName: "",
      companyAddress: "",
      positionTitle: "",
      salutation: "Dear Hiring Manager,",
      introParagraph: "",
      experienceParagraph: "",
      closingParagraph: "",
      complimentaryClose: "Sincerely,",
      signatureName: "",
    });
    clearCoverLetterDraft();
  };

  // Load draft when modal opens
  useEffect(() => {
    if (showResumeBuilder) {
      loadDraft();
    }
  }, [showResumeBuilder]);

  // Load cover letter draft when modal opens
  useEffect(() => {
    if (showCoverLetterBuilder) {
      loadCoverLetterDraft();
    }
  }, [showCoverLetterBuilder]);

  // Auto-save draft whenever form data changes
  useEffect(() => {
    if (showResumeBuilder) {
      const timeoutId = setTimeout(saveDraft, 500); // Debounce 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [resumeName, personalInfo, skills, educationEntries, experienceEntries, projectEntries, certificationEntries, showResumeBuilder]);

  // Auto-save cover letter draft whenever form data changes
  useEffect(() => {
    if (showCoverLetterBuilder) {
      const timeoutId = setTimeout(saveCoverLetterDraft, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [coverLetterName, coverLetterForm, showCoverLetterBuilder]);

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
      queryCache.invalidate(`resumes-list-${userId}`);
      refetch();
      setStatusMessage("Résumé uploaded successfully.");
    }
    setIsUploading(false);
  };

  const buildResumeText = () => {
    const lines: string[] = [];
    lines.push(resumeName || "Resume");
    lines.push("");
    lines.push("Personal Information");
    lines.push(`Name: ${personalInfo.fullName}`);
    lines.push(`Email: ${personalInfo.email}`);
    if (personalInfo.phone) lines.push(`Phone: ${personalInfo.phone}`);
    if (personalInfo.address) lines.push(`Address: ${personalInfo.address}`);
    if (personalInfo.linkedin) lines.push(`LinkedIn: ${personalInfo.linkedin}`);
    if (personalInfo.portfolio) lines.push(`Portfolio: ${personalInfo.portfolio}`);
    if (personalInfo.summary) {
      lines.push("");
      lines.push("Summary:");
      lines.push(personalInfo.summary);
    }
    lines.push("");
    const validEducation = educationEntries.filter((entry) => entry.school || entry.degree || entry.field || entry.gpa || entry.startDate || entry.endDate);
    if (validEducation.length > 0) {
      lines.push("Education");
      validEducation.forEach((entry, index) => {
        lines.push(`Education #${index + 1}`);
        if (entry.school) lines.push(`School: ${entry.school}`);
        if (entry.degree) lines.push(`Degree: ${entry.degree}`);
        if (entry.field) lines.push(`Field: ${entry.field}`);
        if (entry.gpa) lines.push(`GPA: ${entry.gpa}`);
        if (entry.startDate || entry.endDate) lines.push(`Dates: ${entry.startDate || ""} - ${entry.endDate || ""}`);
        lines.push("");
      });
    }
    const validExperiences = experienceEntries.filter((entry) => entry.company || entry.position || entry.description || entry.startDate || entry.endDate);
    if (validExperiences.length > 0) {
      lines.push("Work Experience");
      validExperiences.forEach((entry, index) => {
        lines.push(`Experience #${index + 1}`);
        if (entry.company) lines.push(`Company: ${entry.company}`);
        if (entry.position) lines.push(`Position: ${entry.position}`);
        if (entry.startDate || entry.endDate) lines.push(`Dates: ${entry.startDate || ""} - ${entry.current ? "Present" : entry.endDate || ""}`);
        if (entry.description) lines.push(`Description: ${entry.description}`);
        lines.push("");
      });
    }
    if (skills.trim()) {
      lines.push("Skills");
      lines.push(skills.trim());
      lines.push("");
    }
    const validProjects = projectEntries.filter((entry) => entry.name || entry.technologies || entry.link || entry.description);
    if (validProjects.length > 0) {
      lines.push("Projects");
      validProjects.forEach((entry, index) => {
        lines.push(`Project #${index + 1}`);
        if (entry.name) lines.push(`Name: ${entry.name}`);
        if (entry.technologies) lines.push(`Technologies: ${entry.technologies}`);
        if (entry.link) lines.push(`Link: ${entry.link}`);
        if (entry.description) lines.push(`Description: ${entry.description}`);
        lines.push("");
      });
    }
    const validCerts = certificationEntries.filter((entry) => entry.name || entry.organization || entry.dateIssued || entry.credentialId);
    if (validCerts.length > 0) {
      lines.push("Certifications & Awards");
      validCerts.forEach((entry, index) => {
        lines.push(`Certification #${index + 1}`);
        if (entry.name) lines.push(`Name: ${entry.name}`);
        if (entry.organization) lines.push(`Organization: ${entry.organization}`);
        if (entry.dateIssued) lines.push(`Date Issued: ${entry.dateIssued}`);
        if (entry.credentialId) lines.push(`Credential ID: ${entry.credentialId}`);
        lines.push("");
      });
    }
    return lines.join("\n");
  };

  const handleSaveResume = async () => {
    if (!userId) {
      setErrorMessage("You must be signed in to save a résumé.");
      return;
    }
    if (!resumeName.trim() || !personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setErrorMessage("Please fill in the résumé name, full name, and email.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      // Generate PDF using the template
      const pdfBlob = generateResumePDF({
        personalInfo,
        skills,
        educationEntries,
        experienceEntries,
        projectEntries,
        certificationEntries,
      });

      const safeName = resumeName.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "");
      const fileName = `${safeName || "resume"}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      const { data, error } = await uploadResume(file, userId);
      if (error || !data) {
        setErrorMessage(error?.message || "Failed to save résumé. Please try again.");
      } else {
        queryCache.invalidate(`resumes-list-${userId}`);
        refetch();
        setStatusMessage("Résumé saved successfully.");
        resetResumeBuilder(); // This also clears the draft
        closeResumeBuilder();
      }
    } catch (err) {
      setErrorMessage("Failed to generate PDF. Please try again.");
      console.error("PDF generation error:", err);
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
    queryCache.invalidate(`resumes-list-${userId}`);
    refetch();
  };

  const handleDownload = async (resume: ResumeWithUrl) => {
    const url = resume.signed_url || (await getDownloadUrl(resume.file_path));
    if (!url) {
      setErrorMessage("Unable to generate download link right now.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSaveCoverLetter = async () => {
    if (
      !coverLetterName.trim() ||
      !coverLetterForm.senderName.trim() ||
      !coverLetterForm.senderEmail.trim() ||
      !coverLetterForm.companyName.trim() ||
      !coverLetterForm.positionTitle.trim() ||
      !coverLetterForm.introParagraph.trim() ||
      !coverLetterForm.closingParagraph.trim()
    ) {
      setErrorMessage("Please complete the required cover letter fields.");
      return;
    }

    if (!userId) {
      setErrorMessage("You must be signed in to save a cover letter.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const pdfBlob = generateCoverLetterPDF(coverLetterForm);
      const safeName = coverLetterName.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "");
      const fileName = `cover_letter_${safeName || "document"}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      const { data, error } = await uploadResume(file, userId);
      if (error || !data) {
        setErrorMessage(error?.message || "Failed to save cover letter. Please try again.");
      } else {
        rememberCoverLetterDocumentId(data.id);
        queryCache.invalidate(`resumes-list-${userId}`);
        refetch();
        setStatusMessage("Cover letter saved successfully.");
        closeCoverLetterBuilder();
        resetCoverLetterBuilder();
      }
    } catch (error) {
      console.error("Cover letter PDF generation error:", error);
      setErrorMessage("Failed to generate cover letter PDF. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };


  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentType = (resume: ResumeWithUrl) => {
    if (coverLetterDocumentIds.includes(resume.id)) {
      return "Cover Letter";
    }

    const fileName = resume.file_name || "";
    const filePath = resume.file_path || "";
    const normalized = fileName.toLowerCase();
    const normalizedPath = filePath.toLowerCase();
    if (
      normalized.includes("cover_letter") ||
      normalized.includes("cover letter") ||
      normalized.includes("cover-letter") ||
      normalizedPath.includes("cover_letter") ||
      normalizedPath.includes("cover-letter")
    ) {
      return "Cover Letter";
    }
    return "Résumé";
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/resumes"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900 ml-auto" />
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
                onClick={() => {
                  // Check if there's a draft before clearing
                  const hasDraft = localStorage.getItem(DRAFT_KEY);
                  if (hasDraft) {
                    const shouldContinue = window.confirm(
                      "You have an unsaved draft. Do you want to continue where you left off?\n\nClick OK to continue your draft, or Cancel to start fresh."
                    );
                    if (!shouldContinue) {
                      resetResumeBuilder();
                    }
                  } else {
                    resetResumeBuilder();
                  }
                  openResumeBuilder();
                }}
                className="border-2 border-[#1B2744] text-[#1B2744] px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1B2744] hover:text-white transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Resume
              </button>
              <button
                onClick={() => {
                  const hasDraft = localStorage.getItem(COVER_LETTER_DRAFT_KEY);
                  if (hasDraft) {
                    const shouldContinue = window.confirm(
                      "You have an unsaved cover letter draft. Do you want to continue where you left off?\n\nClick OK to continue your draft, or Cancel to start fresh."
                    );
                    if (!shouldContinue) {
                      resetCoverLetterBuilder();
                    }
                  } else {
                    resetCoverLetterBuilder();
                  }
                  openCoverLetterBuilder();
                }}
                className="border-2 border-[#1B2744] text-[#1B2744] px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1B2744] hover:text-white transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Create New Cover Letter
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
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{resume.file_name}</h4>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                              getDocumentType(resume) === "Cover Letter"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {getDocumentType(resume)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Uploaded {formatDate(resume.created_at)} · {formatSize(resume.file_size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => handleDownload(resume)}
                        className="px-3 py-1.5 bg-[#1B2744] text-white text-sm font-medium rounded-lg hover:bg-[#131d33] transition-colors flex items-center gap-1.5"
                        title="View resume"
                      >
                        <Eye className="w-4 h-4" />
                        View Resume
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

      {/* Resume Builder Modal */}
      {showResumeBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Create New Résumé</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetResumeBuilder}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Clear all fields and start fresh"
                >
                  Clear Form
                </button>
                <button
                  onClick={closeResumeBuilder}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Resume Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Résumé Name</label>
                  <input
                    type="text"
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                    placeholder="e.g., Software Developer Resume"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                  />
                </div>

                {/* Personal Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>👤</span> Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={personalInfo.fullName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                        placeholder="Juan Dela Cruz"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                        placeholder="juan@email.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                        placeholder="+63 912 345 6789"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={personalInfo.address}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                        placeholder="City, Province"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                      <input
                        type="text"
                        value={personalInfo.linkedin}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                        placeholder="linkedin.com/in/username"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio/Website</label>
                      <input
                        type="text"
                        value={personalInfo.portfolio}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, portfolio: e.target.value })}
                        placeholder="yourportfolio.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Summary</label>
                    <textarea
                      value={personalInfo.summary}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, summary: e.target.value })}
                      placeholder="Brief summary of your professional background and career objectives..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                    />
                  </div>
                </div>

                {/* Education */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🎓</span> Education
                  </h3>
                  {educationEntries.map((entry, index) => (
                    <div key={entry.id} className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Education #{index + 1}</p>
                        {educationEntries.length > 1 && (
                          <button
                            onClick={() => setEducationEntries(educationEntries.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">School/University *</label>
                        <input
                          type="text"
                          value={entry.school}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], school: e.target.value };
                            setEducationEntries(next);
                          }}
                          placeholder="Tarlac State University"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                        <input
                          type="text"
                          value={entry.degree}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], degree: e.target.value };
                            setEducationEntries(next);
                          }}
                          placeholder="Bachelor of Science"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                        <input
                          type="text"
                          value={entry.field}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], field: e.target.value };
                            setEducationEntries(next);
                          }}
                          placeholder="Computer Science"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GPA (Optional)</label>
                        <input
                          type="text"
                          value={entry.gpa}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], gpa: e.target.value };
                            setEducationEntries(next);
                          }}
                          placeholder="3.5/4.0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="month"
                          value={entry.startDate}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], startDate: e.target.value };
                            setEducationEntries(next);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="month"
                          value={entry.endDate}
                          onChange={(e) => {
                            const next = [...educationEntries];
                            next[index] = { ...next[index], endDate: e.target.value };
                            setEducationEntries(next);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setEducationEntries([...educationEntries, { id: Date.now() }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Education
                    </button>
                </div>

                {/* Work Experience */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>💼</span> Work Experience
                  </h3>
                  {experienceEntries.map((entry, index) => (
                    <div key={entry.id} className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Experience #{index + 1}</p>
                        {experienceEntries.length > 1 && (
                          <button
                            onClick={() => setExperienceEntries(experienceEntries.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                        <input
                          type="text"
                          value={entry.company}
                          onChange={(e) => {
                            const next = [...experienceEntries];
                            next[index] = { ...next[index], company: e.target.value };
                            setExperienceEntries(next);
                          }}
                          placeholder="Company Name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                        <input
                          type="text"
                          value={entry.position}
                          onChange={(e) => {
                            const next = [...experienceEntries];
                            next[index] = { ...next[index], position: e.target.value };
                            setExperienceEntries(next);
                          }}
                          placeholder="Job Title"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="month"
                          value={entry.startDate}
                          onChange={(e) => {
                            const next = [...experienceEntries];
                            next[index] = { ...next[index], startDate: e.target.value };
                            setExperienceEntries(next);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="month"
                          value={entry.endDate}
                          onChange={(e) => {
                            const next = [...experienceEntries];
                            next[index] = { ...next[index], endDate: e.target.value };
                            setExperienceEntries(next);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={entry.current}
                        onChange={(e) => {
                          const next = [...experienceEntries];
                          next[index] = { ...next[index], current: e.target.checked };
                          setExperienceEntries(next);
                        }}
                        className="w-4 h-4 text-[#1B2744] rounded"
                      />
                      <label className="text-sm text-gray-700">Currently working here</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => {
                          const next = [...experienceEntries];
                          next[index] = { ...next[index], description: e.target.value };
                          setExperienceEntries(next);
                        }}
                        placeholder="Describe your responsibilities and achievements..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setExperienceEntries([...experienceEntries, { id: Date.now() }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Experience
                    </button>
                </div>

                {/* Skills */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>⚡</span> Skills
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
                    <textarea
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="JavaScript, React, Node.js, Python, SQL, Git, Agile, Communication..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter your skills separated by commas</p>
                  </div>
                </div>

                {/* Projects */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🚀</span> Projects
                  </h3>
                  {projectEntries.map((entry, index) => (
                    <div key={entry.id} className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Project #{index + 1}</p>
                        {projectEntries.length > 1 && (
                          <button
                            onClick={() => setProjectEntries(projectEntries.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) => {
                            const next = [...projectEntries];
                            next[index] = { ...next[index], name: e.target.value };
                            setProjectEntries(next);
                          }}
                          placeholder="Project Title"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Technologies Used</label>
                        <input
                          type="text"
                          value={entry.technologies}
                          onChange={(e) => {
                            const next = [...projectEntries];
                            next[index] = { ...next[index], technologies: e.target.value };
                            setProjectEntries(next);
                          }}
                          placeholder="React, Node.js, MongoDB"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Project Link (Optional)</label>
                      <input
                        type="text"
                        value={entry.link}
                        onChange={(e) => {
                          const next = [...projectEntries];
                          next[index] = { ...next[index], link: e.target.value };
                          setProjectEntries(next);
                        }}
                        placeholder="github.com/username/project"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => {
                          const next = [...projectEntries];
                          next[index] = { ...next[index], description: e.target.value };
                          setProjectEntries(next);
                        }}
                        placeholder="Brief description of the project and your contributions..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setProjectEntries([...projectEntries, { id: Date.now() }])}
                    className="w-full mt-3 py-2 border-2 border-[#00B4D8] text-[#00B4D8] rounded-lg hover:bg-[#00B4D8] hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </button>
                </div>

                {/* Certifications & Awards */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🏆</span> Certifications & Awards
                  </h3>
                  {certificationEntries.map((entry, index) => (
                    <div key={entry.id} className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Certification #{index + 1}</p>
                        {certificationEntries.length > 1 && (
                          <button
                            onClick={() => setCertificationEntries(certificationEntries.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Certification Name</label>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) => {
                            const next = [...certificationEntries];
                            next[index] = { ...next[index], name: e.target.value };
                            setCertificationEntries(next);
                          }}
                          placeholder="AWS Certified Developer"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Issuing Organization</label>
                        <input
                          type="text"
                          value={entry.organization}
                          onChange={(e) => {
                            const next = [...certificationEntries];
                            next[index] = { ...next[index], organization: e.target.value };
                            setCertificationEntries(next);
                          }}
                          placeholder="Amazon Web Services"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Issued</label>
                        <input
                          type="month"
                          value={entry.dateIssued}
                          onChange={(e) => {
                            const next = [...certificationEntries];
                            next[index] = { ...next[index], dateIssued: e.target.value };
                            setCertificationEntries(next);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Credential ID (Optional)</label>
                        <input
                          type="text"
                          value={entry.credentialId}
                          onChange={(e) => {
                            const next = [...certificationEntries];
                            next[index] = { ...next[index], credentialId: e.target.value };
                            setCertificationEntries(next);
                          }}
                          placeholder="ABC123XYZ"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setCertificationEntries([...certificationEntries, { id: Date.now() }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Certification
                    </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeResumeBuilder}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResume}
                disabled={isUploading}
                className="px-6 py-2.5 bg-[#1B2744] text-white rounded-lg hover:bg-[#131d33] transition-colors font-medium flex items-center gap-2 disabled:opacity-60"
              >
                <FileText className="w-4 h-4" />
                {isUploading ? "Saving..." : "Save Résumé"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverLetterBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Create New Cover Letter</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCoverLetterBuilder}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear Form
                </button>
                <button
                  onClick={closeCoverLetterBuilder}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter Name *</label>
                  <input
                    type="text"
                    value={coverLetterName}
                    onChange={(e) => setCoverLetterName(e.target.value)}
                    placeholder="e.g., Cover Letter - Career Coach Position"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={coverLetterForm.senderName}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, senderName: e.target.value })}
                        placeholder="Joe Williams"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                      <input
                        type="text"
                        value={coverLetterForm.senderTitle}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, senderTitle: e.target.value })}
                        placeholder="Career Coach/Resume Writer"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={coverLetterForm.senderPhone}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, senderPhone: e.target.value })}
                        placeholder="868-554-0430"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={coverLetterForm.senderEmail}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, senderEmail: e.target.value })}
                        placeholder="joewilliams@gmail.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={coverLetterForm.senderLocation}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, senderLocation: e.target.value })}
                        placeholder="Boston, MA"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={coverLetterForm.letterDate}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, letterDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipient Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hiring Manager Name</label>
                      <input
                        type="text"
                        value={coverLetterForm.recipientName}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, recipientName: e.target.value })}
                        placeholder="Ms. Jenny Johnson"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Title/Department</label>
                      <input
                        type="text"
                        value={coverLetterForm.recipientTitle}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, recipientTitle: e.target.value })}
                        placeholder="Human Resources"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                      <input
                        type="text"
                        value={coverLetterForm.companyName}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, companyName: e.target.value })}
                        placeholder="IHeartjobs"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
                      <input
                        type="text"
                        value={coverLetterForm.companyAddress}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, companyAddress: e.target.value })}
                        placeholder="55 Bixby Way, Manchester, NH 40344"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Letter Content</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position Applying For *</label>
                      <input
                        type="text"
                        value={coverLetterForm.positionTitle}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, positionTitle: e.target.value })}
                        placeholder="Career Counselor Position"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salutation</label>
                      <input
                        type="text"
                        value={coverLetterForm.salutation}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, salutation: e.target.value })}
                        placeholder="Dear Ms. Johnson,"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Opening Paragraph *</label>
                      <textarea
                        value={coverLetterForm.introParagraph}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, introParagraph: e.target.value })}
                        placeholder="Introduce yourself, mention the role, and explain why you are interested."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Experience Paragraph</label>
                      <textarea
                        value={coverLetterForm.experienceParagraph}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, experienceParagraph: e.target.value })}
                        placeholder="Highlight your relevant skills and achievements."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Closing Paragraph *</label>
                      <textarea
                        value={coverLetterForm.closingParagraph}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, closingParagraph: e.target.value })}
                        placeholder="Close confidently, include contact preference, and thank the reader."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Complimentary Close</label>
                        <input
                          type="text"
                          value={coverLetterForm.complimentaryClose}
                          onChange={(e) => setCoverLetterForm({ ...coverLetterForm, complimentaryClose: e.target.value })}
                          placeholder="Sincerely,"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signature Name</label>
                        <input
                          type="text"
                          value={coverLetterForm.signatureName}
                          onChange={(e) => setCoverLetterForm({ ...coverLetterForm, signatureName: e.target.value })}
                          placeholder="Joe Williams"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeCoverLetterBuilder}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCoverLetter}
                disabled={isUploading}
                className="px-6 py-2.5 bg-[#1B2744] text-white rounded-lg hover:bg-[#131d33] transition-colors font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {isUploading ? "Saving..." : "Save Cover Letter"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const studentId = useStudentId(user?.id);

  const userId = user?.id || "";
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

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
