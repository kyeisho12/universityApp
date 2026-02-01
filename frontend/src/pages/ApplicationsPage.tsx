import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AdminNavbar } from "../components/common/AdminNavbar";
import { ApplicationManagement } from "../components/admin/ApplicationManagement";

export const ApplicationsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const userName = user?.email?.split("@")[0] || "Admin";
  const userID = "2024-00001";

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/applications"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <AdminNavbar
              userName={userName}
              userID={userID}
              onLogout={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              onNavigate={(r) => {
                setMobileOpen(false);
                handleNavigate(r);
              }}
              activeNav="admin/applications"
            />
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
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <div className="flex-1" />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
          <ApplicationManagement />
        </div>
      </div>
    </div>
  );
};

export default ApplicationsPage;
