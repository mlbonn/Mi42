import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Send, 
  Edit, 
  Trash2, 
  Eye,
  Clock,
  User,
  Building2
} from 'lucide-react';

type DraftStatus = 'pending' | 'approved' | 'rejected' | 'sent';

export default function OutreachDrafts() {
  const [selectedStatus, setSelectedStatus] = useState<DraftStatus | 'all'>('all');
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [previewDraft, setPreviewDraft] = useState<any>(null);

  const { data: allDrafts, isLoading, refetch } = trpc.drafts.list.useQuery();
  
  const updateMutation = trpc.drafts.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingDraft(null);
    },
  });

  const approveMutation = trpc.drafts.approve.useMutation({
    onSuccess: () => refetch(),
  });

  const rejectMutation = trpc.drafts.reject.useMutation({
    onSuccess: () => refetch(),
  });

  const sendMutation = trpc.drafts.send.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.drafts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingDraft.id,
      subject: formData.get('subject') as string,
      body: formData.get('body') as string,
    });
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id });
  };

  const handleReject = (id: string) => {
    if (confirm('Draft wirklich ablehnen?')) {
      rejectMutation.mutate({ id });
    }
  };

  const handleSend = (id: string) => {
    if (confirm('E-Mail jetzt versenden?')) {
      sendMutation.mutate({ id });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Draft wirklich löschen?')) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredDrafts = selectedStatus === 'all' 
    ? allDrafts 
    : allDrafts?.filter((d: any) => d.reviewStatus === selectedStatus);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      sent: 'bg-blue-100 text-blue-800',
    };
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      sent: Send,
    };
    const Icon = icons[status as keyof typeof icons];
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        {status === 'pending' && 'Ausstehend'}
        {status === 'approved' && 'Genehmigt'}
        {status === 'rejected' && 'Abgelehnt'}
        {status === 'sent' && 'Gesendet'}
      </span>
    );
  };

  if (isLoading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">E-Mail-Entwürfe</h1>
          <p className="text-sm text-gray-600 mt-1">
            Überprüfe und genehmige automatisch generierte E-Mail-Entwürfe
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected', 'sent'] as const).map((status) => {
            const count = status === 'all' 
              ? allDrafts?.length || 0
              : allDrafts?.filter((d: any) => d.reviewStatus === status).length || 0;
            
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'all' && 'Alle'}
                {status === 'pending' && 'Ausstehend'}
                {status === 'approved' && 'Genehmigt'}
                {status === 'rejected' && 'Abgelehnt'}
                {status === 'sent' && 'Gesendet'}
                <span className="ml-2 text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Drafts List */}
        <div className="space-y-4">
          {filteredDrafts?.map((draft: any) => (
            <div key={draft.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">{draft.subject || '(Kein Betreff)'}</h3>
                    {getStatusBadge(draft.reviewStatus)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {draft.contactId && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Kontakt ID: {draft.contactId.slice(0, 8)}...</span>
                      </div>
                    )}
                    {draft.corporationId && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>Firma ID: {draft.corporationId.slice(0, 8)}...</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(draft.createdAt).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDraft(draft)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Vorschau"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {draft.reviewStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => setEditingDraft(draft)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(draft.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Genehmigen"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(draft.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Ablehnen"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {draft.reviewStatus === 'approved' && (
                    <button
                      onClick={() => handleSend(draft.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <Send className="h-4 w-4" />
                      Senden
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body Preview */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                {draft.body || '(Kein Inhalt)'}
              </div>

              {draft.reviewedBy && (
                <div className="mt-3 text-xs text-gray-500">
                  Überprüft von: {draft.reviewedBy.slice(0, 8)}... am {new Date(draft.reviewedAt).toLocaleString('de-DE')}
                </div>
              )}
            </div>
          ))}

          {(!filteredDrafts || filteredDrafts.length === 0) && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Entwürfe gefunden</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Entwurf bearbeiten</h2>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
                <input
                  type="text"
                  name="subject"
                  defaultValue={editingDraft.subject || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Text</label>
                <textarea
                  name="body"
                  rows={15}
                  defaultValue={editingDraft.body || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Vorschau</h2>
              {getStatusBadge(previewDraft.reviewStatus)}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Betreff</div>
                <div className="text-lg font-medium text-gray-900">{previewDraft.subject || '(Kein Betreff)'}</div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">Nachricht</div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                  {previewDraft.body || '(Kein Inhalt)'}
                </div>
              </div>
              {previewDraft.reviewedBy && (
                <div className="border-t pt-4 text-sm text-gray-600">
                  <div><strong>Überprüft von:</strong> {previewDraft.reviewedBy}</div>
                  <div><strong>Am:</strong> {new Date(previewDraft.reviewedAt).toLocaleString('de-DE')}</div>
                </div>
              )}
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setPreviewDraft(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

