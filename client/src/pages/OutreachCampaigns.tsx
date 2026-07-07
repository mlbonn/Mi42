import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";

export default function OutreachCampaigns() {
  const { data: campaigns, isLoading } = trpc.outreach.listCampaigns.useQuery();
  const createMutation = trpc.outreach.createCampaign.useMutation();
  const utils = trpc.useUtils();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetSegment: "",
    language: "de",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync(formData);
      setShowCreateForm(false);
      setFormData({ name: "", description: "", targetSegment: "", language: "de" });
      utils.outreach.listCampaigns.invalidate();
      utils.outreach.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Erstellen der Kampagne");
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  return (
    <main className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">Gesamt: {campaigns?.length || 0} Kampagnen</div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-black text-white hover:bg-gray-800"
        >
          {showCreateForm ? "Abbrechen" : "+ Neue Kampagne"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Neue Kampagne erstellen</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded"
                placeholder="Q1 2025 - DACH Market Outreach"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded"
                placeholder="Zielunternehmen und Kampagnenziele..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zielgruppe</label>
                <input
                  type="text"
                  value={formData.targetSegment}
                  onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="VP Sales, Market Research Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sprache</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
              >
                Kampagne erstellen
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Beschreibung</th>
                <th className="px-4 py-2 text-left">Zielgruppe</th>
                <th className="px-4 py-2 text-left">Sprache</th>
                <th className="px-4 py-2 text-left">Erstellt</th>
                <th className="px-4 py-2 text-left">Gestartet</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {campaigns?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Kampagnen vorhanden
                  </td>
                </tr>
              ) : (
                campaigns?.map((campaign) => (
                  <tr key={campaign.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {campaign.status === "active" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Aktiv
                        </span>
                      )}
                      {campaign.status === "draft" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          Entwurf
                        </span>
                      )}
                      {campaign.status === "paused" && (
                        <span className="px-2 py-1 bg-gray-100 text-orange-800 rounded text-xs">
                          Pausiert
                        </span>
                      )}
                      {campaign.status === "completed" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          Abgeschlossen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{campaign.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {campaign.description
                        ? campaign.description.substring(0, 60) + "..."
                        : "-"}
                    </td>
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
        <div className="font-semibold mb-2">Kampagnen verwalten</div>
        <p className="mb-2">
          Erstellen Sie E-Mail-Kampagnen für verschiedene Zielmärkte und Zielgruppen. Jede 
          Kampagne kann in einer anderen Sprache verfasst werden.
        </p>
        <p>
          <strong>Status:</strong> Entwurf (noch nicht gestartet) → Aktiv (E-Mails werden generiert) 
          → Pausiert (vorübergehend gestoppt) → Abgeschlossen (alle E-Mails versendet)
        </p>
      </div>
    </main>
  );
}

