import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function HunterTargetCompanies() {
  const { data: corporations, isLoading } = trpc.corporations.list.useQuery();
  const createJobMutation = trpc.hunter.createJob.useMutation();
  const utils = trpc.useUtils();

  const [selectedCorp, setSelectedCorp] = useState<string>("");
  const [targetRoles, setTargetRoles] = useState<string>("VP Sales, Market Research Manager, Director Market Intelligence");
  const [targetCount, setTargetCount] = useState<number>(5);

  const handleCreateJob = async () => {
    if (!selectedCorp) {
      alert("Bitte wählen Sie ein Unternehmen aus");
      return;
    }

    try {
      await createJobMutation.mutateAsync({
        corporationId: selectedCorp,
        targetRoles: targetRoles.split(",").map(r => r.trim()),
        targetCount,
        priority: 5
      });

      alert("Hunter Job erfolgreich erstellt!");
      setSelectedCorp("");
      utils.hunter.listJobs.invalidate();
      utils.hunter.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Erstellen des Jobs");
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  return (
    <main className="p-6">
      {/* Create Job Form */}
      <div className="bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Neuen Hunter Job erstellen</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Zielunternehmen</label>
            <select
              value={selectedCorp}
              onChange={(e) => setSelectedCorp(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">-- Unternehmen auswählen --</option>
              {corporations?.data?.map((corp) => (
                <option key={corp.id} value={corp.id}>
                  {corp.name} ({corp.headquartersCountry})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ziel-Rollen (kommagetrennt)</label>
            <input
              type="text"
              value={targetRoles}
              onChange={(e) => setTargetRoles(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="VP Sales, Market Research Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Anzahl Kontakte</label>
            <input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded"
              min={1}
              max={10}
            />
          </div>

          <button
            onClick={handleCreateJob}
            disabled={createJobMutation.isPending}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
          >
            {createJobMutation.isPending ? "Erstelle Job..." : "Job erstellen"}
          </button>
        </div>
      </div>

      {/* Target Companies List */}
      <div className="bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Verfügbare Zielunternehmen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Land</th>
                <th className="px-4 py-2 text-left">Branche</th>
                <th className="px-4 py-2 text-left">Umsatz (EUR)</th>
                <th className="px-4 py-2 text-left">Website</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {corporations?.data?.map((corp) => (
                <tr key={corp.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{corp.name}</td>
                  <td className="px-4 py-3">{corp.headquartersCountry}</td>
                  <td className="px-4 py-3">{corp.industry}</td>
                  <td className="px-4 py-3">
                    {corp.totalRevenueEur 
                      ? `€${(corp.totalRevenueEur / 1_000_000_000).toFixed(2)}B`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {corp.website && (
                      <a 
                        href={corp.website.startsWith("http") ? corp.website : `https://${corp.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:underline"
                      >
                        {corp.website.replace(/^https?:\/\//, "").replace(/^www\./, "")}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedCorp(corp.id)}
                      className="px-3 py-1 bg-black text-white text-xs hover:bg-gray-800"
                    >
                      Auswählen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 text-sm text-gray-600">
        <div className="font-semibold mb-2">🎯 Target Companies - Kontaktsuche starten</div>
        <p className="mb-2">
          Wählen Sie ein Zielunternehmen aus und definieren Sie die gewünschten Rollen. 
          Der Hunter Agent durchsucht Apollo.io und Hunter.io nach passenden Ansprechpartnern.
        </p>
        <p>
          <strong>Empfohlene Rollen:</strong> CEO, VP Sales, VP Marketing, Market Research Manager, 
          Director Market Intelligence, Head of Strategy
        </p>
      </div>
    </main>
  );
}

