import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Download, Trash2, FileText, AlertCircle, CheckCircle2, Eye, Plus, X, Menu, Award, User, GraduationCap, Briefcase, Zap, Rocket } from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useMessageBox } from "../components/common/MessageBoxProvider";
import { useAuth } from "../hooks/useAuth";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useStudent } from "../context/StudentContext";
import { supabase } from "../lib/supabaseClient";
import { queryCache } from "../utils/queryCache";
import { generateCoverLetterPDF, generateResumePDF } from "../utils/pdfGenerator";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  createResumeFromBlob,
  deleteResume,
  getDownloadUrl,
  listResumes,
  uploadResume,
  validateResumeFile,
  saveStructuredResume,
  updateStructuredResume,
  listStructuredResumes,
  deleteStructuredResume,
  type ResumeWithUrl,
  type StructuredResumeRecord,
} from "../services/resumeService";

type NavigateHandler = (route: string) => void;

interface ResumesPageContentProps {
  userId: string;
  userName: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

function ResumesPageContent({ userId, userName, studentId, onLogout, onNavigate }: ResumesPageContentProps & { studentId?: string }) {
  const messageBox = useMessageBox();
  const userID = studentId || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [resumeBuilderError, setResumeBuilderError] = useState<string | null>(null);
  const [structuredResumes, setStructuredResumes] = useState<StructuredResumeRecord[]>([]);
  const [isLoadingStructured, setIsLoadingStructured] = useState(false);
  const [viewingStructuredResume, setViewingStructuredResume] = useState<StructuredResumeRecord | null>(null);
  const [editingStructuredResumeId, setEditingStructuredResumeId] = useState<string | null>(null);
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
  const resumeModalScrollRef = useRef<HTMLDivElement | null>(null);
  const coverLetterModalScrollRef = useRef<HTMLDivElement | null>(null);
  const DRAFT_KEY = `resume_draft_${userId}`;
  const MODAL_KEY = `resume_builder_open_${userId}`;
  const RESUME_MODAL_SCROLL_KEY = `resume_builder_scroll_${userId}`;
  const COVER_LETTER_DRAFT_KEY = `cover_letter_draft_${userId}`;
  const COVER_LETTER_MODAL_KEY = `cover_letter_builder_open_${userId}`;
  const COVER_LETTER_MODAL_SCROLL_KEY = `cover_letter_builder_scroll_${userId}`;
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

  const fetchStructuredResumes = async () => {
    if (!userId) return;
    setIsLoadingStructured(true);
    const { data } = await listStructuredResumes(userId);
    setStructuredResumes(data ?? []);
    setIsLoadingStructured(false);
  };

  useEffect(() => {
    fetchStructuredResumes();
  }, [userId]);

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
    setResumeBuilderError(null);
    setEditingStructuredResumeId(null);
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

  const persistModalScroll = (key: string, value: number) => {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.error("Failed to persist modal scroll:", error);
    }
  };

  const restoreModalScroll = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (error) {
      console.error("Failed to restore modal scroll:", error);
      return 0;
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
    persistModalScroll(RESUME_MODAL_SCROLL_KEY, 0);
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
    persistModalScroll(COVER_LETTER_MODAL_SCROLL_KEY, 0);
  };

  // Load draft when modal opens
  useEffect(() => {
    if (showResumeBuilder) {
      loadDraft();
    }
  }, [showResumeBuilder]);

  // Persist resume draft immediately when tab becomes hidden.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveDraft();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resumeName, personalInfo, skills, educationEntries, experienceEntries, projectEntries, certificationEntries]);

  // Load cover letter draft when modal opens
  useEffect(() => {
    if (showCoverLetterBuilder) {
      loadCoverLetterDraft();
    }
  }, [showCoverLetterBuilder]);

  // Persist cover letter draft immediately when tab becomes hidden.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveCoverLetterDraft();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coverLetterName, coverLetterForm]);

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

  // Restore modal scroll positions after mounts/re-renders that can happen on tab switches.
  useEffect(() => {
    if (!showResumeBuilder) return;

    requestAnimationFrame(() => {
      if (!resumeModalScrollRef.current) return;
      resumeModalScrollRef.current.scrollTop = restoreModalScroll(RESUME_MODAL_SCROLL_KEY);
    });
  }, [showResumeBuilder, RESUME_MODAL_SCROLL_KEY]);

