import { useState, ReactNode } from "react";
import Sidebar from "../components/Sidebar";
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
          transition-all duration-300 p-8
          pt-20 lg:pt-8
          ${isSidebarCollapsed ? "ml-0 lg:ml-28" : "ml-0 lg:ml-72"}
        `}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
