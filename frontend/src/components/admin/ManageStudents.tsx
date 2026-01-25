import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import { supabase } from "../../lib/supabaseClient";
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

interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  major: string | null;
  graduation_year: number | null;
  Year_Level: number | null;
  Interviews: number | null;
  Student_ID: number | null;
}

export default function ManageStudents() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [students, setStudents] = React.useState<StudentProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  const userName = user?.email?.split("@")[0] || "";
  const userID = "ADMIN";
  const [courseFilter, setCourseFilter] = React.useState("All");

  React.useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, major, graduation_year, Year_Level, Interviews, Student_ID"
      )
      .eq("role", "student");

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  }

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

  const totalStudents = students.length;
  const totalDone = students.filter((s) => (s.Interviews ?? 0) > 0).length;
  const totalPending = totalStudents - totalDone;

  const stats = [
    { label: "Total Students", value: totalStudents.toString() },
    { label: "Total Done", value: totalDone.toString() },
    { label: "Total Pending", value: totalPending.toString() },
  ];

  const filteredStudents = students.filter((s) => {
    const matchesSearch = `${s.full_name} ${s.email} ${s.Student_ID}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "All" || s.major === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/manage_students"
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <AdminNavbar
            userName={userName}
            userID={userID}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            activeNav="admin/manage_students"
          />
        </div>
      )}

      <div className="md:ml-72 flex flex-col">
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
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <Bell className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      
        <main className="flex-1 overflow-auto p-8">
          <div className="flex items-center justify-between">
            <div> 
              <h1 className="text-4xl font-bold text-gray-900">Manage Students</h1> 
              <p className="text-gray-500 mt-1">View and manage student accounts</p> 
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"> 
              <Download className="w-4 h-4" /> Export 
            </button>
          </div>

          {/* Stats */} 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> 
            {stats.map((item) => ( 
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"> 
                <div className="text-3xl font-semibold text-gray-900 mb-1">
                  {item.value}
                </div> 
                <div className="text-sm text-gray-600">
                  {item.label}
                </div> 
              </div> ))} 
          </div> 
              
          {/* Search and Filters */} 
          <div className="flex flex-col sm:flex-row gap-4"> 
            <div className="relative flex-1 max-w-md"> 
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /> 
              <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => 
                setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" /> 
            </div> 
            <div className="flex gap-2 flex-wrap"> 
              {["All", "CCS", "CBA", "COE", "CAS", "COED"].map((filter) => (
            <button
            key={filter}
            onClick={() => setCourseFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              courseFilter === filter ? "bg-[#1B2744] text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
            >
              {filter}
            </button>
          ))}
          </div>   
        </div>       

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold">Major</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold">Year Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold">Interview Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                )}

                {!loading && filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                )}

                {filteredStudents.map((student) => {
                  const interviewDone = (student.Interviews ?? 0) > 0;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {student.full_name || "Unnamed Student"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{student.Student_ID ?? "—"}</td>
                      <td className="px-6 py-4">{student.major ?? "—"}</td>
                      <td className="px-6 py-4">{student.Year_Level ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            interviewDone
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {interviewDone ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          {interviewDone ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
