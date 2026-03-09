import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
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
import { submitJobApplication } from "../services/applicationService";
import { supabase } from "../lib/supabaseClient";
import { queryCache } from "../utils/queryCache";

const STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "for",
  "with",
  "on",
  "at",
  "by",
  "from",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "it",
  "we",
  "you",
  "your",
]);

function tokenize(value) {
  if (!value) return [];
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function uniqueTokens(values) {
  return Array.from(new Set(values.flatMap((value) => tokenize(value))));
}

function extractSkills(rawSkills) {
  if (!rawSkills) return [];
  if (Array.isArray(rawSkills)) return rawSkills.flatMap((item) => tokenize(item));
  return String(rawSkills)
    .split(/[\n,]/g)
    .flatMap((item) => tokenize(item));
}

interface JobApplicationDraft {
  selectedResume: string | null;
  selectedCoverLetter: string | null;
  updatedAt: string;
}

type JobApplicationDraftMap = Record<string, JobApplicationDraft>;

interface JobsPageViewState {
  selectedJobId: string | null;
  modalJobId: string | null;
  showApplyModal: boolean;
  updatedAt: string;
}

function JobsPageContent({ email, onLogout, onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [customJobType, setCustomJobType] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Types");
  const [customCategory, setCustomCategory] = useState("");
  const [optimisticAppliedJobs, setOptimisticAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const hasRestoredViewState = useRef(false);

  const getDraftStorageKey = () => (user?.id ? `job-application-drafts-${user.id}` : null);
  
  const getCoverLetterDocIdsKey = () => (user?.id ? `cover_letter_document_ids_${user.id}` : null);

  const getCoverLetterDocIds = (): string[] => {
    const key = getCoverLetterDocIdsKey();
    if (!key) return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const readDrafts = (): JobApplicationDraftMap => {
    const storageKey = getDraftStorageKey();
    if (!storageKey) return {};

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.error("Failed to read application drafts:", err);
      return {};
    }
  };

  const writeDrafts = (drafts: JobApplicationDraftMap) => {
    const storageKey = getDraftStorageKey();
    if (!storageKey) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(drafts));
    } catch (err) {
      console.error("Failed to save application drafts:", err);
    }
  };

  const clearDraftForJob = (jobId: string) => {
    const drafts = readDrafts();
    if (!drafts[jobId]) return;
    delete drafts[jobId];
    writeDrafts(drafts);
  };

  const getViewStateStorageKey = () => (user?.id ? `jobs-page-view-state-${user.id}` : null);

  const readViewState = (): JobsPageViewState | null => {
    const storageKey = getViewStateStorageKey();
    if (!storageKey) return null;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      return {
        selectedJobId: parsed.selectedJobId || null,
        modalJobId: parsed.modalJobId || null,
        showApplyModal: Boolean(parsed.showApplyModal),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch (err) {
      console.error("Failed to read jobs page view state:", err);
      return null;
    }
  };

  const writeViewState = (state: JobsPageViewState) => {
    const storageKey = getViewStateStorageKey();
    if (!storageKey) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save jobs page view state:", err);
    }
  };

  const openApplyModal = () => {
    if (!currentJob?.id) return;

    const draft = readDrafts()[currentJob.id];
    if (draft) {
      setSelectedResume(draft.selectedResume || null);
      setSelectedCoverLetter(draft.selectedCoverLetter || null);
    }

    setApplyMessage(null);
    setShowApplyModal(true);
  };

  const closeApplyModal = () => {
    setShowApplyModal(false);
    setApplyMessage(null);
  };

  // Handle filter type change
  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilterType(value);
    if (value !== 'Other') {
      setCustomJobType('');
    }
  };

  // Handle filter category change
  const handleFilterCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilterCategory(value);
    if (value !== 'Other') {
      setCustomCategory('');
    }
  };

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
  const userID = userData?.student_number || userData?.student_id || "2024-00001";

  // Load jobs from Supabase with caching
  const { data: jobs = [], isLoading: loading, error: jobsError } = useCachedQuery(
    `jobs-list-${user?.id}`,
    async () => {
      const data = await getAllJobs(false); // false = only active jobs for students
      
      if (data && data.length > 0 && !selectedJob) {
        setSelectedJob(data[0].id || null);
      }
      
      return data || [];
    },
    { enabled: !!user?.id }
  );

  const error = jobsError?.message || null;

  // Load applied job IDs separately so apply-state survives cached jobs responses.
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
      return (data || []).map((application) => application.job_id).filter(Boolean);
    },
    { enabled: !!user?.id }
  );

  const appliedJobs = useMemo(() => {
    const persisted = new Set<string>(appliedJobIds);
    optimisticAppliedJobs.forEach((jobId) => persisted.add(jobId));
    return persisted;
  }, [appliedJobIds, optimisticAppliedJobs]);

  // Load user resumes with caching
  const { data: userResumes = [] } = useCachedQuery(
    `resumes-list-${user?.id}`,
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

  // Get resume documents (exclude cover letters) - files with "resume" in name or not cover_letter
  const resumeDocs = useMemo(() => {
    return userResumes.filter((resume) => {
      const fileName = resume.file_name?.toLowerCase() || '';
      const filePath = resume.file_path?.toLowerCase() || '';
      // Exclude files that have "cover_letter" in the name
      if (fileName.includes('cover_letter') || filePath.includes('cover_letter')) return false;
      // Include files that have "resume" in the name OR files without cover_letter pattern
      return fileName.includes('resume') || fileName.includes('cv') || !fileName.includes('cover');
    });
  }, [userResumes]);

  // Get cover letter documents - files with "cover_letter" in name
  const coverLetterDocs = useMemo(() => {
    const coverLetterIds = getCoverLetterDocIds();
    return userResumes.filter((resume) => {
      // Check if resume ID is in the cover letter IDs list (from ResumesPage builder)
      if (coverLetterIds.includes(resume.id)) return true;
      // Also check by filename pattern - files with "cover_letter" in name
      const fileName = resume.file_name?.toLowerCase() || '';
      const filePath = resume.file_path?.toLowerCase() || '';
      return (
        fileName.includes('cover_letter') ||
        fileName.includes('cover-letter') ||
        fileName.includes('cover letter') ||
        fileName.includes('coverletter') ||
        filePath.includes('cover_letter') ||
        filePath.includes('cover-letter') ||
        filePath.includes('coverletter')
      );
    });
  }, [userResumes]);

  // Handle job application
  const handleApplyNow = async () => {
    if (!user?.id || !currentJob) return;

    if (!selectedResume) {
      setApplyMessage({
        type: 'error',
        text: 'Please select a resume to attach.'
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
        undefined,
        selectedResume || undefined,
        selectedCoverLetter || undefined
      );

      if (result.success) {
        setOptimisticAppliedJobs((prev) => new Set(prev).add(currentJob.id));
        setShowApplyModal(false);
        clearDraftForJob(currentJob.id);
        
        // Invalidate related cache keys so jobs/applications stay in sync.
        queryCache.invalidate(`jobs-list-${user.id}`);
        queryCache.invalidate(`applications-${user.id}`);
        queryCache.invalidate(`applied-jobs-${user.id}`);
        void refetchAppliedJobIds();
        
        navigate("/student/apply-outlook", {
          state: {
            jobTitle: currentJob.title,
            jobType: currentJob.job_type,
            employerId: currentJob.employer_id,
            employerName: currentJob.employer_name,
            employerEmail: currentJob.employer_email,
            resumeId: selectedResume,
            coverLetterId: selectedCoverLetter,
            coverLetter: "",
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

    // Handle job type filter including custom "Other" type
    let matchesType = false;
    if (filterType === "All") {
      matchesType = true;
    } else if (filterType === "Other" && customJobType) {
      // For custom type, match if job type contains the custom input (case-insensitive partial match)
      // This allows real-time filtering as user types
      const jobTypeLower = (job.job_type || "").toLowerCase();
      const customTypeLower = customJobType.toLowerCase();
      matchesType = jobTypeLower.includes(customTypeLower) || customTypeLower.includes(jobTypeLower);
    } else {
      matchesType = job.job_type === filterType;
    }

    const matchesCategory =
      filterCategory === "All Types" 
        ? true 
        : filterCategory === "Other" && customCategory
          ? (job.category || "").toLowerCase().includes(customCategory.toLowerCase()) || customCategory.toLowerCase().includes((job.category || "").toLowerCase())
          : job.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  }), [jobs, searchTerm, filterType, filterCategory, customJobType, customCategory]);

  const recommendedJobs = useMemo(() => {
    if (!jobs.length) return [];

    // Profile skills (handle both string and array formats)
    let profileSkills = extractSkills(userData?.skills);
    if (Array.isArray(userData?.skills_entries)) {
      profileSkills = [
        ...profileSkills,
        ...userData.skills_entries.flatMap((entry: any) => tokenize(entry.skill || entry))
      ];
    }

    // Profile keywords from education, work experience, bio, major, etc.
    const educationKeywords = Array.isArray(userData?.education_entries)
      ? userData.education_entries.flatMap((e: any) => tokenize([e.degree, e.field, e.school].join(' ')))
      : tokenize(userData?.major || '');
    
    const workKeywords = Array.isArray(userData?.work_experience_entries)
      ? userData.work_experience_entries.flatMap((w: any) => tokenize([w.title, w.company, w.description].join(' ')))
      : tokenize(userData?.work_experience || '');

    const profileKeywords = uniqueTokens([
      userData?.major,
      userData?.bio,
      userData?.university,
      ...educationKeywords,
      ...workKeywords,
    ]);

    // Résumé skills and ratings (from parsed upload)
    const resumeSkills = Array.isArray(userResumes[0]?.skills) ? userResumes[0].skills : [];
    const resumeRatings = userResumes[0]?.ratings || {};
    const resumeKeywords = uniqueTokens([
      userResumes[0]?.file_name,
      userResumes[0]?.file_type,
      ...resumeSkills,
    ]);

    // Combine all keywords for matching
    const keywordSet = new Set([
      ...profileSkills,
      ...profileKeywords,
      ...resumeKeywords,
    ]);

    const preferredJobType = userData?.preferred_job_type;
    const preferredLocation = userData?.preferred_location;
    const preferredCategory = userData?.preferred_category;

    return jobs
      .map((job) => {
        const requirements = Array.isArray(job.requirements) ? job.requirements : [];
        const requirementMatches = requirements.filter((req) =>
          tokenize(req).some((token) => keywordSet.has(token))
        );
        const skillScore = requirements.length
          ? requirementMatches.length / requirements.length
          : 0;

        let preferenceMatches = 0;
        let preferenceTotal = 0;
        if (preferredJobType) {
          preferenceTotal += 1;
          if (preferredJobType === job.job_type) preferenceMatches += 1;
        }
        if (preferredLocation) {
          preferenceTotal += 1;
          if (String(job.location).toLowerCase().includes(String(preferredLocation).toLowerCase())) {
            preferenceMatches += 1;
          }
        }
        if (preferredCategory) {
          preferenceTotal += 1;
          if (String(job.category).toLowerCase() === String(preferredCategory).toLowerCase()) {
            preferenceMatches += 1;
          }
        }
        const preferenceScore = preferenceTotal ? preferenceMatches / preferenceTotal : 0;

        const jobTextTokens = tokenize(
          [job.title, job.description, job.category, job.location].join(" ")
        );
        const resumeOverlap = jobTextTokens.filter((token) => keywordSet.has(token));
        const resumeScore = jobTextTokens.length
          ? Math.min(resumeOverlap.length / jobTextTokens.length, 1)
          : 0;

        // Optionally factor in ratings (e.g., if job requires a skill with a rating)
        let ratingScore = 0;
        if (requirements.length && Object.keys(resumeRatings).length) {
          for (const req of requirements) {
            for (const [key, value] of Object.entries(resumeRatings)) {
              if (tokenize(req).includes(key.toLowerCase())) {
                // Simple: if rating is "4/5" or "90", normalize to 0-1
                let num = 0;
                if (typeof value === 'string' && value.includes('/')) {
                  const [v, max] = value.split('/').map(Number);
                  if (max && v) num = v / max;
                } else if (!isNaN(Number(value))) {
                  num = Math.min(Number(value) / 100, 1);
                }
                ratingScore += num;
              }
            }
          }
          ratingScore = ratingScore / requirements.length;
        }

        // Blend scores: skillScore, preferenceScore, resumeScore, ratingScore
        const score = 0.5 * skillScore + 0.2 * preferenceScore + 0.2 * resumeScore + 0.1 * ratingScore;

        return {
          job,
          score,
          matchedSkills: requirementMatches.slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [jobs, userData, userResumes]);

  const currentJob = selectedJob
    ? filteredJobs.find((j) => j.id === selectedJob)
    : filteredJobs[0];

  // Restore selected job and modal-open state when returning to this page.
  useEffect(() => {
    if (!user?.id || hasRestoredViewState.current) return;
    if (!jobs.length) return;

    const savedViewState = readViewState();
    if (!savedViewState) {
      hasRestoredViewState.current = true;
      return;
    }

    const jobExists = (jobId: string | null) =>
      !!jobId && jobs.some((job) => job.id === jobId);

    const restoredSelectedJobId =
      jobExists(savedViewState.modalJobId)
        ? savedViewState.modalJobId
        : jobExists(savedViewState.selectedJobId)
          ? savedViewState.selectedJobId
          : null;

    if (restoredSelectedJobId) {
      setSelectedJob(restoredSelectedJobId);
    }

    if (savedViewState.showApplyModal && jobExists(savedViewState.modalJobId)) {
      setShowApplyModal(true);
    }

    hasRestoredViewState.current = true;
  }, [user?.id, jobs]);

  // Persist selected job and modal-open state so the UI can be restored exactly.
  useEffect(() => {
    if (!user?.id || !hasRestoredViewState.current) return;

    writeViewState({
      selectedJobId: selectedJob,
      modalJobId: showApplyModal ? (currentJob?.id || selectedJob || null) : null,
      showApplyModal,
      updatedAt: new Date().toISOString(),
    });
  }, [user?.id, selectedJob, showApplyModal, currentJob?.id]);

  // Persist in-progress application per job so drafts survive navigation/tab switches.
  useEffect(() => {
    if (!showApplyModal || !currentJob?.id || !user?.id) return;

    const drafts = readDrafts();
    const hasProgress = Boolean(selectedResume) || Boolean(selectedCoverLetter);

    if (hasProgress) {
      drafts[currentJob.id] = {
        selectedResume,
        selectedCoverLetter,
        updatedAt: new Date().toISOString(),
      };
    } else if (drafts[currentJob.id]) {
      delete drafts[currentJob.id];
    }

    writeDrafts(drafts);
  }, [showApplyModal, selectedResume, selectedCoverLetter, currentJob?.id, user?.id]);

  // If state restores a modal for an already-applied job, close it immediately.
  useEffect(() => {
    if (!showApplyModal || !currentJob?.id) return;
    if (appliedJobs.has(currentJob.id)) {
      setShowApplyModal(false);
    }
  }, [showApplyModal, currentJob?.id, appliedJobs]);

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
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto flex flex-col">
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
                  onChange={handleFilterTypeChange}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[140px]"
                >
                  <option>All</option>
                  <option>Internship</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option value="Other">Other (Specify)</option>
                </select>
                
                {/* Show custom job type input when "Other" is selected */}
                {filterType === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter job type..."
                    value={customJobType}
                    onChange={(e) => setCustomJobType(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[160px]"
                  />
                )}
                <select
                  value={filterCategory}
                  onChange={handleFilterCategoryChange}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[140px]"
                >
                  <option>All Types</option>
                  <option>Information Technology</option>
                  <option>Data Science</option>
                  <option>Software Engineering</option>
                  <option>Business Analytics</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                  <option value="Other">Other (Specify)</option>
                </select>
                
                {/* Show custom category input when "Other" is selected */}
                {filterCategory === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-[#00B4D8] focus:ring-0 outline-none text-sm min-w-[160px]"
                  />
                )}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Jobs List - Left Side */}
            <div className="lg:col-span-1 flex flex-col gap-8">
              {/* Recommended Jobs Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {recommendedJobs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Recommended for you</h3>
                      <span className="text-xs text-gray-500">Based on your profile</span>
                    </div>
                    <div className="space-y-3">
                      {recommendedJobs.map(({ job, score, matchedSkills }) => (
                        <button
                          key={`recommended-${job.id}`}
                          onClick={() => setSelectedJob(job.id || null)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedJob === job.id
                              ? "border-[#1B2744] bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                              <p className="text-xs text-gray-500 truncate">{job.employer_name}</p>
                              {matchedSkills.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  Matched: {matchedSkills.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* All Jobs Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">All Jobs</h3>
                  <div className="space-y-3">
                    {filteredJobs.length === 0 ? (
                      <div className="text-center py-8">
                        <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">
                          {jobs.length === 0 ? "No jobs available" : "No jobs match your search"}
                        </p>
                      </div>
                    ) : (
                      filteredJobs.map((job) => (
                        <button
                          key={`all-${job.id}`}
                          onClick={() => setSelectedJob(job.id || null)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedJob === job.id
                              ? "border-[#1B2744] bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                              <p className="text-xs text-gray-500 truncate">{job.employer_name}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden sticky top-0 h-fit">
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
                        onClick={openApplyModal}
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
                onClick={closeApplyModal}
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
                {resumeDocs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-2">No resumes uploaded yet</p>
                    <button
                      onClick={() => {
                        closeApplyModal();
                        onNavigate('student/resumes');
                      }}
                      className="text-[#00B4D8] hover:underline text-sm"
                    >
                      Upload a resume first
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resumeDocs.map((resume) => (
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

              {/* Cover Letter Document Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Attach Cover Letter (Optional)
                </label>
                {coverLetterDocs.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mb-3">
                    <p className="text-gray-500 text-sm">No cover letter documents yet</p>
                    <button
                      onClick={() => {
                        closeApplyModal();
                        onNavigate('student/resumes');
                      }}
                      className="text-[#00B4D8] hover:underline text-sm"
                    >
                      Create a cover letter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mb-3">
                    {coverLetterDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedCoverLetter(selectedCoverLetter === doc.id ? null : doc.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedCoverLetter === doc.id
                            ? 'border-[#00B4D8] bg-[#E0F7FA]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {resumeDocs.length > 0 && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeApplyModal}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyNow}
                    disabled={applyingJobId === currentJob.id || !selectedResume}
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

