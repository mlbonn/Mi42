import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { 
  Mail, 
  Smile, 
  Meh, 
  Frown, 
  ThumbsUp, 
  ThumbsDown,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  FileText
} from 'lucide-react';

type Sentiment = 'positive' | 'neutral' | 'negative' | 'interested' | 'not_interested';

export default function OutreachResponses() {
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | 'all'>('all');
  const [showActionRequired, setShowActionRequired] = useState(false);
  const [editingResponse, setEditingResponse] = useState<any>(null);

  const { data: allResponses, isLoading, refetch } = trpc.responses.list.useQuery();
  
  const updateMutation = trpc.responses.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingResponse(null);
    },
  });

  const markProcessedMutation = trpc.responses.markProcessed.useMutation({
    onSuccess: () => refetch(),
  });

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingResponse.id,
      sentiment: formData.get('sentiment') as Sentiment,
      requiresAction: formData.get('requiresAction') === 'true',
      actionType: formData.get('actionType') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    });
  };

  const handleMarkProcessed = (id: string) => {
    markProcessedMutation.mutate({ id });
  };

  const filteredResponses = allResponses?.filter((r: any) => {
    if (selectedSentiment !== 'all' && r.sentiment !== selectedSentiment) return false;
    if (showActionRequired && !r.requiresAction) return false;
    return true;
  });

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    
    const styles = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-gray-100 text-gray-800',
      negative: 'bg-red-100 text-red-800',
      interested: 'bg-blue-100 text-blue-800',
      not_interested: 'bg-orange-100 text-orange-800',
    };
    const icons = {
      positive: Smile,
      neutral: Meh,
      negative: Frown,
      interested: ThumbsUp,
      not_interested: ThumbsDown,
    };
    const labels = {
      positive: 'Positiv',
      neutral: 'Neutral',
      negative: 'Negativ',
      interested: 'Interessiert',
      not_interested: 'Nicht interessiert',
    };
    
    const Icon = icons[sentiment as keyof typeof icons];
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[sentiment as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        {labels[sentiment as keyof typeof labels]}
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
          <h1 className="text-2xl font-semibold text-gray-900">E-Mail-Antworten</h1>
          <p className="text-sm text-gray-600 mt-1">
            Verwalte eingehende Antworten auf Outreach-Kampagnen
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Sentiment Filter */}
          <div className="flex gap-2">
            {(['all', 'positive', 'interested', 'neutral', 'negative', 'not_interested'] as const).map((sentiment) => {
              const count = sentiment === 'all' 
                ? allResponses?.length || 0
                : allResponses?.filter((r: any) => r.sentiment === sentiment).length || 0;
              
              return (
                <button
                  key={sentiment}
                  onClick={() => setSelectedSentiment(sentiment)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSentiment === sentiment
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {sentiment === 'all' && 'Alle'}
                  {sentiment === 'positive' && 'Positiv'}
                  {sentiment === 'neutral' && 'Neutral'}
                  {sentiment === 'negative' && 'Negativ'}
                  {sentiment === 'interested' && 'Interessiert'}
                  {sentiment === 'not_interested' && 'Nicht interessiert'}
                  <span className="ml-2 text-xs opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Action Required Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActionRequired(!showActionRequired)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showActionRequired
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              Nur Aktion erforderlich
              <span className="ml-1 text-xs opacity-75">
                ({allResponses?.filter((r: any) => r.requiresAction).length || 0})
              </span>
            </button>
          </div>
        </div>

        {/* Responses List */}
        <div className="space-y-4">
          {filteredResponses?.map((response: any) => (
            <div key={response.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">{response.subject || '(Kein Betreff)'}</h3>
                    {getSentimentBadge(response.sentiment)}
                    {response.requiresAction && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <AlertCircle className="h-3 w-3" />
                        Aktion erforderlich
                      </span>
                    )}
                    {response.processedBy && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Bearbeitet
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {response.contactId && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Kontakt: {response.contactId.slice(0, 8)}...</span>
                      </div>
                    )}
                    {response.receivedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(response.receivedAt).toLocaleString('de-DE')}</span>
                      </div>
                    )}
                    {response.actionType && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{response.actionType}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingResponse(response)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Bearbeiten
                  </button>
                  {!response.processedBy && (
                    <button
                      onClick={() => handleMarkProcessed(response.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Als bearbeitet markieren
                    </button>
                  )}
                </div>
              </div>

              {/* Body Preview */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {response.body || '(Kein Inhalt)'}
              </div>

              {/* Notes */}
              {response.notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-900 uppercase mb-1">Notizen</div>
                  <div className="text-sm text-blue-800">{response.notes}</div>
                </div>
              )}

              {response.processedBy && (
                <div className="mt-3 text-xs text-gray-500">
                  Bearbeitet von: {response.processedBy.slice(0, 8)}... am {new Date(response.processedAt).toLocaleString('de-DE')}
                </div>
              )}
            </div>
          ))}

          {(!filteredResponses || filteredResponses.length === 0) && (
            <div className="text-center py-12 bg-white rounded-lg">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Keine Antworten gefunden</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Antwort bearbeiten</h2>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
                <select
                  name="sentiment"
                  defaultValue={editingResponse.sentiment || 'neutral'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="positive">Positiv</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negativ</option>
                  <option value="interested">Interessiert</option>
                  <option value="not_interested">Nicht interessiert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktion erforderlich?</label>
                <select
                  name="requiresAction"
                  defaultValue={editingResponse.requiresAction ? 'true' : 'false'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="false">Nein</option>
                  <option value="true">Ja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Art der Aktion</label>
                <input
                  type="text"
                  name="actionType"
                  defaultValue={editingResponse.actionType || ''}
                  placeholder="z.B. Follow-up anrufen, Meeting vereinbaren"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={editingResponse.notes || ''}
                  placeholder="Interne Notizen zu dieser Antwort..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingResponse(null)}
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
    </div>
  );
}

