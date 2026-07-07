import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function HunterDashboard() {
  const { data: stats, isLoading } = trpc.hunter.getStats.useQuery();
  const { data: jobs } = trpc.hunter.listJobs.useQuery();

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  const recentJobs = jobs?.slice(0, 5) || [];

  return (
    <main className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Gesamt Jobs</div>
          <div className="text-3xl font-bold">{stats?.totalJobs || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Ausstehend</div>
          <div className="text-3xl font-bold text-[#E48F00]">{stats?.pendingJobs || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Gefundene Kontakte</div>
          <div className="text-3xl font-bold">{stats?.totalResults || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Zur Review</div>
          <div className="text-3xl font-bold text-[#E48F00]">{stats?.pendingReview || 0}</div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/hunter/targets">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">🎯 Target Companies</div>
            <div className="text-sm text-gray-600">
              Wählen Sie Zielunternehmen für die Kontaktsuche aus
            </div>
          </div>
        </Link>

        <Link href="/hunter/review">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">✅ Review Queue</div>
            <div className="text-sm text-gray-600">
              {stats?.pendingReview || 0} Kontakte warten auf Review
            </div>
          </div>
        </Link>

        <Link href="/hunter/data-sources">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">🔌 Datenquellen</div>
            <div className="text-sm text-gray-600">
              Apollo.io, Hunter.io, LinkedIn konfigurieren
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Letzte Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Konzern</th>
                <th className="px-4 py-2 text-left">Ziel-Rollen</th>
                <th className="px-4 py-2 text-left">Anzahl</th>
                <th className="px-4 py-2 text-left">Erstellt</th>
                <th className="px-4 py-2 text-left">Abgeschlossen</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Jobs vorhanden
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => (
                  <tr key={job.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {job.status === "completed" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Abgeschlossen
                        </span>
                      )}
                      {job.status === "pending" && (
                        <span className="px-2 py-1 bg-gray-100 text-orange-800 rounded text-xs">
                          Ausstehend
                        </span>
                      )}
                      {job.status === "processing" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          In Bearbeitung
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          Fehlgeschlagen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{job.corporationId.substring(0, 8)}...</td>
                    <td className="px-4 py-3">
                      {Array.isArray(job.targetRoles) 
                        ? job.targetRoles.slice(0, 2).join(", ")
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">{job.targetCount}</td>
                    <td className="px-4 py-3">
                      {new Date(job.createdAt!).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      {job.completedAt 
                        ? new Date(job.completedAt).toLocaleDateString("de-DE")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/hunter/jobs/${job.id}`}>
                        <button className="px-3 py-1 bg-black text-white text-xs hover:bg-gray-800">
                          Details
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 text-sm text-gray-600">
        <div className="font-semibold mb-2">🤖 Hunter Agent - Automatische Kontaktsuche</div>
        <p className="mb-2">
          Der Hunter Agent durchsucht Apollo.io, Hunter.io und LinkedIn nach relevanten 
          Ansprechpartnern in Ihren Zielunternehmen. Gefundene Kontakte werden verifiziert 
          und zur manuellen Review vorgelegt.
        </p>
        <p>
          <strong>Workflow:</strong> Target Companies auswählen → Hunter Job erstellen → 
          Automatische Suche → E-Mail-Verifizierung → Review Queue → Kontakte importieren
        </p>
      </div>
    </main>
  );
}

