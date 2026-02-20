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
  ShieldCheck,
  ShieldX,
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
  college: string | null;
  is_active: boolean;
  is_verified: boolean;        // NEW: added to profiles table
  created_at: string | null;   // NEW: useful for "registered on" display
}

type TabView = "verified" | "pending";

export default function ManageStudents() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [students, setStudents] = React.useState<StudentProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabView>("verified");
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null); // tracks in-progress action
  const [deactivateTarget, setDeactivateTarget] = React.useState<
    { id: string; name: string; isActive: boolean } | null
  >(null);
  const [approveTarget, setApproveTarget] = React.useState<
    { id: string; name: string } | null
  >(null);
  const [rejectTarget, setRejectTarget] = React.useState<
    { id: string; name: string } | null
  >(null);

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
        "id, email, full_name, role, major, graduation_year, Year_Level, Interviews, Student_ID, college, is_active, is_verified, created_at"
      )
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login");
    }
  }

  async function handleDeactivate(studentId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", studentId);

    if (error) {
      alert("Failed to update account.");
      console.error(error);
    } else {
      fetchStudents();
    }
  }

  const openDeactivateConfirm = (student: StudentProfile) => {
    setDeactivateTarget({
      id: student.id,
      name: student.full_name || student.email || "this student",
      isActive: student.is_active,
    });
  };

  const closeDeactivateConfirm = () => {
    setDeactivateTarget(null);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    await handleDeactivate(deactivateTarget.id, deactivateTarget.isActive);
    setDeactivateTarget(null);
  };

  // ── NEW: Verify / Reject handlers ────────────────────────────────────────
  async function handleApprove(studentId: string) {
    setVerifyingId(studentId);
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: true, is_active: true })
      .eq("id", studentId);

    if (error) {
      alert("Failed to approve student.");
      console.error(error);
    } else {
      fetchStudents();
    }
    setVerifyingId(null);
  }

  async function handleReject(studentId: string) {
    setVerifyingId(studentId);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", studentId);

    if (error) {
      alert("Failed to reject student.");
      console.error(error);
    } else {
      fetchStudents();
    }
    setVerifyingId(null);
  }
  // ─────────────────────────────────────────────────────────────────────────

  const openApproveConfirm = (student: StudentProfile) => {
    setApproveTarget({
      id: student.id,
      name: student.full_name || student.email || "this student",
    });
  };

  const closeApproveConfirm = () => {
    setApproveTarget(null);
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    await handleApprove(approveTarget.id);
    setApproveTarget(null);
  };

  const openRejectConfirm = (student: StudentProfile) => {
    setRejectTarget({
      id: student.id,
      name: student.full_name || student.email || "this student",
    });
  };

  const closeRejectConfirm = () => {
    setRejectTarget(null);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await handleReject(rejectTarget.id);
    setRejectTarget(null);
  };

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  // Split students into verified vs pending
  const verifiedStudents = students.filter((s) => s.is_verified);
  const pendingStudents = students.filter((s) => !s.is_verified);

  const totalStudents = verifiedStudents.length;
  const totalDone = verifiedStudents.filter((s) => (s.Interviews ?? 0) > 0).length;
  const totalPending = totalStudents - totalDone;

  const stats = [
    { label: "Total Students", value: totalStudents.toString() },
    { label: "Interview Done", value: totalDone.toString() },
    { label: "Interview Pending", value: totalPending.toString() },
    {
      label: "Awaiting Verification",
      value: pendingStudents.length.toString(),
      highlight: pendingStudents.length > 0,
    },
  ];

  const filteredVerified = verifiedStudents.filter((s) => {
    const matchesSearch = `${s.full_name} ${s.email} ${s.Student_ID}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "All" || s.college === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const filteredPending = pendingStudents.filter((s) => {
    const matchesSearch = `${s.full_name} ${s.email} ${s.Student_ID}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "All" || s.college === courseFilter;
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
        {/* Top bar */}
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
            {/* Bell with badge if there are pending verifications */}
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              {pendingStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingStudents.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Manage Students</h1>
              <p className="text-gray-500 mt-1">View, verify, and manage student accounts</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((item) => (
              <div
                key={item.label}
                className={`bg-white rounded-xl border p-6 shadow-sm ${
                  item.highlight ? "border-yellow-400 ring-1 ring-yellow-300" : "border-gray-200"
                }`}
              >
                <div
                  className={`text-3xl font-semibold mb-1 ${
                    item.highlight ? "text-yellow-600" : "text-gray-900"
                  }`}
                >
                  {item.value}
                </div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("verified")}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "verified"
                  ? "border-[#1B2744] text-[#1B2744]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Verified Students
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "pending"
                  ? "border-yellow-500 text-yellow-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Pending Verification
              {pendingStudents.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingStudents.length}
                </span>
              )}
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-3xl">
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
              {["All", "CASS", "CAFA", "CBA", "CCS", "COE", "CIT", "CCJE", "CPAG", "COED", "COS"].map(
                (filter) => (
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
                )
              )}
            </div>
          </div>

          {/* ── VERIFIED STUDENTS TABLE ── */}
          {activeTab === "verified" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Major</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Year Level</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Interview Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                        Loading students...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredVerified.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                        No verified students found
                      </td>
                    </tr>
                  )}
                  {filteredVerified.map((student) => {
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
                              <div className="text-sm text-gray-500">{student.email}</div>
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
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              student.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {student.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openDeactivateConfirm(student)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              student.is_active
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {student.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── PENDING VERIFICATION TABLE ── */}
          {activeTab === "pending" && (
            <div className="bg-white rounded-xl border border-yellow-200 shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-2 text-yellow-800 text-sm">
                <ShieldCheck className="w-4 h-4" />
                These students have registered and are awaiting admin approval before they can access
                the system.
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">College</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Major</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Year Level</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Registered On</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPending.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-gray-500">No pending registrations — all clear!</p>
                      </td>
                    </tr>
                  )}
                  {filteredPending.map((student) => (
                    <tr key={student.id} className="hover:bg-yellow-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {student.full_name || "Unnamed Student"}
                            </div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{student.Student_ID ?? "—"}</td>
                      <td className="px-6 py-4">{student.college ?? "—"}</td>
                      <td className="px-6 py-4">{student.major ?? "—"}</td>
                      <td className="px-6 py-4">{student.Year_Level ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openApproveConfirm(student)}
                            disabled={verifyingId === student.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectConfirm(student)}
                            disabled={verifyingId === student.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            <ShieldX className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDeactivateConfirm}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {deactivateTarget.isActive ? "Deactivate Student" : "Reactivate Student"}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {deactivateTarget.isActive
                    ? `Are you sure you want to deactivate ${deactivateTarget.name}? They will lose access until reactivated.`
                    : `Reactivate ${deactivateTarget.name} so they can access the system again.`}
                </p>
              </div>
              <button
                onClick={closeDeactivateConfirm}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeDeactivateConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeactivate}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                  deactivateTarget.isActive ? "bg-red-600 hover:bg-red-700" : "bg-[#1B2744] hover:bg-[#131d33]"
                }`}
              >
                {deactivateTarget.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeApproveConfirm}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Approve Student</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Are you sure you want to approve {approveTarget.name}? They will be granted access to the system.
                </p>
              </div>
              <button
                onClick={closeApproveConfirm}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeApproveConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeRejectConfirm}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reject Student</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Reject {rejectTarget.name}? This will permanently delete the student account.
                </p>
              </div>
              <button
                onClick={closeRejectConfirm}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeRejectConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}