import React from "react";
import {
  Search,
  Bell,
  LayoutGrid,
  Briefcase,
  FileText,
  Calendar,
  Zap,
  LogOut,
  ChevronRight,
  Upload,
  Eye,
  X,
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

