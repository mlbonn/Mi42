import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
type EmailMessage = any;
import ComposeModal from '../components/ComposeModal';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { X, ChevronLeft } from 'lucide-react';

const FOLDERS = ['INBOX', 'Drafts', 'Sent', 'Trash', 'Spam'];

export default function Emails() {
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<string>('');

  // Handle URL parameters for compose
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compose = params.get('compose');
    const to = params.get('to');
    
    if (compose === 'true') {
      setIsComposeOpen(true);
      if (to) {
        setComposeTo(decodeURIComponent(to));
      }
      // Clear URL params after opening
      window.history.replaceState({}, '', '/emails');
    }
  }, []);

  // Fetch emails for the selected folder
  const { data: emails = [], isLoading, error } = trpc.emailClient.getEmails.useQuery(
    { folder: selectedFolder },
    { enabled: !!selectedFolder }
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return d.toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' });
    }
  };

  const getFolderIcon = (folder: string) => {
    const icons: { [key: string]: string } = {
      INBOX: '📥',
      Drafts: '✏️',
      Sent: '📤',
      Trash: '🗑️',
      Spam: '⚠️',
    };
    return icons[folder] || '📧';
  };

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT COLUMN - Folder Navigation (Hidden on Mobile) */}
      <div className="hidden lg:block w-56 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto flex-shrink-0">
        {/* E-Mails Section Header */}
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded mb-2"
          onClick={() => setFoldersExpanded(!foldersExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📧</span>
            <span className="font-semibold text-gray-800">Folders</span>
          </div>
          <span className={`transform transition-transform text-gray-600 ${foldersExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </div>

        {/* Folders List */}
        {foldersExpanded && (
          <div className="space-y-1">
            {(FOLDERS as any).map((folder: any) => (
              <button
                key={folder}
                onClick={() => {
                  setSelectedFolder(folder);
                  setSelectedEmail(null);
                }}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors text-sm ${
                  selectedFolder === folder
                    ? 'bg-gray-100 text-orange-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{getFolderIcon(folder)}</span>
                <span>{folder}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP: Resizable Panels (lg+) */}
      <div className="hidden lg:flex flex-1 gap-2">
        <PanelGroup direction="horizontal">
          {/* Email List Panel */}
          <Panel defaultSize={40} minSize={30}>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  {/* Folder Dropdown (Mobile only) */}
                  <select
                    value={selectedFolder}
                    onChange={(e: any) => {
                      setSelectedFolder(e.target.value);
                      setSelectedEmail(null);
                    }}
                    className="lg:hidden px-3 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {(FOLDERS as any).map((folder: any) => (
                      <option key={folder} value={folder}>
                        {getFolderIcon(folder)} {folder}
                      </option>
                    ))}
                  </select>
                  {/* Folder Title (Desktop only) */}
                  <h2 className="hidden lg:block text-lg font-semibold text-gray-800">{selectedFolder}</h2>
                  <button 
                    onClick={() => {
                      setComposeTo('');
                      setIsComposeOpen(true);
                    }}
                    className="px-3 py-1.5 bg-bl2020-orange text-white rounded text-sm hover:bg-bl2020-orange-dark font-semibold"
                  >
                    + Neue E-Mail
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="border-b border-gray-200 px-4 py-3">
                <input
                  type="text"
                  placeholder="E-Mails durchsuchen..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Laden...</div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500 text-sm">Fehler beim Laden der E-Mails</div>
                ) : (emails as any[]).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-3xl mb-2">📧</div>
                    <p className="font-semibold text-sm">Keine E-Mails in {selectedFolder}</p>
                  </div>
                ) : (
                  (emails as any).map((email: any) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`border-b border-gray-100 p-3 cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id
                          ? 'bg-gray-50 border-l-4 border-l-orange-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{email.from}</p>
                          <p className="text-gray-700 font-medium text-sm truncate">{email.subject}</p>
                          <p className="text-gray-600 text-xs truncate">{email.preview}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(email.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-orange-500 transition-colors cursor-col-resize" />

          {/* Email Detail Panel */}
          <Panel defaultSize={60} minSize={40}>
            {selectedEmail ? (
              <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden h-full">
                {/* Detail Header */}
                <div className="border-b border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm">E-Mail Details</h3>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-gray-600">Von:</p>
                      <p className="font-semibold text-gray-900 break-words">{selectedEmail.from}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">An:</p>
                      <p className="font-semibold text-gray-900 break-words">{selectedEmail.to}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Betreff:</p>
                      <p className="font-semibold text-gray-900 break-words">{selectedEmail.subject}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Datum:</p>
                      <p className="font-semibold text-gray-900 text-xs">
                        {new Date(selectedEmail.date).toLocaleString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-b border-gray-200 p-3 flex gap-2">
                  <button className="flex-1 px-2 py-1.5 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark text-xs font-semibold">
                    Antworten
                  </button>
                  <button className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-semibold">
                    Löschen
                  </button>
                </div>

                {/* Email Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="bg-gray-50 rounded border border-gray-200 p-4">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedEmail.preview}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-3xl mb-2">📧</p>
                  <p className="font-semibold text-sm">Wählen Sie eine E-Mail</p>
                  <p className="text-xs">um sie zu lesen</p>
                </div>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>

      {/* MOBILE/TABLET: Email List + Drawer (< lg) */}
      <div className="lg:hidden flex-1 flex flex-col">
        {/* Email List */}
        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full ${selectedEmail ? 'hidden' : 'flex'}`}>
          {/* Header */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Folder Dropdown */}
              <select
                value={selectedFolder}
                onChange={(e: any) => {
                  setSelectedFolder(e.target.value);
                  setSelectedEmail(null);
                }}
                className="px-3 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {(FOLDERS as any).map((folder: any) => (
                  <option key={folder} value={folder}>
                    {getFolderIcon(folder)} {folder}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setComposeTo('');
                  setIsComposeOpen(true);
                }}
                className="px-3 py-1.5 bg-bl2020-orange text-white rounded text-sm hover:bg-bl2020-orange-dark font-semibold"
              >
                + Neue E-Mail
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="border-b border-gray-200 px-4 py-3">
            <input
              type="text"
              placeholder="E-Mails durchsuchen..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Laden...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">Fehler beim Laden der E-Mails</div>
            ) : (emails as any[]).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-3xl mb-2">📧</div>
                <p className="font-semibold text-sm">Keine E-Mails in {selectedFolder}</p>
              </div>
            ) : (
              (emails as any).map((email: any) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="border-b border-gray-100 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{email.from}</p>
                      <p className="text-gray-700 font-medium text-sm truncate">{email.subject}</p>
                      <p className="text-gray-600 text-xs truncate">{email.preview}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(email.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Detail Drawer (Mobile/Tablet) */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header with Back Button */}
            <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center gap-3">
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-gray-800 text-sm flex-1 truncate">
                {selectedEmail.subject}
              </h3>
            </div>

            {/* Email Details */}
            <div className="border-b border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-gray-600">Von:</p>
                  <p className="font-semibold text-gray-900 break-words">{selectedEmail.from}</p>
                </div>
                <div>
                  <p className="text-gray-600">An:</p>
                  <p className="font-semibold text-gray-900 break-words">{selectedEmail.to}</p>
                </div>
                <div>
                  <p className="text-gray-600">Betreff:</p>
                  <p className="font-semibold text-gray-900 break-words">{selectedEmail.subject}</p>
                </div>
                <div>
                  <p className="text-gray-600">Datum:</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(selectedEmail.date).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-b border-gray-200 p-3 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark text-sm font-semibold">
                Antworten
              </button>
              <button className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-semibold">
                Löschen
              </button>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-50 rounded border border-gray-200 p-4">
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedEmail.preview}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setComposeTo('');
            window.history.replaceState({}, '', '/emails');
          }}
          mode="new"
          onSent={() => {
            setIsComposeOpen(false);
            setComposeTo('');
          }}
        />
      )}
    </div>
  );
}
