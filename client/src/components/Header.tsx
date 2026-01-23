/**
 * FRIDAY CRM - Header with Global Search
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import GlobalSearch from "./GlobalSearch";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Force reload to clear all state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Force logout anyway
      window.location.href = "/";
    }
  };

  return (
    <header className="h-16 bg-white flex items-center px-6 gap-6">
      {/* Global Search */}
      <GlobalSearch />

      {/* Right Side - User Info */}
      <div className="ml-auto flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-gray-700">{user?.name || "User"}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </>
        ) : (
          <Button onClick={() => (window.location.href = getLoginUrl())} size="sm">
            Login
          </Button>
        )}
      </div>
    </header>
  );
}

