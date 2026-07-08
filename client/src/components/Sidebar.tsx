import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "../lib/trpc";

import { Bot,
  Home,
  Building2,
  Users,
  Mail,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  Search,
  Send,
  Target,
  LogOut,
  User,
  X,
  Folder,
} from "lucide-react";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }> | null;
  children?: NavItem[];
  separator?: boolean;
  label?: string;
}

const navItems: NavItem[] = [
  { name: "Home", path: "/", icon: Home },
  { name: "Corporations", path: "/corporations", icon: Building2 },
  { name: "Companies", path: "/companies", icon: Building2 },
  { name: "Contacts", path: "/contacts", icon: Users },
  { name: "Pipeline", path: "/deals", icon: BarChart3 },
  { name: "Calendar", path: "/calendar", icon: Calendar },
  { name: "Emails", path: "/emails", icon: Mail, children: [] },
  { name: "AI Inbox", path: "/ai-inbox", icon: Bot },
  {
    name: "__separator_agents__",
    path: "",
    icon: null,
    separator: true,
    label: "Agenten",
  },
  {
    name: "Scout Agent",
    path: "/scout",
    icon: Search,
    children: [
      { name: "Dashboard", path: "/scout", icon: Home },
      { name: "Add Seed", path: "/scout/seed", icon: Target },
      { name: "Review Queue", path: "/scout/review", icon: FileText },
      { name: "Job Queue", path: "/scout/queue", icon: BarChart3 },
      { name: "Discovery Methods", path: "/scout/methods", icon: Search },
      { name: "Statistics", path: "/scout/stats", icon: BarChart3 },
    ],
  },
  {
    name: "Hunter Agent",
    path: "/hunter",
    icon: Target,
    children: [
      { name: "Dashboard", path: "/hunter", icon: Home },
      { name: "Job Queue", path: "/hunter/queue", icon: BarChart3 },
    ],
  },
  {
    name: "Outreach Agent",
    path: "/outreach",
    icon: Send,
    children: [
      { name: "Dashboard", path: "/outreach", icon: Home },
      { name: "Job Queue", path: "/outreach/queue", icon: BarChart3 },
    ],
  },
  {
    name: "System",
    path: "/system",
    icon: Settings,
    children: [
      { name: "Users", path: "/users", icon: Users },
      { name: "Settings", path: "/settings", icon: Settings },
      { name: "Documentation", path: "/documentation", icon: FileText },
    ],
  },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ onCollapseChange, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const { data: user } = trpc.auth.me.useQuery();
  const { data: emailFolders = [] } = trpc.emailClient.getFolders.useQuery(undefined, {
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const dynamicNavItems = navItems.map(item => {
    if (item.name === "Emails" && emailFolders.length > 0) {
      return {
        ...item,
        children: emailFolders.map((folder: string) => ({
          name: folder,
          path: `/emails?folder=${folder}`,
          icon: Folder,
        })),
      };
    }
    return item;
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const toggleSection = (itemName: string) => {
    if (expandedSections.includes(itemName)) {
      setExpandedSections(expandedSections.filter((s) => s !== itemName));
    } else {
      setExpandedSections([...expandedSections, itemName]);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location === path || location.startsWith(path + "/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleLinkClick = () => {
    // Close mobile sidebar when clicking a link
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 bottom-0 z-50
          bg-white shadow-lg
          transition-all duration-300 ease-in-out
          flex flex-col
          border-r border-gray-100
          ${isMobileOpen ? "left-0" : "-left-64"}
          ${isCollapsed ? "w-20" : "w-64"}
          lg:left-4 lg:top-4 lg:bottom-4 lg:rounded-2xl lg:border
        `}
      >
        {/* Header with Logo */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <img src="/friday-logo.svg" alt="FRIDAY" className="h-8" />
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <div className="w-8 h-8 bg-bl2020-orange rounded-lg flex items-center justify-center text-white font-bold">
                F
              </div>
            </div>
          )}

          {/* Close button (Mobile only) */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse button (Desktop only) */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Global Search */}
        {!isCollapsed && (
          <div className="px-3 py-2 border-b border-gray-100">
          </div>
        )}
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {dynamicNavItems.map((item: any) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedSections.includes(item.name);

              // Separator / section label
              if (item.separator) {
                return (
                  <li key={item.name}>
                    {!isCollapsed && (
                      <div className="pt-4 pb-1 px-3">
                        <div className="border-t border-gray-200 mb-2" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {item.label}
                        </span>
                      </div>
                    )}
                    {isCollapsed && (
                      <div className="pt-3 pb-1 px-3">
                        <div className="border-t border-gray-200" />
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.name}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => toggleSection(item.name)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                          transition-all duration-200
                          ${
                            active
                              ? "bg-gray-50 text-[#E48F00]"
                              : "text-gray-700 hover:bg-gray-100"
                          }
                          ${isCollapsed ? "justify-center" : ""}
                        `}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left font-medium text-sm">
                              {item.name}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </>
                        )}
                      </button>

                      {/* Submenu */}
                      {isExpanded && !isCollapsed && (
                        <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                          {item.children?.map((child: any) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.path);

                            return (
                              <li key={child.path}>
                                <Link href={child.path} onClick={handleLinkClick}>
                                  <a
                                    className={`
                                      flex items-center gap-3 px-3 py-2 rounded-lg
                                      transition-all duration-200
                                      ${
                                        childActive
                                          ? "bg-gray-50 text-[#E48F00]"
                                          : "text-gray-600 hover:bg-gray-100"
                                      }
                                    `}
                                  >
                                    <ChildIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm">{child.name}</span>
                                  </a>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link href={item.path} onClick={handleLinkClick}>
                      <a
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg
                          transition-all duration-200
                          ${
                            active
                              ? "bg-gray-50 text-[#E48F00]"
                              : "text-gray-700 hover:bg-gray-100"
                          }
                          ${isCollapsed ? "justify-center" : ""}
                        `}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="font-medium text-sm">{item.name}</span>
                        )}
                      </a>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-100">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-bl2020-orange rounded-full flex items-center justify-center text-white font-semibold">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
