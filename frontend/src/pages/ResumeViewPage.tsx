import React from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResumeViewPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const redirect = async () => {
      if (!resumeId) {
        setError("Invalid resume link.");
        return;
      }

      try {
        const { data: resume, error: fetchError } = await supabase
          .from("resumes")
          .select("file_path")
          .eq("id", resumeId)
          .single();

        if (fetchError || !resume?.file_path) {
          setError("Resume not found or this link is no longer valid.");
          return;
        }

        const { data: signedUrl, error: urlError } = await supabase.storage
          .from("resumes")
          .createSignedUrl(resume.file_path, 3600);

        if (urlError || !signedUrl?.signedUrl) {
          setError("Unable to open resume. Please contact the applicant for a new link.");
          return;
        }

        window.location.href = signedUrl.signedUrl;
      } catch {
        setError("Something went wrong. Please try again later.");
      }
    };

    redirect();
  }, [resumeId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Resume Unavailable</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <p className="text-sm text-gray-500">Opening resume, please wait...</p>
      </div>
    </div>
  );
}
