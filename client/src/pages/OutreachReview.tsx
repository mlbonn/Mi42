import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function OutreachReview() {
  const { data: drafts, isLoading } = trpc.outreach.getPendingDrafts.useQuery();
  const reviewMutation = trpc.outreach.reviewDraft.useMutation();
  const bulkReviewMutation = trpc.outreach.bulkReview.useMutation();
  const updateMutation = trpc.outreach.updateDraft.useMutation();
  const utils = trpc.useUtils();

  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "de" | "en" | "fr">("all");
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const handleReview = async (draftId: string, action: "approve" | "reject") => {
    try {
      await reviewMutation.mutateAsync({ draftId, action });
      utils.outreach.getPendingDrafts.invalidate();
      utils.outreach.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Review");
      console.error(error);
    }
  };

  const handleBulkReview = async (action: "approve" | "reject") => {
    if (selectedDrafts.size === 0) {
      alert("Bitte wählen Sie mindestens einen Draft aus");
      return;
    }

    if (!confirm(`${selectedDrafts.size} Drafts ${action === "approve" ? "genehmigen" : "ablehnen"}?`)) {
      return;
    }

    try {
      await bulkReviewMutation.mutateAsync({
        draftIds: Array.from(selectedDrafts),
        action,
      });
      setSelectedDrafts(new Set());
      utils.outreach.getPendingDrafts.invalidate();
      utils.outreach.getStats.invalidate();
    } catch (error) {
      alert("Fehler beim Bulk-Review");
      console.error(error);
    }
  };

  const handleEdit = (draft: any) => {
    setEditingDraft(draft.id);
    setEditSubject(draft.subject || "");
    setEditBody(draft.body || "");
  };

  const handleSaveEdit = async (draftId: string) => {
    try {
      await updateMutation.mutateAsync({
        draftId,
        subject: editSubject,
        body: editBody,
      });
      setEditingDraft(null);
      utils.outreach.getPendingDrafts.invalidate();
    } catch (error) {
      alert("Fehler beim Speichern");
      console.error(error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDrafts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === filteredDrafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(filteredDrafts.map((d) => d.id)));
    }
  };

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  const filteredDrafts =
    drafts?.filter((d) => {
      if (filter === "all") return true;
      return d.language === filter;
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
              <option value="all">Alle ({drafts?.length || 0})</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {selectedDrafts.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkReview("approve")}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-1 bg-[#E48F00] text-white text-sm hover:bg-[#c87e00] disabled:bg-gray-400"
              >
                {selectedDrafts.size} Genehmigen
              </button>
              <button
                onClick={() => handleBulkReview("reject")}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-1 bg-gray-600 text-white text-sm hover:bg-gray-800 disabled:bg-gray-400"
              >
                {selectedDrafts.size} Ablehnen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {filteredDrafts.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-400">
            Keine E-Mail-Drafts zur Review vorhanden
          </div>
        ) : (
          filteredDrafts.map((draft) => (
            <div key={draft.id} className="bg-white p-6 border-l-4 border-[#E48F00]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.has(draft.id)}
                    onChange={() => toggleSelect(draft.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    {editingDraft === draft.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500">Betreff:</label>
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full px-3 py-2 border rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Nachricht:</label>
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={12}
                            className="w-full px-3 py-2 border rounded mt-1 font-mono text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(draft.id)}
                            disabled={updateMutation.isPending}
                            className="px-4 py-1 bg-bl2020-orange text-white text-sm hover:bg-bl2020-orange-dark"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingDraft(null)}
                            className="px-4 py-1 bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-lg font-semibold">{draft.subject}</div>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs uppercase">
                            {draft.language}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          Kontakt: {draft.contactId?.substring(0, 8)}... | Konzern:{" "}
                          {draft.corporationId?.substring(0, 8)}...
                        </div>
                        <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap font-mono">
                          {draft.body}
                        </div>

                        {/* Personalization Context */}
                        {draft.personalizationData && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                            <div className="font-semibold mb-1">Personalisierungskontext:</div>
                            {(draft.personalizationData as any).news &&
                              (draft.personalizationData as any).news.length > 0 && (
                                <div className="mb-2">
                                  <strong>News:</strong>{" "}
                                  {(draft.personalizationData as any).news[0].title}
                                </div>
                              )}
                            {(draft.personalizationData as any).linkedinPosts &&
                              (draft.personalizationData as any).linkedinPosts.length > 0 && (
                                <div>
                                  <strong>LinkedIn:</strong>{" "}
                                  {(draft.personalizationData as any).linkedinPosts[0].text.substring(
                                    0,
                                    100
                                  )}
                                  ...
                                </div>
                              )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {editingDraft !== draft.id && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(draft)}
                      className="px-3 py-1 bg-gray-200 text-gray-800 text-xs hover:bg-gray-300"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleReview(draft.id, "approve")}
                      disabled={reviewMutation.isPending}
                      className="px-3 py-1 bg-[#E48F00] text-white text-xs hover:bg-[#c87e00] disabled:bg-gray-400"
                    >
                      Genehmigen
                    </button>
                    <button
                      onClick={() => handleReview(draft.id, "reject")}
                      disabled={reviewMutation.isPending}
                      className="px-3 py-1 bg-gray-600 text-white text-xs hover:bg-gray-800 disabled:bg-gray-400"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 text-sm text-gray-600">
        <div className="font-semibold mb-2">Review Queue - E-Mail-Drafts genehmigen</div>
        <p className="mb-2">
          Prüfen Sie die vom Outreach Agent generierten E-Mails. Sie können Betreff und Text 
          bearbeiten, bevor Sie die E-Mails genehmigen. Genehmigte E-Mails werden zum Versand 
          freigegeben.
        </p>
        <p>
          <strong>Personalisierung:</strong> Jede E-Mail wurde basierend auf aktuellen News, 
          LinkedIn-Posts und Unternehmensdaten generiert. Der Kontext wird unter jedem Draft angezeigt.
        </p>
      </div>
    </main>
  );
}

