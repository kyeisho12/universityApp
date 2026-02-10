import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, ArrowLeft, Mail, FileText } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";

interface ApplyOutlookState {
  jobTitle: string;
  jobType?: string;
  employerId: string;
  employerName?: string;
  employerEmail?: string;
  resumeId: string | null;
  coverLetter: string;
}

export default function ApplyOutlookPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const state = location.state as ApplyOutlookState | null;

  const [userName, setUserName] = React.useState("User");
  const [userID, setUserID] = React.useState("2024-00001");
  const [employerEmail, setEmployerEmail] = React.useState<string | null>(null);
  const [manualEmail, setManualEmail] = React.useState("");
  const [resumeUrl, setResumeUrl] = React.useState<string | null>(null);
  const [resumeName, setResumeName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [outlookUrl, setOutlookUrl] = React.useState<string | null>(null);
  const [openedOutlook, setOpenedOutlook] = React.useState(false);

  React.useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, student_id")
          .eq("id", user.id)
          .single();

        if (data?.full_name) setUserName(data.full_name);
        if (data?.student_id) setUserID(data.student_id);
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  React.useEffect(() => {
    const loadDetails = async () => {
      if (!state?.employerId) {
        setLoading(false);
        return;
      }

      try {
        const shouldFetchEmployer = !state.employerEmail;
        const [{ data: employer }, resumeData] = await Promise.all([
          shouldFetchEmployer
            ? supabase
                .from("employers")
                .select("contact_email")
                .eq("id", state.employerId)
                .single()
            : Promise.resolve({ data: null }),
          state.resumeId
            ? supabase
                .from("resumes")
                .select("file_name, file_path")
                .eq("id", state.resumeId)
                .single()
            : Promise.resolve({ data: null }),
        ]);

        if (state.employerEmail) {
          setEmployerEmail(state.employerEmail);
          setManualEmail(state.employerEmail);
        } else if (employer?.contact_email) {
          setEmployerEmail(employer.contact_email);
          setManualEmail(employer.contact_email);
        }

        if (resumeData?.data?.file_path) {
          const { data: signedUrl } = await supabase.storage
            .from("resumes")
            .createSignedUrl(resumeData.data.file_path, 3600);

          if (signedUrl?.signedUrl) {
            setResumeUrl(signedUrl.signedUrl);
          }
          if (resumeData.data.file_name) {
            setResumeName(resumeData.data.file_name);
          }
        }
      } catch (error) {
        console.error("Failed to load application details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [state?.employerId, state?.resumeId]);

  React.useEffect(() => {
    const targetEmail = manualEmail || employerEmail;
    if (!state?.jobTitle || !targetEmail) return;

    const subject = state.jobType
      ? `Application for ${state.jobTitle} with the ${state.jobType} Position`
      : `Application for ${state.jobTitle}`;
    const bodyLines = [
      `Hello ${state.employerName || "Employer"},`,
      "",
      "Please find my application below.",
      "",
      "Cover Letter:",
      state.coverLetter || "",
      "",
      resumeUrl
        ? `Resume: ${resumeUrl}`
        : "Resume: Please attach my resume manually before sending. You may remove this note after attaching.",
    ];

    const body = bodyLines.join("\n");

    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(
      targetEmail
    )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setOutlookUrl(url);
  }, [state?.jobTitle, state?.jobType, state?.employerName, state?.coverLetter, employerEmail, manualEmail, resumeUrl]);

  React.useEffect(() => {
    if (outlookUrl && !openedOutlook) {
      window.open(outlookUrl, "_blank", "noopener");
      setOpenedOutlook(true);
    }
  }, [outlookUrl, openedOutlook]);

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Missing application details</h2>
          <p className="text-sm text-gray-600 mb-4">Return to jobs and try applying again.</p>
          <button
            onClick={() => navigate("/student/jobs")}
            className="px-4 py-2 rounded-lg bg-[#2C3E5C] text-white hover:bg-[#1B2744]"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <div className="hidden md:block">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={async () => {
            try {
              await signOut();
            } finally {
              navigate("/login");
            }
          }}
          onNavigate={(route) => navigate(`/${route}`)}
          activeNav="jobs"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/student/jobs")}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Jobs
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-[#00B4D8]" />
              <h1 className="text-2xl font-bold text-gray-900">Send Application via Outlook</h1>
            </div>

            <p className="text-gray-600 mb-6">
              We’ll open Outlook Web with your email prefilled. Attach your resume manually before sending.
            </p>

            {loading ? (
              <div className="text-gray-500">Preparing your email...</div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">To</p>
                  {employerEmail ? (
                    <p className="text-gray-900 font-medium">{employerEmail}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-600">
                        Employer email not available. Enter it manually to continue.
                      </p>
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="employer@email.com"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:ring-0 outline-none text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="text-gray-900 font-medium">Application for {state.jobTitle}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Cover Letter</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
                    {state.coverLetter}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#00B4D8]" />
                    <div>
                      <p className="font-medium text-gray-900">{resumeName || "Resume"}</p>
                      <p className="text-xs text-gray-500">Download and attach to Outlook</p>
                    </div>
                  </div>
                  {resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#E0F7FA] text-[#00B4D8] hover:bg-[#B3E5FC] transition-colors font-medium"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">No resume link</span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => outlookUrl && window.open(outlookUrl, "_blank", "noopener")}
                    disabled={!outlookUrl}
                    className="flex-1 px-4 py-3 rounded-lg bg-[#2C3E5C] text-white hover:bg-[#1B2744] font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    Open Outlook Web <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/student/jobs")}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Return to Jobs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
