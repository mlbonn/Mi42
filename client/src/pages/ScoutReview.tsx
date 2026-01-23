/**
 * FRIDAY CRM - Scout Agent Review Queue
 * Review und Approval von Scout-Vorschlägen
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ScoutReview() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generationFilter, setGenerationFilter] = useState<number | undefined>(undefined);

  const { data: suggestions, isLoading, refetch } = trpc.scout.getSuggestions.useQuery({
    generation: generationFilter,
  });

  const approveMutation = trpc.scout.approveSuggestion.useMutation({
    onSuccess: () => {
      toast.success("Vorschlag approved");
      refetch();
    },
  });

  const rejectMutation = trpc.scout.rejectSuggestion.useMutation({
    onSuccess: () => {
      toast.success("Vorschlag rejected");
      refetch();
    },
  });

  const bulkApproveMutation = trpc.scout.bulkApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} Vorschläge approved`);
      setSelectedIds([]);
      refetch();
    },
  });

  const bulkRejectMutation = trpc.scout.bulkReject.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} Vorschläge rejected`);
      setSelectedIds([]);
      refetch();
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === suggestions?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suggestions?.map((s) => s.id) || []);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center text-gray-600">Lade Review Queue...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Review Queue</h1>
            <p className="text-gray-600">
              {suggestions?.length || 0} Vorschläge warten auf Freigabe
            </p>
          </div>
          <Link href="/scout">
            <Button variant="outline">← Zurück zu Scout Dashboard</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <label className="text-sm font-bold">Generation:</label>
          <select
            value={generationFilter ?? "all"}
            onChange={(e) =>
              setGenerationFilter(e.target.value === "all" ? undefined : Number(e.target.value))
            }
            className="border p-2"
          >
            <option value="all">Alle Generationen</option>
            <option value="1">Gen 1</option>
            <option value="2">Gen 2</option>
            <option value="3">Gen 3</option>
            <option value="4">Gen 4</option>
            <option value="5">Gen 5</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 p-4 mb-4 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <span className="font-bold">{selectedIds.length} ausgewählt</span>
            <div className="flex gap-2">
              <Button
                onClick={() => bulkApproveMutation.mutate({ corporationIds: selectedIds })}
                disabled={bulkApproveMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Alle Approven
              </Button>
              <Button
                onClick={() => bulkRejectMutation.mutate({ corporationIds: selectedIds })}
                disabled={bulkRejectMutation.isPending}
                size="sm"
                variant="destructive"
              >
                ✗ Alle Rejecten
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Table */}
      {suggestions && suggestions.length > 0 ? (
        <div className="border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 border-b text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === suggestions.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 border-b">Name</th>
                <th className="text-left p-4 border-b">Land</th>
                <th className="text-left p-4 border-b">Branche</th>
                <th className="text-left p-4 border-b">Generation</th>
                <th className="text-left p-4 border-b">Entdeckt</th>
                <th className="text-left p-4 border-b">Methode</th>
                <th className="text-right p-4 border-b">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((corp) => (
                <tr key={corp.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(corp.id)}
                      onChange={() => handleToggleSelect(corp.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-bold">{corp.name}</div>
                    {corp.website && (
                      <a
                        href={corp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {corp.website}
                      </a>
                    )}
                  </td>
                  <td className="p-4">{corp.headquartersCountry || "-"}</td>
                  <td className="p-4 text-sm">{corp.industry || "-"}</td>
                  <td className="p-4">
                    <span className="font-mono text-sm">Gen {corp.scoutGeneration}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {corp.discoveredAt
                      ? new Date(corp.discoveredAt).toLocaleDateString("de-DE")
                      : "-"}
                  </td>
                  <td className="p-4 text-xs text-gray-600">{corp.discoveryMethod || "-"}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => approveMutation.mutate({ corporationId: corp.id })}
                        disabled={approveMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✓
                      </Button>
                      <Button
                        onClick={() => rejectMutation.mutate({ corporationId: corp.id })}
                        disabled={rejectMutation.isPending}
                        size="sm"
                        variant="destructive"
                      >
                        ✗
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border p-12 text-center text-gray-500">
          <div className="text-4xl mb-4">✓</div>
          <div className="font-bold mb-2">Keine Vorschläge vorhanden</div>
          <p className="text-sm">
            Scout Agent läuft im Hintergrund. Neue Vorschläge erscheinen hier automatisch.
          </p>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-8 bg-yellow-50 p-6 border-l-4 border-yellow-600">
        <h3 className="font-bold mb-2">💡 Review-Tipps</h3>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>
            <strong>Approve:</strong> Firma wird zu "Target" und automatisch zur Queue für nächste
            Generation hinzugefügt
          </li>
          <li>
            <strong>Reject:</strong> Firma wird als "Rejected" markiert und erscheint nicht mehr in
            Queue
          </li>
          <li>
            <strong>Bulk Actions:</strong> Mehrere Firmen gleichzeitig approven/rejecten mit
            Checkboxen
          </li>
          <li>
            <strong>Website prüfen:</strong> Klicken Sie auf Website-Link um Firma zu verifizieren
          </li>
        </ul>
      </div>
    </div>
  );
}

