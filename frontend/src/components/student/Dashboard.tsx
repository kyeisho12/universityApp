import React from "react";
import {
  Search,
  Bell,
  LayoutGrid,
  Briefcase,
  FileText,
  Calendar,
  Zap,
  ChevronRight,
  Upload,
  Eye,
  X,
} from "lucide-react";
import { Sidebar } from "../common/Sidebar";

export const Dashboard = ({ email, fullName, displayName, onLogout, onNavigate }: { email: string; fullName?: string; displayName?: string; onLogout: () => void; onNavigate: (route: string) => void }) => {
  const userName = displayName?.trim() || fullName?.trim() || email.split("@")[0];
  const userID = "2024-00001";
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <Sidebar
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
              <Sidebar
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between z-10 gap-3 flex-shrink-0">
          <div className="md:hidden mr-2">
            <button
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <LayoutGrid className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 cursor-pointer hover:text-gray-900 flex-shrink-0" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-1">
              Welcome back, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Here's what's happening with your career journey
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <StatCard
              icon={<Briefcase className="w-8 h-8 text-gray-400" />}
              number="0"
              label="Active Job Listings"
            />
            <StatCard
              icon={<FileText className="w-8 h-8 text-gray-400" />}
              number="0"
              label="My Résumés"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8 text-gray-400" />}
              number="0"
              label="Upcoming Events"
            />
            <StatCard
              icon={<Eye className="w-8 h-8 text-gray-400" />}
              number="0"
              label="Mock Interviews"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 auto-rows-max md:auto-rows-fr">
            {/* Left Column - Recent Job Listings */}
            <div className="md:col-span-2 lg:col-span-2 flex flex-col">
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 md:mb-4 gap-2">
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                    Recent Job Listings
                  </h2>
                  <button
                    onClick={() => onNavigate && onNavigate("jobs")}
                    className="text-[#00B4D8] hover:text-[#0096C7] font-medium flex items-center gap-1 text-xs sm:text-sm md:text-base whitespace-nowrap"
                  >
                    View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 flex-1 overflow-y-auto flex items-center justify-center">
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No job listings available yet</p>
                    <p className="text-gray-400 text-xs mt-1">Check back soon for new opportunities</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3 sm:space-y-4 md:space-y-5 h-full flex flex-col md:min-h-0">
              {/* AI-Powered Card */}
              <div className="bg-gradient-to-br from-[#0096C7] to-[#00B4D8] rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 text-white shadow-lg flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2 md:mb-3">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs font-medium">AI-Powered</span>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1 sm:mb-1.5 md:mb-2">
                    Practice Your Interview
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mb-2 sm:mb-3 md:mb-4">
                    Get AI-evaluated feedback on your interview skills
                  </p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate("interview")}
                  className="w-full bg-white text-[#0096C7] py-1.5 sm:py-2 md:py-2.5 rounded-lg font-semibold text-xs sm:text-sm md:text-base hover:bg-blue-50 transition-colors"
                >
                  Start Mock Interview
                </button>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-100 flex-1 overflow-y-auto">
                <button
                  onClick={() => onNavigate && onNavigate("events")}
                  className="w-full flex items-center justify-between mb-2 sm:mb-3 md:mb-4 hover:opacity-70 transition-opacity"
                >
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                    Upcoming Events
                  </h3>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-400" />
                </button>

                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 flex items-center justify-center flex-1">
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No upcoming events</p>
                    <p className="text-gray-400 text-xs mt-1">Events will appear here when available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon, number, label }: { icon: React.ReactNode; number: string; label: string }) {
  return (
    <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <div className="bg-gray-100 p-1.5 sm:p-2 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 mb-0.5">{number}</div>
      <div className="text-xs sm:text-xs md:text-sm text-gray-600 leading-tight">{label}</div>
    </div>
  );
}

function JobListingItem({ title, company, location, type, timeAgo }: { title: string; company: string; location: string; type: string; timeAgo: string }) {
  return (
    <div className="flex items-start gap-2 sm:gap-3 pb-1.5 sm:pb-2 md:pb-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base">{title}</h4>
        <p className="text-xs text-gray-500">
          {company} • {location}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="inline-block text-xs font-medium text-[#00B4D8] bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full">
          {type}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">{timeAgo}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-center">
      <span className="text-gray-600">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}

function EventItem({ title, type, date }: { title: string; type: string; date: string }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3 pb-1.5 sm:pb-2 md:pb-3 border-b border-gray-100 last:border-0">
      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-xs sm:text-sm">{title}</p>
        <p className="text-xs text-gray-500">{type}</p>
      </div>
      <span className="text-[#00B4D8] font-medium text-xs sm:text-sm flex-shrink-0 whitespace-nowrap">
        {date}
      </span>
    </div>
  );
}

