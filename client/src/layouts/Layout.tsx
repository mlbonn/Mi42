import { useState, ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import GlobalSearch from "../components/GlobalSearch";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        onCollapseChange={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      {/* Mobile Header with Hamburger Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <img src="/friday-logo.svg" alt="FRIDAY" className="h-8" />
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content Area - with dynamic left padding based on sidebar state */}
      <main 
        className={`
          transition-all duration-300
          pt-20 lg:pt-0
          ${isSidebarCollapsed ? "ml-0 lg:ml-28" : "ml-0 lg:ml-72"}
        `}
      >
        {/* Sticky search header – always visible, independent of sidebar state */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-3">
          <div className="max-w-7xl mx-auto">
            <GlobalSearch />
          </div>
        </div>

        {/* Page content */}
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
