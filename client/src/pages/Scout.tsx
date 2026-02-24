/**
 * FRIDAY CRM - Scout Agent Dashboard
 * Übersicht über Scout Agent Status, Queue, Suggestions und Statistics
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function Scout() {
  const { data: queueStats, isLoading: loadingQueue } = trpc.scout.getQueueStats.useQuery();
  const { data: generationStats, isLoading: loadingGen } = trpc.scout.getGenerationStats.useQuery();
  const { data: suggestions, isLoading: loadingSuggestions } = trpc.scout.getSuggestions.useQuery({ limit: 5 });
  const { data: discoveryMethods, isLoading: loadingMethods } = trpc.scout.getDiscoveryMethods.useQuery();

  if (loadingQueue || loadingGen || loadingSuggestions || loadingMethods) {
    return (
      <div className="container py-8">
        <div className="text-center text-gray-600">Lade Scout Agent Dashboard...</div>
      </div>
    );
  }

  const pendingSuggestionsCount = suggestions?.length || 0;
  const totalDiscovered = generationStats?.reduce((sum, g) => sum + g.count, 0) || 0;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Scout Agent</h1>
        <p className="text-gray-600">
          Autonome Lead-Generierung durch Wettbewerber-Analyse
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border p-6">
          <div className="text-sm text-gray-600 mb-2">Queue Jobs</div>
          <div className="text-3xl font-bold">{queueStats?.total || 0}</div>
          <div className="text-xs text-gray-500 mt-2">
            {queueStats?.pending || 0} Pending · {queueStats?.processing || 0} Processing
          </div>
        </div>

        <div className="border p-6">
          <div className="text-sm text-gray-600 mb-2">Pending Review</div>
          <div className="text-3xl font-bold text-orange-600">{pendingSuggestionsCount}</div>
          <Link href="/scout/review">
            <span className="text-xs text-orange-600 hover:underline mt-2 inline-block">Review →</span>
          </Link>
        </div>

        <div className="border p-6">
          <div className="text-sm text-gray-600 mb-2">Total Discovered</div>
          <div className="text-3xl font-bold">{totalDiscovered}</div>
          <div className="text-xs text-gray-500 mt-2">
            {generationStats?.find((g) => g.generation === 0)?.count || 0} Seed
          </div>
        </div>

        <div className="border p-6">
          <div className="text-sm text-gray-600 mb-2">Active Methods</div>
          <div className="text-3xl font-bold">
            {discoveryMethods?.filter((m) => m.enabled).length || 0}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            von {discoveryMethods?.length || 0} Methoden
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/scout/seed">
          <div className="border p-6 hover:bg-gray-50 cursor-pointer">
            <h3 className="font-bold mb-2">➕ Seed hinzufügen</h3>
            <p className="text-sm text-gray-600">
              Neue Firma manuell hinzufügen oder CSV importieren
            </p>
          </div>
        </Link>

        <Link href="/scout/review">
          <div className="border p-6 hover:bg-gray-50 cursor-pointer">
            <h3 className="font-bold mb-2">✓ Review Queue</h3>
            <p className="text-sm text-gray-600">
              {pendingSuggestionsCount} Vorschläge warten auf Freigabe
            </p>
          </div>
        </Link>

        <Link href="/scout/methods">
          <div className="border p-6 hover:bg-gray-50 cursor-pointer">
            <h3 className="font-bold mb-2">⚙ Discovery Methods</h3>
            <p className="text-sm text-gray-600">
              Methoden konfigurieren und aktivieren/deaktivieren
            </p>
          </div>
        </Link>
      </div>

      {/* Generation Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Generationen-Baum</h2>
        <div className="border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 border-b">Generation</th>
                <th className="text-right p-4 border-b">Total</th>
                <th className="text-right p-4 border-b">Approved</th>
                <th className="text-right p-4 border-b">Pending</th>
                <th className="text-right p-4 border-b">Rejected</th>
                <th className="text-right p-4 border-b">Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {generationStats && generationStats.length > 0 ? (
                generationStats.map((stat) => {
                  const approvalRate =
                    stat.approved + stat.rejected > 0
                      ? Math.round((stat.approved / (stat.approved + stat.rejected)) * 100)
                      : 0;
                  return (
                    <tr key={stat.generation} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <span className="font-mono">Gen {stat.generation}</span>
                        {stat.generation === 0 && (
                          <span className="ml-2 text-xs text-gray-500">(Seed)</span>
                        )}
                      </td>
                      <td className="text-right p-4 font-bold">{stat.count}</td>
                      <td className="text-right p-4 text-green-600">{stat.approved}</td>
                      <td className="text-right p-4 text-orange-600">{stat.pending}</td>
                      <td className="text-right p-4 text-red-600">{stat.rejected}</td>
                      <td className="text-right p-4">
                        {stat.approved + stat.rejected > 0 ? (
                          <span className={approvalRate >= 50 ? "text-green-600" : "text-red-600"}>
                            {approvalRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Noch keine Daten. Fügen Sie Seed-Firmen hinzu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Suggestions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Neueste Vorschläge</h2>
          <Link href="/scout/review">
            <span className="text-sm text-orange-600 hover:underline">Alle anzeigen →</span>
          </Link>
        </div>
        <div className="border">
          {suggestions && suggestions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 border-b">Name</th>
                  <th className="text-left p-4 border-b">Land</th>
                  <th className="text-left p-4 border-b">Generation</th>
                  <th className="text-left p-4 border-b">Entdeckt</th>
                  <th className="text-right p-4 border-b">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((corp) => (
                  <tr key={corp.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-bold">{corp.name}</td>
                    <td className="p-4">{corp.headquartersCountry}</td>
                    <td className="p-4">
                      <span className="font-mono">Gen {corp.scoutGeneration}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {corp.discoveredAt
                        ? new Date(corp.discoveredAt).toLocaleDateString("de-DE")
                        : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/scout/review/${corp.id}`}>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Keine Vorschläge vorhanden. Scout Agent läuft im Hintergrund.
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 p-6 border-l-4 border-orange-600">
        <h3 className="font-bold mb-2">🤖 Wie funktioniert der Scout Agent?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Der Scout Agent analysiert kontinuierlich Seed-Firmen, sucht Wettbewerber in Top-15-Märkten
          und erstellt Vorschläge zur manuellen Review. Nach Approval werden Wettbewerber selbst zu
          Seeds für die nächste Generation.
        </p>
        <Link href="/docs">
          <span className="text-sm text-orange-600 hover:underline">
            Vollständige Dokumentation lesen →
          </span>
        </Link>
      </div>
    </div>
  );
}