  useEffect(() => {
    if (!showCoverLetterBuilder) return;

    requestAnimationFrame(() => {
      if (!coverLetterModalScrollRef.current) return;
      coverLetterModalScrollRef.current.scrollTop = restoreModalScroll(COVER_LETTER_MODAL_SCROLL_KEY);
    });
  }, [showCoverLetterBuilder, COVER_LETTER_MODAL_SCROLL_KEY]);

  useEffect(() => {
    if (!showResumeBuilder) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const currentScroll = resumeModalScrollRef.current?.scrollTop ?? 0;
      persistModalScroll(RESUME_MODAL_SCROLL_KEY, currentScroll);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showResumeBuilder, RESUME_MODAL_SCROLL_KEY]);

  useEffect(() => {
    if (!showCoverLetterBuilder) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const currentScroll = coverLetterModalScrollRef.current?.scrollTop ?? 0;
      persistModalScroll(COVER_LETTER_MODAL_SCROLL_KEY, currentScroll);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showCoverLetterBuilder, COVER_LETTER_MODAL_SCROLL_KEY]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleUpload(file);
    event.target.value = "";
  };

  // Drag and drop handlers for resume upload
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    const validation = validateResumeFile(file);
    if (validation) {
      setErrorMessage(validation);
      return;
    }
    if (!userId) {
      setErrorMessage("You must be signed in to upload a resume.");
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const { data, error } = await uploadResume(file, userId);
    if (error || !data) {
      setErrorMessage(error?.message || "Failed to upload resume. Please try again.");
    } else {
      queryCache.invalidate(`resumes-list-${userId}`);
      refetch();
      setStatusMessage("Document uploaded successfully.");
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

  const handlePreviewResume = () => {
    if (!userId) {
      setErrorMessage("You must be signed in to save a resume.");
      return;
    }
    if (!resumeName.trim()) {
      setResumeBuilderError("Please fill in a resume name.");
      return;
    }
    if (!personalInfo.fullName.trim()) {
      setResumeBuilderError("Please fill in your full name.");
      return;
    }
    if (!personalInfo.email.trim()) {
      setResumeBuilderError("Please fill in your email address.");
      return;
    }
    setResumeBuilderError(null);
    setShowResumePreview(true);
  };

  const handleSaveStructuredResume = async () => {
    if (!userId) {
      setErrorMessage("You must be signed in to save a resume.");
      return;
    }
    if (!resumeName.trim() || !personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setResumeBuilderError("Please fill in all required fields.");
      return;
    }
    setResumeBuilderError(null);
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    const resumeData = { personalInfo, skills, educationEntries, experienceEntries, projectEntries, certificationEntries };
    try {
      const { error } = editingStructuredResumeId
        ? await updateStructuredResume(editingStructuredResumeId, resumeName.trim(), resumeData)
        : await saveStructuredResume(userId, resumeName.trim(), resumeData);
      if (error) {
        setErrorMessage(error.message || "Failed to save resume. Please try again.");
      } else {
        setStatusMessage(editingStructuredResumeId ? "Resume updated successfully." : "Resume saved successfully.");
        setEditingStructuredResumeId(null);
        resetResumeBuilder();
        closeResumeBuilder();
        setShowResumePreview(false);
        fetchStructuredResumes();
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("Save structured resume error:", err);
    }
    setIsUploading(false);
  };

  const handleOpenEditStructuredResume = (record: StructuredResumeRecord) => {
    const d = record.resume_data;
    setResumeName(record.title);
    setPersonalInfo(d.personalInfo);
    setSkills(d.skills);
    setEducationEntries(d.educationEntries.length ? d.educationEntries : [{ id: 1, school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" }]);
    setExperienceEntries(d.experienceEntries.length ? d.experienceEntries : [{ id: 1, company: "", position: "", startDate: "", endDate: "", current: false, description: "" }]);
    setProjectEntries(d.projectEntries.length ? d.projectEntries : [{ id: 1, name: "", technologies: "", link: "", description: "" }]);
    setCertificationEntries(d.certificationEntries.length ? d.certificationEntries : [{ id: 1, name: "", organization: "", dateIssued: "", credentialId: "" }]);
    setEditingStructuredResumeId(record.id);
    setShowResumeBuilder(true);
    setShowResumePreview(true);
  };

  const handleDownloadStructuredResume = (record: StructuredResumeRecord) => {
    const d = record.resume_data;
    const pdfBlob = generateResumePDF({
      personalInfo: d.personalInfo,
      skills: d.skills,
      educationEntries: d.educationEntries,
      experienceEntries: d.experienceEntries,
      projectEntries: d.projectEntries,
      certificationEntries: d.certificationEntries,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    const safeName = record.title.replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "");
    a.href = url;
    a.download = `${safeName || "resume"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteStructuredResume = async (record: StructuredResumeRecord) => {
    const confirmed = await messageBox.confirm({
      title: "Delete Resume?",
      message: `Delete "${record.title}"? This action cannot be undone.`,
      tone: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    const { error } = await deleteStructuredResume(record.id);
    if (error) {
      setErrorMessage(error.message || "Failed to delete resume.");
    } else {
      setStructuredResumes((prev) => prev.filter((r) => r.id !== record.id));
    }
  };

  const handleSaveResume = async () => {
    if (!userId) {
      setErrorMessage("You must be signed in to save a resume.");
      return;
    }
    if (!resumeName.trim() || !personalInfo.fullName.trim() || !personalInfo.email.trim()) {
      setResumeBuilderError("Please fill in all required fields.");
      return;
    }
    setResumeBuilderError(null);

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
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

      // Extract skills from form (comma or newline separated)
      const extractedSkills = skills
        .split(/[\n,]/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Use new function that stores skills directly
      const { data, error } = await createResumeFromBlob(
        pdfBlob,
        fileName,
        userId,
        extractedSkills
      );
      if (error || !data) {
        setErrorMessage(error?.message || "Failed to save resume. Please try again.");
      } else {
        queryCache.invalidate(`resumes-list-${userId}`);
        refetch();
        setStatusMessage("Resume saved successfully.");
        resetResumeBuilder(); // This also clears the draft
        closeResumeBuilder();
        setShowResumePreview(false);
      }
    } catch (err) {
      setErrorMessage("Failed to generate PDF. Please try again.");
      console.error("PDF generation error:", err);
    }
    
    setIsUploading(false);
  };

  const handleDelete = async (resume: ResumeWithUrl) => {
    const confirmed = await messageBox.confirm({
      title: "Delete Document?",
      message: `Delete ${resume.file_name}? This action cannot be undone.`,
      tone: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    setErrorMessage(null);
    const { error } = await deleteResume(resume.id, resume.file_path, userId);
    if (error) {
      setErrorMessage(error.message || "Failed to delete resume.");
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
    return "Resume";
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/resumes"
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
                onLogout={() => { setMobileOpen(false); onLogout(); }}
                onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                activeNav="student/resumes"
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
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Resume Management</h1>
            <p className="text-gray-500">Upload, create, and manage your resumes and cover letters</p>
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
          <div
            className={`rounded-2xl p-6 sm:p-8 lg:p-12 shadow-sm border-2 border-dashed mb-6 sm:mb-8 text-center transition-colors cursor-pointer ${isDragOver ? "bg-blue-50 border-blue-300" : "bg-white border-gray-300 hover:border-gray-400"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Resume</h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your file here, or click to browse.
              <br />
              Supported: {allowedFormatsLabel} • Max {(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload resume file"
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
                onClick={async () => {
                  // Check if there's a draft with actual content before offering to restore
                  const rawDraft = localStorage.getItem(DRAFT_KEY);
                  let hasDraft = false;
                  if (rawDraft) {
                    try {
                      const parsed = JSON.parse(rawDraft);
                      hasDraft = !!(parsed.resumeName?.trim() || parsed.personalInfo?.fullName?.trim() || parsed.personalInfo?.email?.trim());
                    } catch { hasDraft = false; }
                  }
                  if (hasDraft) {
                    const shouldContinue = await messageBox.confirm({
                      title: "Unsaved Resume Draft",
                      message: "Do you want to continue where you left off? Choose Cancel to start fresh.",
                      tone: "info",
                      confirmText: "Continue Draft",
                      cancelText: "Start Fresh",
                    });
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
                onClick={async () => {
                  const hasDraft = localStorage.getItem(COVER_LETTER_DRAFT_KEY);
                  if (hasDraft) {
                    const shouldContinue = await messageBox.confirm({
                      title: "Unsaved Cover Letter Draft",
                      message: "Do you want to continue where you left off? Choose Cancel to start fresh.",
                      tone: "info",
                      confirmText: "Continue Draft",
                      cancelText: "Start Fresh",
                    });
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

          {/* Resume Builder */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Resume Builder ({structuredResumes.length})</h2>
            {isLoadingStructured ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-600">Loading your resumes...</div>
            ) : structuredResumes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-800 mb-1">No resumes created yet</p>
                <p className="text-gray-500 text-sm">Use "Create New Resume" to build one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {structuredResumes.map((record) => (
                  <div key={record.id} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{record.title}</h4>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-blue-100 text-blue-700">Builder</span>
                        </div>
                        <p className="text-sm text-gray-500">Created {formatDate(record.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => setViewingStructuredResume(record)}
                        className="px-3 py-1.5 bg-[#1B2744] text-white text-sm font-medium rounded-lg hover:bg-[#131d33] transition-colors flex items-center gap-1.5"
                        title="View resume"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button
                        onClick={() => handleOpenEditStructuredResume(record)}
                        className="px-3 py-1.5 border border-[#1B2744] text-[#1B2744] text-sm font-medium rounded-lg hover:bg-[#1B2744] hover:text-white transition-colors flex items-center gap-1.5"
                        title="Edit resume"
                      >
                        <FileText className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDownloadStructuredResume(record)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                        title="Download as PDF"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                      <button
                        onClick={() => handleDeleteStructuredResume(record)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete resume"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Uploaded Documents */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Uploaded Documents ({resumes.length})</h2>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-600">Loading your resumes...</div>
            ) : resumes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-800 mb-1">No resumes yet</p>
                <p className="text-gray-500 text-sm">Upload your first resume to get started.</p>
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
                          {getDocumentType(resume) === "Cover Letter" && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-indigo-100 text-indigo-700">
                              Cover Letter
                            </span>
                          )}
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
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(resume)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete resume"
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tips for Your Resume</h3>
            <div className="space-y-3">
              <TipItem text="Keep your resume concise and relevant to the job you're applying for" />
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
                <h2 className="text-2xl font-bold text-gray-900">Create New Resume</h2>
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
                  aria-label="Close resume builder"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div
              ref={resumeModalScrollRef}
              onScroll={(e) => persistModalScroll(RESUME_MODAL_SCROLL_KEY, e.currentTarget.scrollTop)}
              className="flex-1 overflow-auto p-6"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Resume Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume Name</label>
                  <input
                    type="text"
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                    placeholder="e.g., Software Developer Resume"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                    aria-label="Resume name"
                  />
                </div>

                {/* Personal Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" /> Personal Information
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
                        aria-label="Full name"
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
                        aria-label="Email"
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
                        aria-label="Phone number"
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
                        aria-label="Address"
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
                        aria-label="LinkedIn URL"
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
                        aria-label="Portfolio or website"
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
                      aria-label="Professional summary"
                    />
                  </div>
                </div>

                {/* Education */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Education
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
                          aria-label={`School or university ${index + 1}`}
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
                          aria-label={`Degree ${index + 1}`}
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
                          aria-label={`Field of study ${index + 1}`}
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
                          aria-label={`GPA ${index + 1}`}
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
                          aria-label={`Education start date ${index + 1}`}
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
                          aria-label={`Education end date ${index + 1}`}
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setEducationEntries([...educationEntries, { id: Date.now(), school: '', degree: '', field: '', gpa: '', startDate: '', endDate: '' }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Education
                    </button>
                </div>

                {/* Work Experience */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" /> Work Experience
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
                          aria-label={`Company ${index + 1}`}
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
                          aria-label={`Position ${index + 1}`}
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
                          aria-label={`Work start date ${index + 1}`}
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
                          aria-label={`Work end date ${index + 1}`}
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
                        aria-label="Currently working here"
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
                        aria-label={`Work description ${index + 1}`}
                      />
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setExperienceEntries([...experienceEntries, { id: Date.now(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Experience
                    </button>
                </div>

                {/* Skills */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" /> Skills
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
                    <textarea
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="JavaScript, React, Node.js, Python, SQL, Git, Agile, Communication..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      aria-label="Skills"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter your skills separated by commas</p>
                  </div>
                </div>

                {/* Projects */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Rocket className="w-5 h-5" /> Projects
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
                          aria-label={`Project name ${index + 1}`}
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
                          aria-label={`Technologies used ${index + 1}`}
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
                        aria-label={`Project link ${index + 1}`}
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
                        aria-label={`Project description ${index + 1}`}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                      />
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setProjectEntries([...projectEntries, { id: Date.now(), name: '', technologies: '', link: '', description: '' }])}
                    className="w-full mt-3 py-2 border-2 border-[#00B4D8] text-[#00B4D8] rounded-lg hover:bg-[#00B4D8] hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </button>
                </div>

                {/* Certifications & Awards */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5" /> Certifications & Awards
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
                          aria-label={`Certification name ${index + 1}`}
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
                          aria-label={`Issuing organization ${index + 1}`}
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
                          aria-label={`Date issued ${index + 1}`}
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
                          aria-label={`Credential ID ${index + 1}`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                  <button 
                    onClick={() => setCertificationEntries([...certificationEntries, { id: Date.now(), name: '', organization: '', dateIssued: '', credentialId: '' }])}
                    className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus className="w-4 h-4" />
                      Add Certification
                    </button>
                </div>
              </div>
            </div>

            {resumeBuilderError && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {resumeBuilderError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeResumeBuilder}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePreviewResume}
                className="px-6 py-2.5 bg-[#1B2744] text-white rounded-lg hover:bg-[#131d33] transition-colors font-medium flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only view modal for saved structured resumes */}
      {viewingStructuredResume && (() => {
        const d = viewingStructuredResume.resume_data;
        const pi = d.personalInfo;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingStructuredResume.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Created {formatDate(viewingStructuredResume.created_at)}</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => setViewingStructuredResume(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                <div className="bg-white shadow-lg mx-auto max-w-2xl px-12 py-10 text-gray-800 text-sm" style={{ fontFamily: 'Georgia, serif', minHeight: '500px' }}>
                  <h1 className="text-2xl font-bold text-center mb-1">{pi.fullName}</h1>
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-4">
                    {pi.email && <span>{pi.email}</span>}
                    {pi.phone && <><span className="text-gray-300">|</span><span>{pi.phone}</span></>}
                    {pi.address && <><span className="text-gray-300">|</span><span>{pi.address}</span></>}
                    {pi.linkedin && <><span className="text-gray-300">|</span><span>{pi.linkedin}</span></>}
                    {pi.portfolio && <><span className="text-gray-300">|</span><span>{pi.portfolio}</span></>}
                  </div>
                  <hr className="border-gray-700 mb-4" />
                  {pi.summary && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Summary</h3>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{pi.summary}</p>
                    </section>
                  )}
                  {d.educationEntries.some((e) => e.school || e.degree) && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Education</h3>
                      {d.educationEntries.filter((e) => e.school || e.degree).map((e, i) => (
                        <div key={i} className="mb-3 flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold text-sm">{e.school}</p>
                            <p className="text-xs text-gray-500">{[e.degree, e.field].filter(Boolean).join(" in ")}{e.gpa ? ` • GPA: ${e.gpa}` : ""}</p>
                          </div>
                          {(e.startDate || e.endDate) && <p className="text-xs text-gray-500 shrink-0">{e.startDate} – {e.endDate || "Present"}</p>}
                        </div>
                      ))}
                    </section>
                  )}
                  {d.experienceEntries.some((e) => e.company || e.position) && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Work Experience</h3>
                      {d.experienceEntries.filter((e) => e.company || e.position).map((e, i) => (
                        <div key={i} className="mb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-semibold text-sm">{[e.position, e.company].filter(Boolean).join(" | ")}</p>
                              {e.description && <p className="text-xs text-gray-600 leading-relaxed mt-0.5 whitespace-pre-wrap">{e.description}</p>}
                            </div>
                            {(e.startDate || e.endDate) && <p className="text-xs text-gray-500 shrink-0">{e.startDate} – {e.current ? "Present" : e.endDate}</p>}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                  {d.skills.trim() && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Skills</h3>
                      <p className="text-sm leading-relaxed">{d.skills}</p>
                    </section>
                  )}
                  {d.projectEntries.some((e) => e.name) && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Projects</h3>
                      {d.projectEntries.filter((e) => e.name).map((e, i) => (
                        <div key={i} className="mb-3">
                          <p className="font-semibold text-sm">{e.name}{e.technologies ? ` | ${e.technologies}` : ""}{e.link ? ` • ${e.link}` : ""}</p>
                          {e.description && <p className="text-xs text-gray-600 leading-relaxed mt-0.5 whitespace-pre-wrap">{e.description}</p>}
                        </div>
                      ))}
                    </section>
                  )}
                  {d.certificationEntries.some((e) => e.name) && (
                    <section className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Certifications & Awards</h3>
                      {d.certificationEntries.filter((e) => e.name).map((e, i) => (
                        <div key={i} className="mb-2 flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold text-sm">{e.name}</p>
                            <p className="text-xs text-gray-500">{e.organization}{e.credentialId ? ` • ID: ${e.credentialId}` : ""}</p>
                          </div>
                          {e.dateIssued && <p className="text-xs text-gray-500 shrink-0">{e.dateIssued}</p>}
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
                <button type="button" onClick={() => { setViewingStructuredResume(null); handleOpenEditStructuredResume(viewingStructuredResume); }} className="px-5 py-2 border border-[#1B2744] text-[#1B2744] rounded-lg hover:bg-[#1B2744] hover:text-white font-medium text-sm transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Edit
                </button>
                <button type="button" onClick={() => handleDownloadStructuredResume(viewingStructuredResume)} className="px-5 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#131d33] font-medium text-sm flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showResumePreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Resume Preview</h2>
                <p className="text-sm text-gray-500 mt-0.5">Click any field to edit before downloading</p>
              </div>
              <button type="button" aria-label="Close preview" onClick={() => setShowResumePreview(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Paper document */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div className="bg-white shadow-lg mx-auto max-w-2xl px-12 py-10 text-gray-800 text-sm" style={{ fontFamily: 'Georgia, serif', minHeight: '500px' }}>

                {/* Name */}
                <div className="text-center mb-1">
                  <input
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                    className="text-2xl font-bold text-center w-full bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none"
                    placeholder="Full Name"
                  />
                </div>

                {/* Contact row */}
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-4">
                  <input value={personalInfo.email} onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-center min-w-0" placeholder="email" />
                  <span className="text-gray-300">|</span>
                  <input value={personalInfo.phone} onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-center min-w-0" placeholder="phone" />
                  <span className="text-gray-300">|</span>
                  <input value={personalInfo.address} onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-center min-w-0" placeholder="location" />
                  {personalInfo.linkedin && <><span className="text-gray-300">|</span><input value={personalInfo.linkedin} onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-center min-w-0" placeholder="linkedin" /></>}
                  {personalInfo.portfolio && <><span className="text-gray-300">|</span><input value={personalInfo.portfolio} onChange={(e) => setPersonalInfo({ ...personalInfo, portfolio: e.target.value })} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-center min-w-0" placeholder="portfolio" /></>}
                </div>

                <hr className="border-gray-700 mb-4" />

                {/* Summary */}
                {personalInfo.summary && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Summary</h3>
                    <textarea aria-label="Professional summary" value={personalInfo.summary} onChange={(e) => setPersonalInfo({ ...personalInfo, summary: e.target.value })} className="w-full text-sm leading-relaxed bg-transparent border-0 focus:outline-none resize-none" rows={3} />
                  </section>
                )}

                {/* Education */}
                {educationEntries.some((e) => e.school || e.degree || e.field) && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Education</h3>
                    {educationEntries.map((entry, i) =>
                      (entry.school || entry.degree || entry.field) ? (
                        <div key={entry.id} className="mb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <input value={entry.school} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], school: e.target.value }; setEducationEntries(n); }} className="font-semibold text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none w-full" placeholder="School/University" />
                              <div className="flex flex-wrap gap-1 text-xs text-gray-500 mt-0.5">
                                <input value={entry.degree} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], degree: e.target.value }; setEducationEntries(n); }} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Degree" />
                                {entry.degree && entry.field && <span className="self-center">in</span>}
                                <input value={entry.field} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], field: e.target.value }; setEducationEntries(n); }} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Field of Study" />
                                {entry.gpa && <><span className="self-center">• GPA:</span><input aria-label="GPA" value={entry.gpa} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], gpa: e.target.value }; setEducationEntries(n); }} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none w-16" /></>}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 text-right shrink-0">
                              <input aria-label="Education start date" value={entry.startDate} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], startDate: e.target.value }; setEducationEntries(n); }} type="month" className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right w-28" />
                              {(entry.startDate || entry.endDate) && <span> – </span>}
                              <input aria-label="Education end date" value={entry.endDate} onChange={(e) => { const n = [...educationEntries]; n[i] = { ...n[i], endDate: e.target.value }; setEducationEntries(n); }} type="month" className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right w-28" />
                            </div>
                          </div>
                        </div>
                      ) : null
                    )}
                  </section>
                )}

                {/* Experience */}
                {experienceEntries.some((e) => e.company || e.position) && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Work Experience</h3>
                    {experienceEntries.map((entry, i) =>
                      (entry.company || entry.position) ? (
                        <div key={entry.id} className="mb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline gap-1">
                                <input value={entry.position} onChange={(e) => { const n = [...experienceEntries]; n[i] = { ...n[i], position: e.target.value }; setExperienceEntries(n); }} className="font-semibold text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Position" />
                                {entry.company && <span className="text-gray-400 text-sm">|</span>}
                                <input value={entry.company} onChange={(e) => { const n = [...experienceEntries]; n[i] = { ...n[i], company: e.target.value }; setExperienceEntries(n); }} className="text-sm text-gray-600 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Company" />
                              </div>
                              {entry.description && (
                                <textarea aria-label="Job description" value={entry.description} onChange={(e) => { const n = [...experienceEntries]; n[i] = { ...n[i], description: e.target.value }; setExperienceEntries(n); }} className="mt-1 w-full text-xs text-gray-600 leading-relaxed bg-transparent border-0 focus:outline-none resize-none" rows={2} />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 text-right shrink-0">
                              <input aria-label="Job start date" value={entry.startDate} onChange={(e) => { const n = [...experienceEntries]; n[i] = { ...n[i], startDate: e.target.value }; setExperienceEntries(n); }} type="month" className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right w-28" />
                              <span> – </span>
                              {entry.current ? <span>Present</span> : <input aria-label="Job end date" value={entry.endDate} onChange={(e) => { const n = [...experienceEntries]; n[i] = { ...n[i], endDate: e.target.value }; setExperienceEntries(n); }} type="month" className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right w-28" />}
                            </div>
                          </div>
                        </div>
                      ) : null
                    )}
                  </section>
                )}

                {/* Skills */}
                {skills.trim() && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Skills</h3>
                    <textarea aria-label="Skills" value={skills} onChange={(e) => setSkills(e.target.value)} className="w-full text-sm bg-transparent border-0 focus:outline-none resize-none leading-relaxed" rows={2} />
                  </section>
                )}

                {/* Projects */}
                {projectEntries.some((e) => e.name) && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Projects</h3>
                    {projectEntries.map((entry, i) =>
                      entry.name ? (
                        <div key={entry.id} className="mb-3">
                          <div className="flex flex-wrap items-baseline gap-1">
                            <input value={entry.name} onChange={(e) => { const n = [...projectEntries]; n[i] = { ...n[i], name: e.target.value }; setProjectEntries(n); }} className="font-semibold text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Project Name" />
                            {entry.technologies && <><span className="text-gray-400 text-xs">|</span><input value={entry.technologies} onChange={(e) => { const n = [...projectEntries]; n[i] = { ...n[i], technologies: e.target.value }; setProjectEntries(n); }} className="text-xs text-gray-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Technologies" /></>}
                            {entry.link && <><span className="text-gray-400 text-xs">•</span><input value={entry.link} onChange={(e) => { const n = [...projectEntries]; n[i] = { ...n[i], link: e.target.value }; setProjectEntries(n); }} className="text-xs text-blue-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Link" /></>}
                          </div>
                          {entry.description && (
                            <textarea aria-label="Project description" value={entry.description} onChange={(e) => { const n = [...projectEntries]; n[i] = { ...n[i], description: e.target.value }; setProjectEntries(n); }} className="mt-1 w-full text-xs text-gray-600 leading-relaxed bg-transparent border-0 focus:outline-none resize-none" rows={2} />
                          )}
                        </div>
                      ) : null
                    )}
                  </section>
                )}

                {/* Certifications */}
                {certificationEntries.some((e) => e.name) && (
                  <section className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 border-b border-gray-300 pb-1 mb-2">Certifications & Awards</h3>
                    {certificationEntries.map((entry, i) =>
                      entry.name ? (
                        <div key={entry.id} className="mb-2">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <input value={entry.name} onChange={(e) => { const n = [...certificationEntries]; n[i] = { ...n[i], name: e.target.value }; setCertificationEntries(n); }} className="font-semibold text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none w-full" placeholder="Certification Name" />
                              <div className="flex flex-wrap gap-1 text-xs text-gray-500 mt-0.5">
                                <input value={entry.organization} onChange={(e) => { const n = [...certificationEntries]; n[i] = { ...n[i], organization: e.target.value }; setCertificationEntries(n); }} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Organization" />
                                {entry.credentialId && <><span className="self-center">• ID:</span><input value={entry.credentialId} onChange={(e) => { const n = [...certificationEntries]; n[i] = { ...n[i], credentialId: e.target.value }; setCertificationEntries(n); }} className="bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" placeholder="Credential ID" /></>}
                              </div>
                            </div>
                            <input value={entry.dateIssued} onChange={(e) => { const n = [...certificationEntries]; n[i] = { ...n[i], dateIssued: e.target.value }; setCertificationEntries(n); }} className="text-xs text-gray-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-right ml-4 shrink-0" placeholder="Date Issued" />
                          </div>
                        </div>
                      ) : null
                    )}
                  </section>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
              <p className="text-xs text-gray-400">Edits here sync back to the builder</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResumePreview(false)} className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors">
                  Back to Edit
                </button>
                <button type="button" onClick={handleSaveStructuredResume} disabled={isUploading} className="px-5 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#131d33] font-medium text-sm flex items-center gap-2 disabled:opacity-60 transition-colors">
                  <FileText className="w-4 h-4" />
                  {isUploading ? "Saving..." : "Save"}
                </button>
              </div>
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
                  aria-label="Close cover letter builder"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div
              ref={coverLetterModalScrollRef}
              onScroll={(e) => persistModalScroll(COVER_LETTER_MODAL_SCROLL_KEY, e.currentTarget.scrollTop)}
              className="flex-1 overflow-auto p-6"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter Name *</label>
                  <input
                    type="text"
                    value={coverLetterName}
                    onChange={(e) => setCoverLetterName(e.target.value)}
                    placeholder="e.g., Cover Letter - Career Coach Position"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744] focus:border-transparent"
                    aria-label="Cover letter name"
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
                        aria-label="Your full name"
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
                        aria-label="Professional title"
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
                        aria-label="Your phone number"
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
                        aria-label="Your email"
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
                        aria-label="Your location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={coverLetterForm.letterDate}
                        onChange={(e) => setCoverLetterForm({ ...coverLetterForm, letterDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2744]"
                        aria-label="Letter date"
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
                        aria-label="Hiring manager name"
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
                        aria-label="Recipient title or department"
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
                        aria-label="Company name"
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
                        aria-label="Company address"
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
                        aria-label="Position applying for"
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
                        aria-label="Salutation"
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
                        aria-label="Opening paragraph"
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
                        aria-label="Experience paragraph"
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
                        aria-label="Closing paragraph"
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
                          aria-label="Complimentary close"
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
                          aria-label="Signature name"
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
  const studentId = profile?.student_number != null ? String(profile.student_number) : '';

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
