import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function HunterReview() {
  const { data: results, isLoading } = trpc.hunter.getPendingResults.useQuery();
  const reviewMutation = trpc.hunter.reviewResult.useMutation();
  const bulkReviewMutation = trpc.hunter.bulkReview.useMutation();
  const utils = trpc.useUtils();

  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const handleReview = async (resultId: string, action: "approve" | "reject") => {
    try {
      await reviewMutation.mutateAsync({ resultId, action });
      utils.hunter.getPendingResults.invalidate();
      utils.hunter.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Review");
      console.error(error);
    }
  };

  const handleBulkReview = async (action: "approve" | "reject") => {
    if (selectedResults.size === 0) {
      alert("Bitte wählen Sie mindestens einen Kontakt aus");
      return;
    }

    if (!confirm(`${selectedResults.size} Kontakte ${action === "approve" ? "genehmigen" : "ablehnen"}?`)) {
      return;
    }

    try {
      await bulkReviewMutation.mutateAsync({
        resultIds: Array.from(selectedResults),
        action
      });
      setSelectedResults(new Set());
      utils.hunter.getPendingResults.invalidate();
      utils.hunter.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Bulk-Review");
      console.error(error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResults(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedResults.size === filteredResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(filteredResults.map(r => r.id)));
    }
  };

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  const filteredResults = results?.filter(r => {
    const conf = r.confidence || 0;
    if (filter === "high") return conf >= 80;
    if (filter === "medium") return conf >= 60 && conf < 80;
    if (filter === "low") return conf < 60;
    return true;
  }) || [];

  return (
    <main className="p-6">
      {/* Filter & Bulk Actions */}
      <div className="bg-white p-4 mb-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div>
            <label className="text-sm font-medium mr-2">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border rounded"
            >
              <option value="all">Alle ({results?.length || 0})</option>
              <option value="high">Hoch (≥80%)</option>
              <option value="medium">Mittel (60-79%)</option>
              <option value="low">Niedrig (&lt;60%)</option>
            </select>
          </div>

          {selectedResults.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkReview("approve")}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-1 bg-[#E48F00] text-white text-sm hover:bg-[#c87e00] disabled:bg-gray-400"
              >
                ✓ {selectedResults.size} Genehmigen
              </button>
              <button
                onClick={() => handleBulkReview("reject")}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-1 bg-gray-600 text-white text-sm hover:bg-gray-800 disabled:bg-gray-400"
              >
                ✗ {selectedResults.size} Ablehnen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedResults.size === filteredResults.length && filteredResults.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Titel</th>
                <th className="px-4 py-2 text-left">E-Mail</th>
                <th className="px-4 py-2 text-left">Telefon</th>
                <th className="px-4 py-2 text-left">LinkedIn</th>
                <th className="px-4 py-2 text-left">Confidence</th>
                <th className="px-4 py-2 text-left">E-Mail Status</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Keine Kontakte zur Review vorhanden
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <tr key={result.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(result.id)}
                        onChange={() => toggleSelect(result.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {result.fullName}
                      <div className="text-xs text-gray-500">{result.companyName}</div>
                    </td>
                    <td className="px-4 py-3">
                      {result.title}
                      <div className="text-xs text-gray-500">{result.department}</div>
                    </td>
                    <td className="px-4 py-3">
                      {result.email ? (
                        <a href={`mailto:${result.email}`} className="text-[#E48F00] hover:underline">
                          {result.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">Keine E-Mail</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{result.phoneNumber || "-"}</td>
                    <td className="px-4 py-3">
                      {result.linkedinUrl && (
                        <a
                          href={result.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#E48F00] hover:underline text-xs"
                        >
                          Profil
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (result.confidence || 0) >= 80
                                ? "bg-[#E48F00]"
                                : (result.confidence || 0) >= 60
                                ? "bg-bl2020-orange"
                                : "bg-bl2020-orange"
                            }`}
                            style={{ width: `${result.confidence || 0}%` }}
                          />
                        </div>
                        <span className="text-xs">{result.confidence || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {result.emailStatus === "valid" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          ✓ Verifiziert
                        </span>
                      )}
                      {result.emailStatus === "risky" && (
                        <span className="px-2 py-1 bg-gray-100 text-orange-800 rounded text-xs">
                          ⚠ Riskant
                        </span>
                      )}
                      {result.emailStatus === "invalid" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          ✗ Ungültig
                        </span>
                      )}
                      {result.emailStatus === "unknown" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          ? Unbekannt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReview(result.id, "approve")}
                          disabled={reviewMutation.isPending}
                          className="px-2 py-1 bg-[#E48F00] text-white text-xs hover:bg-[#c87e00] disabled:bg-gray-400"
                          title="Genehmigen"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleReview(result.id, "reject")}
                          disabled={reviewMutation.isPending}
                          className="px-2 py-1 bg-gray-600 text-white text-xs hover:bg-gray-800 disabled:bg-gray-400"
                          title="Ablehnen"
                        >
                          ✗
                        </button>
                      </div>
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
        <div className="font-semibold mb-2">✅ Review Queue - Kontakte genehmigen</div>
        <p className="mb-2">
          Prüfen Sie die vom Hunter Agent gefundenen Kontakte. Genehmigte Kontakte werden 
          automatisch in Ihre Kontaktdatenbank importiert.
        </p>
        <p>
          <strong>Confidence Score:</strong> Basiert auf E-Mail-Verifizierung, LinkedIn-Profil, 
          Datenquelle und Seniority. Grün (≥80%) = Sehr zuverlässig, Blau (60-79%) = Gut, 
          Orange (&lt;60%) = Prüfen empfohlen.
        </p>
      </div>
    </main>
  );
}

