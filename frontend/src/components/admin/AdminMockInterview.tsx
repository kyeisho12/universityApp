import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
  X,
  Bell,
  Eye,
  Menu,
} from "lucide-react";

export default function AdminMockInterview() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const userName = user?.email?.split("@")[0] || "";
  const userID = user?.id ?? "";

  const stats = [
    { label: "Total Interviews", value: null },
    { label: "Avg Score (1-5)", value: null },
    { label: "Completion Rate", value: null },
  ];

  const recentInterviews: Array<{
    student: string;
    date: string;
    questions: number;
    score: number;
  }> = [];

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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (hidden on small screens) - Fixed position */}
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/mock_interview"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
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
                activeNav="admin/mock_interview"
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
      <div className="md:ml-72">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Mock Interviews</h1>
              <p className="text-gray-500 mt-1">View interview results</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">
                    {item.value ?? "—"}
                  </div>
                  <div className="text-sm text-gray-600">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Interviews Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Interviews</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Questions</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Score</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentInterviews.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          No interview data yet.
                        </td>
                      </tr>
                    ) : (
                      recentInterviews.map((interview) => (
                        <tr key={interview.student} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{interview.student}</td>
                          <td className="px-4 py-3 text-gray-600">{interview.date}</td>
                          <td className="px-4 py-3 text-gray-600">{interview.questions}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{interview.score}/5</td>
                          <td className="px-4 py-3">
                            <button className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
