/**
 * FRIDAY CRM - Outreach Email Drafts
 * Review and approve GPT-4 generated email drafts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  CheckCircle, 
  XCircle,
  Edit,
  Send,
  Eye
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmailDraft {
  id: string;
  campaignId: string | null;
  contactId: string | null;
  corporationId: string | null;
  subject: string;
  body: string;
  language: string;
  personalizationData: any;
  reviewStatus: "pending" | "approved" | "rejected" | "sent";
  reviewedBy: string | null;
  reviewedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  // Joined data
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  campaignName?: string;
}

export default function OutreachEmailDrafts() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [previewDraft, setPreviewDraft] = useState<EmailDraft | null>(null);
  const [editDraft, setEditDraft] = useState<EmailDraft | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  // Fetch drafts
  const { data: drafts = [], isLoading } = useQuery<EmailDraft[]>({
    queryKey: ["/api/outreach/drafts"],
  });

  // Approve drafts mutation
  const approveDraftsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/outreach/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/drafts"] });
      setSelectedIds(new Set());
    },
  });

  // Reject drafts mutation
  const rejectDraftsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/outreach/drafts/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/drafts"] });
      setSelectedIds(new Set());
    },
  });

  // Update draft mutation
  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, subject, body }: { id: string; subject: string; body: string }) => {
      const res = await fetch(`/api/outreach/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/drafts"] });
      setEditDraft(null);
    },
  });

  // Filter drafts
  const filteredDrafts = drafts.filter(d => {
    if (filterStatus !== "all" && d.reviewStatus !== filterStatus) return false;
    return true;
  });

  // Stats
  const stats = {
    total: drafts.length,
    pending: drafts.filter(d => d.reviewStatus === "pending").length,
    approved: drafts.filter(d => d.reviewStatus === "approved").length,
    rejected: drafts.filter(d => d.reviewStatus === "rejected").length,
    sent: drafts.filter(d => d.reviewStatus === "sent").length,
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  // Open edit dialog
  const openEditDialog = (draft: EmailDraft) => {
    setEditDraft(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  // Save edit
  const saveEdit = () => {
    if (!editDraft) return;
    updateDraftMutation.mutate({
      id: editDraft.id,
      subject: editSubject,
      body: editBody,
    });
  };

  return (
    <div className="container py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Mail Drafts</h1>
          <p className="text-sm text-gray-600">Von GPT-4 generierte E-Mail-Entwürfe zur Review</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("pending")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("approved")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("rejected")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus("sent")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.sent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-blue-200 bg-gray-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} Draft{selectedIds.size > 1 ? "s" : ""} ausgewählt
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => approveDraftsMutation.mutate(Array.from(selectedIds))}
                  disabled={approveDraftsMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => rejectDraftsMutation.mutate(Array.from(selectedIds))}
                  disabled={rejectDraftsMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drafts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filterStatus === "all" ? "All Drafts" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Drafts`}
            <span className="ml-2 text-sm font-normal text-gray-500">({filteredDrafts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredDrafts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Keine Drafts gefunden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3">
                      <Checkbox
                        checked={selectedIds.size === filteredDrafts.length && filteredDrafts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Empfänger</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Betreff</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Kampagne</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Erstellt</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrafts.map((draft) => (
                    <tr key={draft.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <Checkbox
                          checked={selectedIds.has(draft.id)}
                          onCheckedChange={() => toggleSelection(draft.id)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{draft.contactName || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{draft.contactEmail || "-"}</div>
                        <div className="text-xs text-gray-500">{draft.companyName || "-"}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium line-clamp-2 max-w-md">{draft.subject}</div>
                      </td>
                      <td className="py-3 px-3">
                        {draft.campaignName ? (
                          <Badge variant="outline">{draft.campaignName}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {draft.reviewStatus === "pending" && <Badge variant="secondary">Pending</Badge>}
                        {draft.reviewStatus === "approved" && <Badge className="bg-green-600">Approved</Badge>}
                        {draft.reviewStatus === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                        {draft.reviewStatus === "sent" && <Badge className="bg-bl2020-orange">Sent</Badge>}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {new Date(draft.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewDraft(draft)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {draft.reviewStatus === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(draft)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewDraft} onOpenChange={() => setPreviewDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {previewDraft?.contactName} ({previewDraft?.contactEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-600">Betreff</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                {previewDraft?.subject}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Nachricht</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                {previewDraft?.body}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDraft(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDraft} onOpenChange={() => setEditDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email bearbeiten</DialogTitle>
            <DialogDescription>
              {editDraft?.contactName} ({editDraft?.contactEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-subject">Betreff</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-body">Nachricht</Label>
              <Textarea
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDraft(null)}>
              Abbrechen
            </Button>
            <Button onClick={saveEdit} disabled={updateDraftMutation.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

