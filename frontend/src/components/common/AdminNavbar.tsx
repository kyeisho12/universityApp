import React from "react";
import {
  LayoutGrid,
  Briefcase,
  ChartColumn,
  MessageSquare,
  Users,
  LogOut,
  User,
  Calendar,
  FileText,
} from "lucide-react";

export const AdminNavbar = ({
  userName,
  userID,
  onLogout,
  onNavigate,
  activeNav: initialActive,
}: {
  userName: string;
  userID: string;
  onLogout: () => void;
  onNavigate?: (nav: string) => void;
  activeNav?: string;
}) => {
  const [activeNav, setActiveNav] = React.useState<string>(initialActive || "dashboard");
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  React.useEffect(() => {
    if (initialActive) {
      setActiveNav(initialActive);
    }
  }, [initialActive]);

  const handleNavClick = (nav: string) => {
    setActiveNav(nav);
    if (onNavigate) onNavigate(nav);
  };

  return (
    <div className="w-72 h-full bg-[#1B2744] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/UnivOfficeLogo.png" alt="TSU Career Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="font-bold leading-tight">TSU Career</h1>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem
          icon={<LayoutGrid className="w-5 h-5" />}
          label="Dashboard"
          active={activeNav === "admin/dashboard"}
          onClick={() => handleNavClick("admin/dashboard")}
        />
        <NavItem
          icon={<Briefcase className="w-5 h-5" />}
          label="Employer Partners"
          active={activeNav === "admin/employer_partners"}
          onClick={() => handleNavClick("admin/employer_partners")}
        />
        <NavItem
          icon={<ChartColumn className="w-5 h-5" />}
          label="Student Analytics"
          active={activeNav === "admin/student_analytics"}
          onClick={() => handleNavClick("admin/student_analytics")}
        />
        <NavItem
          icon={<Calendar className="w-5 h-5" />}
          label="Career Events"
          active={activeNav === "admin/career_events"}
          onClick={() => handleNavClick("admin/career_events")}
        />
        <NavItem
          icon={<MessageSquare className="w-5 h-5" />}
          label="Mock Interviews"
          active={activeNav === "admin/mock_interview"}
          onClick={() => handleNavClick("admin/mock_interview")}
        />
        <NavItem
          icon={<FileText className="w-5 h-5" />}
          label="Job Applications"
          active={activeNav === "admin/applications"}
          onClick={() => handleNavClick("admin/applications")}
        />
        <NavItem
          icon={<Users className="w-5 h-5" />}
          label="Manage Students"
          active={activeNav === "admin/manage_students"}
          onClick={() => handleNavClick("admin/manage_students")}
        />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-4">
        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
          <div className="w-10 h-10 bg-[#00B4D8] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate capitalize">{userName}</p>
            <p className="text-xs text-gray-400">ADMIN</p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign out?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out of the admin portal?</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowSignOutConfirm(false); onLogout(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function NavItem({ icon, label, badge, active, onClick }: { icon: React.ReactNode; label: string; badge?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active ? "bg-[#00B4D8] text-white" : "text-gray-300 hover:bg-gray-700/50"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="ml-auto text-xs font-bold bg-gray-600 px-2 py-1 rounded">{badge}</span>
      )}
    </button>
  );
}

