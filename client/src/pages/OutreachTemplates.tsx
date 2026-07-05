import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';

export default function OutreachTemplates() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates, isLoading, refetch } = (trpc as any).templates.list.useQuery();
  const createMutation = (trpc as any).templates.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
    },
  });
  const updateMutation = (trpc as any).templates.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTemplate(null);
    },
  });
  const deleteMutation = (trpc as any).templates.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      subject: formData.get('subject') as string,
      body: formData.get('body') as string,
      language: formData.get('language') as string || 'de',
      category: formData.get('category') as string,
      variables: (formData.get('variables') as string)?.split(',').map(v => v.trim()).filter(Boolean),
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingTemplate.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      subject: formData.get('subject') as string,
      body: formData.get('body') as string,
      language: formData.get('language') as string,
      category: formData.get('category') as string,
      variables: (formData.get('variables') as string)?.split(',').map(v => v.trim()).filter(Boolean),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Template wirklich löschen?')) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">E-Mail-Vorlagen</h1>
            <p className="text-sm text-gray-600 mt-1">
              Verwalte wiederverwendbare E-Mail-Templates für Outreach-Kampagnen
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neue Vorlage
          </button>
        </div>

        {/* Templates Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Betreff
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Sprache
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Variablen
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates?.map((template: any) => (
                <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700 truncate max-w-xs">{template.subject}</div>
                  </td>
                  <td className="px-4 py-3">
                    {template.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {template.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 uppercase">{template.language || 'de'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(typeof template.variables === 'string' 
                        ? JSON.parse(template.variables || '[]')
                        : template.variables || []
                      ).map((v: string) => (
                        <span key={v} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-gray-50 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!templates || templates.length === 0) && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Noch keine Vorlagen erstellt</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Erste Vorlage erstellen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Neue E-Mail-Vorlage</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="z.B. Cold Outreach - Bauindustrie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  name="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Kurze Beschreibung der Vorlage"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    name="category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Keine</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="introduction">Vorstellung</option>
                    <option value="meeting_request">Meeting-Anfrage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sprache</label>
                  <select
                    name="language"
                    defaultValue="de"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff *</label>
                <input
                  type="text"
                  name="subject"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="z.B. Zusammenarbeit mit {{companyName}}"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Text *</label>
                <textarea
                  name="body"
                  required
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  placeholder="Sehr geehrte/r {{firstName}} {{lastName}},&#10;&#10;ich bin auf {{companyName}} aufmerksam geworden..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variablen (kommagetrennt)
                </label>
                <input
                  type="text"
                  name="variables"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="firstName, lastName, companyName, position"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Diese Variablen können im Text mit {`{{variableName}}`} verwendet werden
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Erstellen...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Vorlage bearbeiten</h2>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingTemplate.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingTemplate.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    name="category"
                    defaultValue={editingTemplate.category || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Keine</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="introduction">Vorstellung</option>
                    <option value="meeting_request">Meeting-Anfrage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sprache</label>
                  <select
                    name="language"
                    defaultValue={editingTemplate.language || 'de'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff *</label>
                <input
                  type="text"
                  name="subject"
                  required
                  defaultValue={editingTemplate.subject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Text *</label>
                <textarea
                  name="body"
                  required
                  rows={10}
                  defaultValue={editingTemplate.body}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variablen (kommagetrennt)
                </label>
                <input
                  type="text"
                  name="variables"
                  defaultValue={
                    typeof editingTemplate.variables === 'string'
                      ? JSON.parse(editingTemplate.variables || '[]').join(', ')
                      : (editingTemplate.variables || []).join(', ')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
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

