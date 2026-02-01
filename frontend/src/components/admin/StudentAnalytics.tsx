import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import * as XLSX from 'xlsx';
import {
    X,
    Search,
    Bell,
    Users,
    ClipboardList,
    TrendingUp,
    Calendar,
    Download,
    Menu,
} from "lucide-react";

export default function StudentAnalytics() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
    const userName = user?.email?.split("@")[0] || "";
    const userID = "2024-00001";

    const stats = [
        { label: "Active Students", value: "2,847", icon: <Users className="w-5 h-5 text-[#00B4D8]" /> },
        { label: "Interviews", value: "1,234", icon: <ClipboardList className="w-5 h-5 text-[#00B4D8]" /> },
        { label: "Avg Score", value: "3.9/5", icon: <TrendingUp className="w-5 h-5 text-[#00B4D8]" /> },
        { label: "Events", value: "24", icon: <Calendar className="w-5 h-5 text-[#00B4D8]" /> },
    ];

    const departmentPerformance = [
        { dept: "CCS", students: 450, interviews: 234, score: 4.1, engagement: 0.82 },
        { dept: "CBA", students: 380, interviews: 189, score: 3.8, engagement: 0.78 },
        { dept: "COE", students: 320, interviews: 156, score: 3.9, engagement: 0.74 },
        { dept: "CAS", students: 280, interviews: 98, score: 3.7, engagement: 0.68 },
        { dept: "COED", students: 210, interviews: 78, score: 4.0, engagement: 0.7 },
    ];

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

    const handleExport = () => {
        const statsData = stats.map(stat => ({
            Label: stat.label,
            Value: stat.value
        }));
        const departmentData = departmentPerformance.map(dept => ({
            Department: dept.dept,
            Students: dept.students,
            Interviews: dept.interviews,
            'Avg Score': dept.score,
            Engagement: dept.engagement
        }));

        const workbook = XLSX.utils.book_new();
        const statsSheet = XLSX.utils.json_to_sheet(statsData);
        const departmentSheet = XLSX.utils.json_to_sheet(departmentData);

        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Stats');
        XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Performance');

        XLSX.writeFile(workbook, 'student_analytics.xlsx');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar (hidden on small screens) - Fixed position */}
            <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
                <AdminNavbar
                    userName={userName}
                    userID={userID}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    activeNav="admin/student_analytics"
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
                                activeNav="admin/student_analytics"
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
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900">Reports &amp; Analytics</h1>
                                <p className="text-gray-500 mt-1">Student engagement and interview statistics</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#23325a]">
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((item) => (
                                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="text-3xl font-semibold text-gray-900">{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Monthly Trends">
                                <ChartPlaceholder />
                            </ChartCard>
                            <ChartCard title="Score Distribution">
                                <ChartPlaceholder />
                            </ChartCard>
                        </div>

                        {/* Department Performance */}
                        <ChartCard title="Department Performance">
                            <PerformanceTable rows={departmentPerformance} />
                        </ChartCard>
                    </div>
                </main>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            {children}
        </div>
    );
}

function ChartPlaceholder() {
    return (
        <div className="h-64 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
            Chart placeholder
        </div>
    );
}

function PerformanceTable({
    rows,
}: {
    rows: { dept: string; students: number; interviews: number; score: number; engagement: number }[];
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-gray-500 bg-gray-50">
                    <tr>
                        <th className="text-left font-semibold px-4 py-3">Department</th>
                        <th className="text-left font-semibold px-4 py-3">Students</th>
                        <th className="text-left font-semibold px-4 py-3">Interviews</th>
                        <th className="text-left font-semibold px-4 py-3">Avg Score</th>
                        <th className="text-left font-semibold px-4 py-3">Engagement</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                        <tr key={row.dept} className="text-gray-800">
                            <td className="px-4 py-3 font-medium">{row.dept}</td>
                            <td className="px-4 py-3">{row.students}</td>
                            <td className="px-4 py-3">{row.interviews}</td>
                            <td className="px-4 py-3 text-[#0f9a4d] font-semibold">{row.score.toFixed(1)}</td>
                            <td className="px-4 py-3">
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full bg-[#1B2744]"
                                        style={{ width: `${Math.round(row.engagement * 100)}%` }}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
