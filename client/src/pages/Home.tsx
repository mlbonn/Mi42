import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Building2, Users, DollarSign, TrendingUp, Clock } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recentActivities } = trpc.activities.recent.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 text-black">FRIDAY CRM</h1>
          <p className="text-lg mb-8 text-gray-600">
            Fully Responsive Intelligence Driving Autonomous Yield
          </p>
          <p className="text-base mb-8 text-gray-500">
            Account-Based Marketing CRM für Global Building Monitor
          </p>
          <Button asChild className="bg-black text-white hover:bg-gray-800">
            <a href={getLoginUrl()}>Login</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Corporations Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600">Konzerne</span>
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stats?.totalCorporations || 0}
            </div>
            <Link href="/corporations">
              <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                Alle anzeigen →
              </span>
            </Link>
          </div>

          {/* Contacts Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600">Kontakte</span>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stats?.totalContacts || 0}
            </div>
            <Link href="/contacts">
              <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                Alle anzeigen →
              </span>
            </Link>
          </div>

          {/* Deals Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600">Deals</span>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stats?.totalDeals || 0}
            </div>
            <Link href="/deals">
              <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                Pipeline anzeigen →
              </span>
            </Link>
          </div>

          {/* Deal Value Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600">
                {user?.role === 'staff_plus' ? 'Pending Commission' : 'Deal Value'}
              </span>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              €{(user?.role === 'staff_plus' 
                ? (stats?.pendingCommission || 0) 
                : (stats?.totalDealValue || 0)
              ).toLocaleString()}
            </div>
            <span className="text-xs text-gray-500">Gesamt</span>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Recent Activities</h2>
            </div>
          </div>
          
          {recentActivities && recentActivities.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {activity.activityType || 'Activity'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {activity.subject || 'No subject'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {activity.content || 'No content'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {activity.activityDate 
                        ? new Date(activity.activityDate).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'short'
                          })
                        : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Keine Activities vorhanden</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/corporations">
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-5 w-5 text-gray-700" />
                <h3 className="text-sm font-medium text-gray-900">Konzerne</h3>
              </div>
              <p className="text-xs text-gray-600">Verwalten Sie Ihre Zielunternehmen</p>
            </div>
          </Link>

          <Link href="/contacts">
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-gray-700" />
                <h3 className="text-sm font-medium text-gray-900">Kontakte</h3>
              </div>
              <p className="text-xs text-gray-600">Ansprechpartner verwalten</p>
            </div>
          </Link>

          <Link href="/deals">
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-gray-700" />
                <h3 className="text-sm font-medium text-gray-900">Sales Pipeline</h3>
              </div>
              <p className="text-xs text-gray-600">Verfolgen Sie Ihre Deals</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

