import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
  X,
  Search,
  Bell,
  Download,
  Menu,
  User,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function ManageStudents() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("All");
  const userName = user?.email?.split("@")[0] || "";
  const userID = "2024-00001";

  const stats = [
    { label: "Total Students", value: "5" },
    { label: "Total Done", value: "3" },
    { label: "Total Pending", value: "2" },
  ];

  const students = [
    {
      name: "Juan Dela Cruz",
      email: "juan@tsu.edu.ph",
      id: "2021-00001",
      course: "BS Computer Science",
      year: 4,
      interviewStatus: "Done",
    },
    {
      name: "Maria Santos",
      email: "maria@tsu.edu.ph",
      id: "2021-00002",
      course: "BS Accountancy",
      year: 3,
      interviewStatus: "Done",
    },
    {
      name: "Pedro Reyes",
      email: "pedro@tsu.edu.ph",
      id: "2022-00001",
      course: "BS Civil Engineering",
      year: 2,
      interviewStatus: "Pending",
    },
    {
      name: "Ana Garcia",
      email: "ana@tsu.edu.ph",
      id: "2021-00003",
      course: "BS Information Technology",
      year: 4,
      interviewStatus: "Done",
    },
    {
      name: "Jose Rizal",
      email: "jose@tsu.edu.ph",
      id: "2021-00004",
      course: "BS Business Administration",
      year: 3,
      interviewStatus: "Pending",
    },
  ];

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/manage_students"
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
                activeNav="admin/manage_students"
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
      <div className="flex-1 flex flex-col">
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
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students, employers, reports..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Manage Students</h1>
                <p className="text-gray-500 mt-1">View and manage student accounts</p>
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">{item.value}</div>
                  <div className="text-sm text-gray-600">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["All", "CCS", "CBA", "COE", "CAS", "COED"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCourseFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      courseFilter === filter
                        ? "bg-[#1B2744] text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Course</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Year</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Interview Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{student.id}</td>
                        <td className="px-6 py-4 text-gray-700">{student.course}</td>
                        <td className="px-6 py-4 text-gray-700">{student.year}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              student.interviewStatus === "Done"
                                ? "text-green-700 bg-green-50"
                                : "text-gray-700 bg-gray-100"
                            }`}
                          >
                            {student.interviewStatus === "Done" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                            {student.interviewStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
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
