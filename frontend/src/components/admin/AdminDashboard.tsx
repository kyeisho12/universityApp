import React from "react";
import {
  Search,
  Bell,
  Users,
  Building2,
  MessageSquare,
  CalendarDays,
  ChevronRight,
  BarChart3,
  X,
  Menu,
} from "lucide-react";
import { AdminNavbar } from "../common/AdminNavbar";

export const AdminDashboard = ({ email, onLogout, onNavigate }: { email: string; onLogout: () => void; onNavigate: (route: string) => void }) => {
  const userName = email.split("@")[0];
  const userID = "2024-00001";
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="dashboard"
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
                  onLogout();
                }}
                onNavigate={(r) => {
                  setMobileOpen(false);
                  onNavigate(r);
                }}
                activeNav="dashboard"
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
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students, employers, reports..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-500">Overview of career service activities</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-5 h-5 text-gray-600" />}
              number="2,847"
              label="Total Students"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-gray-600" />}
              number="156"
              label="Partner Companies"
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5 text-gray-600" />}
              number="1,234"
              label="Interviews Completed"
            />
            <StatCard
              icon={<CalendarDays className="w-5 h-5 text-gray-600" />}
              number="8"
              label="Active Events"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
                <div className="space-y-4 flex-1">
                  <ActivityItem
                    text="John Doe completed mock interview"
                    time="5 min ago"
                  />
                  <ActivityItem
                    text="New student registration: Maria Santos"
                    time="15 min ago"
                  />
                  <ActivityItem
                    text="Accenture posted 3 new job listings"
                    time="1 hour ago"
                  />
                  <ActivityItem
                    text="Career Fair 2025 registration opened"
                    time="2 hours ago"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                <div className="space-y-3 flex flex-col flex-1">
                  <QuickActionButton
                    icon={<Users className="w-5 h-5" />}
                    label="Manage Students"
                    onClick={() => onNavigate("admin/manage_students")}
                  />
                  <QuickActionButton
                    icon={<Building2 className="w-5 h-5" />}
                    label="Employer Partners"
                    onClick={() => onNavigate("admin/employer_partners")}
                  />
                  <QuickActionButton
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Mock Interviews"
                    onClick={() => onNavigate("admin/mock_interview")}
                  />
                  <QuickActionButton
                    icon={<BarChart3 className="w-5 h-5" />}
                    label="View Analytics"
                    onClick={() => onNavigate("admin/student_analytics")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

function StatCard({
  icon,
  number,
  label,
}: {
  icon: React.ReactNode;
  number: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-gray-100 p-3 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{number}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
      <div className="w-2 h-2 bg-[#00B4D8] rounded-full mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-medium">{text}</p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#00B4D8] hover:bg-gray-50 transition-all group"
    >
      <div className="text-gray-600 group-hover:text-[#00B4D8]">{icon}</div>
      <span className="flex-1 text-left font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00B4D8]" />
    </button>
  );
}

