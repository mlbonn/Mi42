import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function OutreachDashboard() {
  const { data: stats, isLoading } = trpc.outreach.getStats.useQuery();
  const { data: campaigns } = trpc.outreach.listCampaigns.useQuery();

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  const recentCampaigns = campaigns?.slice(0, 5) || [];

  return (
    <main className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Gesamt Kampagnen</div>
          <div className="text-3xl font-bold">{stats?.totalCampaigns || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Aktive Kampagnen</div>
          <div className="text-3xl font-bold text-green-600">{stats?.activeCampaigns || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">E-Mail Drafts</div>
          <div className="text-3xl font-bold">{stats?.totalDrafts || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Zur Review</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.pendingReview || 0}</div>
        </div>
        <div className="bg-white p-4">
          <div className="text-sm text-gray-500">Versendet</div>
          <div className="text-3xl font-bold text-gray-600">{stats?.sentEmails || 0}</div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/outreach/campaigns">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">Kampagnen verwalten</div>
            <div className="text-sm text-gray-600">
              Erstellen und verwalten Sie E-Mail-Kampagnen
            </div>
          </div>
        </Link>

        <Link href="/outreach/review">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">Review Queue</div>
            <div className="text-sm text-gray-600">
              {stats?.pendingReview || 0} E-Mail-Drafts warten auf Review
            </div>
          </div>
        </Link>

        <Link href="/outreach/sent">
          <div className="bg-white p-6 hover:bg-gray-50 cursor-pointer">
            <div className="text-lg font-semibold mb-2">Versendete E-Mails</div>
            <div className="text-sm text-gray-600">
              {stats?.sentEmails || 0} E-Mails versendet
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Letzte Kampagnen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Zielgruppe</th>
                <th className="px-4 py-2 text-left">Sprache</th>
                <th className="px-4 py-2 text-left">Erstellt</th>
                <th className="px-4 py-2 text-left">Gestartet</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Kampagnen vorhanden
                  </td>
                </tr>
              ) : (
                recentCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {campaign.status === "active" && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Aktiv
                        </span>
                      )}
                      {campaign.status === "draft" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          Entwurf
                        </span>
                      )}
                      {campaign.status === "paused" && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          Pausiert
                        </span>
                      )}
                      {campaign.status === "completed" && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Abgeschlossen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{campaign.name}</td>
                    <td className="px-4 py-3">{campaign.targetSegment || "-"}</td>
                    <td className="px-4 py-3 uppercase">{campaign.language}</td>
                    <td className="px-4 py-3">
                      {campaign.createdAt
                        ? new Date(campaign.createdAt).toLocaleDateString("de-DE")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {campaign.startedAt
                        ? new Date(campaign.startedAt).toLocaleDateString("de-DE")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/outreach/campaigns/${campaign.id}`}>
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
        <div className="font-semibold mb-2">Outreach Agent - Automatisierte E-Mail-Kampagnen</div>
        <p className="mb-2">
          Der Outreach Agent generiert hyper-personalisierte E-Mails basierend auf aktuellen News, 
          LinkedIn-Posts und Unternehmensdaten. Jede E-Mail wird in der Muttersprache des Empfängers 
          verfasst und manuell reviewt.
        </p>
        <p>
          <strong>Workflow:</strong> Kampagne erstellen → Kontakte auswählen → E-Mails generieren → 
          Review Queue → Genehmigen → Versenden
        </p>
      </div>
    </main>
  );
}

