import React from "react";
import { LogOut } from "lucide-react";

export const Sidebar = ({
  userName,
  userID,
  onLogout,
  onNavigate,
  activeNav,
}: {
  userName: string;
  userID: string;
  onLogout: () => void;
  onNavigate: (route: string) => void;
  activeNav: string;
}) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
        <p className="text-sm text-gray-500">{userID}</p>
      </div>

      <nav className="flex-1 space-y-4">
        <NavItem
          label="Dashboard"
          active={activeNav === "dashboard"}
          onClick={() => onNavigate("dashboard")}
        />
        <NavItem
          label="Jobs"
          active={activeNav === "jobs"}
          onClick={() => onNavigate("jobs")}
        />
        <NavItem
          label="Interviews"
          active={activeNav === "interview"}
          onClick={() => onNavigate("interview")}
        />
        <NavItem
          label="Events"
          active={activeNav === "events"}
          onClick={() => onNavigate("events")}
        />
      </nav>

      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </div>
  );
};

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-[#00B4D8] text-white font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
