import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Upload, Download, Trash2 } from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";

type NavigateHandler = (route: string) => void;

interface ResumesPageContentProps {
  email: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

function ResumesPageContent({ email, onLogout, onNavigate }: ResumesPageContentProps) {
  const userName = email.split("@")[0];
  const userID = "2024-00001";
  const [resumes, setResumes] = useState<Array<{
    id: number;
    name: string;
    uploadDate: string;
    size: string;
    status: string;
  }>>([
    {
      id: 1,
      name: "Juan_Dela_Cruz_Resume_2024.pdf",
      uploadDate: "2024-12-01",
      size: "245 KB",
      status: "Active",
    },
    {
      id: 2,
      name: "JDC_IT_Developer_CV.pdf",
      uploadDate: "2024-11-15",
      size: "312 KB",
      status: "Active",
    },
  ]);

  const handleDelete = (id: number) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="resumes"
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

          {/* Upload Section */}
          <div className="bg-white rounded-2xl p-12 shadow-sm border-2 border-dashed border-gray-300 mb-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Résumé</h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your file here, or click to browse. Supported formats:
              <br />
              PDF, DOC, DOCX (Max 5MB)
            </p>
            <div className="flex gap-3 justify-center">
              <button className="bg-[#1B2744] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Browse Files
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                + Create New Résumé
              </button>
            </div>
          </div>

          {/* My Documents */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Documents ({resumes.length})</h2>

            <div className="space-y-3">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{resume.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  function handleNavigate(route: string) {
    if (route === "dashboard") {
      navigate("/");
    } else {
      navigate(`/${route}`);
    }
  }

  return (
    <ResumesPageContent
      email={user?.email || ""}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}
