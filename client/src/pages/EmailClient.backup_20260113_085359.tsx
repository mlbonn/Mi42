import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import type { EmailMessage } from '../../../server/emailService';
import { useSearch } from 'wouter';

export default function Emails() {
  const search = useSearch(); // Tracks query string changes
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  
  // Update currentFolder when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(search);
    const folder = urlParams.get('folder') || 'INBOX';
    console.log('[EmailClient] URL changed, new folder:', folder);
    setCurrentFolder(folder);
    setSelectedEmailId(null); // Clear selection when folder changes
  }, [search]);

  // Fetch emails for the current folder
  const { data, isLoading, error, refetch } = trpc.emailClient.getEmails.useQuery(
    { folder: currentFolder },
    { 
      enabled: true,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  // Force refetch when folder changes
  useEffect(() => {
    refetch();
  }, [currentFolder, refetch]);

  const emails = data?.emails || [];

  // Fetch single email with body when selected
  const { data: selectedEmailData, isLoading: emailLoading } = trpc.emailClient.getEmail.useQuery(
    { 
      folder: currentFolder, 
      uid: selectedEmailId || '' 
    },
    { 
      enabled: !!selectedEmailId,
      staleTime: 0,
    }
  );

  const selectedEmail = selectedEmailData || null;

  // Mutations
  const sendEmailMutation = trpc.emailClient.sendEmail.useMutation();
  const moveEmailMutation = trpc.emailClient.moveEmail.useMutation();

  const handleReply = () => {
    if (!selectedEmail) return;
    const to = selectedEmail.from;
    const subject = `Re: ${selectedEmail.subject}`;
    const body = `\n\n---\nAm ${new Date(selectedEmail.date).toLocaleString('de-DE')} schrieb ${selectedEmail.fromName}:\n${selectedEmail.body}`;
    const recipient = prompt('An:', to);
    if (recipient) {
      sendEmailMutation.mutate({ to: recipient, subject, body });
    }
  };

  const handleReplyAll = () => {
    if (!selectedEmail) return;
    alert('Reply All - TODO: Implement compose modal');
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    alert('Forward - TODO: Implement compose modal');
  };

  const handleDelete = () => {
    if (!selectedEmail) return;
    if (confirm('E-Mail löschen?')) {
      moveEmailMutation.mutate({
        messageIds: [selectedEmail.id],
        targetFolder: 'Trash',
      });
      setSelectedEmailId(null);
      refetch();
    }
  };

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

  return (
    <div className="flex gap-4 h-full">
      {/* LEFT COLUMN - Email List (Wider - 35% width) */}
      <div className="w-[35%] bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-800">{currentFolder}</h2>
            <button className="px-2 py-1 bg-bl2020-orange text-white rounded text-xs hover:bg-bl2020-orange-dark font-semibold">
              + Neu
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-b border-gray-200 px-3 py-2">
          <input
            type="text"
            placeholder="Suchen..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500 text-xs">Laden...</div>
          ) : error ? (
            <div className="p-3 text-center text-red-500 text-xs">Fehler beim Laden</div>
          ) : emails.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="text-2xl mb-1">📧</div>
              <p className="font-semibold text-xs">Keine E-Mails</p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmailId(email.id)}
                className={`border-b border-gray-100 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedEmailId === email.id
                    ? 'bg-gray-50 border-l-4 border-l-orange-600'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{email.fromName || email.from}</p>
                    <p className="text-gray-700 text-xs truncate font-medium mt-1">{email.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {email.hasAttachments && <span className="text-gray-400 text-xs">📎</span>}
                    <p className="text-gray-500 text-xs whitespace-nowrap">{formatDate(email.date)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN - Email Detail (Large - 65% width) */}
      {selectedEmailId ? (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          {emailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500 text-sm">Laden...</div>
            </div>
          ) : selectedEmail ? (
            <>
              {/* Action Buttons - Above Header */}
              <div className="border-b border-gray-200 p-3 bg-white flex gap-2 items-center">
                <button onClick={handleReply} className="px-3 py-1.5 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark text-sm font-semibold">
                  Reply
                </button>
                <button onClick={handleReplyAll} className="px-3 py-1.5 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark text-sm font-semibold">
                  Reply All
                </button>
                <button onClick={handleForward} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-semibold">
                  Forward
                </button>
                <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold">
                  Delete
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setSelectedEmailId(null)}
                  className="text-gray-500 hover:text-gray-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Compact Header */}
              <div className="border-b border-gray-200 p-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold">VON</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedEmail.fromName || selectedEmail.from}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-semibold">AN</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedEmail.to}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-600 text-xs font-semibold">BETREFF</p>
                  <p className="font-semibold text-gray-900 text-sm">{selectedEmail.subject}</p>
                </div>
                <div className="mt-2">
                  <p className="text-gray-600 text-xs font-semibold">DATUM</p>
                  <p className="text-gray-900 text-sm">
                    {new Date(selectedEmail.date).toLocaleString('de-DE')}
                  </p>
                </div>
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-xs font-semibold mb-1">ANHÄNGE ({selectedEmail.attachments.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 border border-gray-300"
                        >
                          <span>📎</span>
                          <span>{att.filename}</span>
                          <span className="text-gray-500">({Math.round(att.size / 1024)} KB)</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white">
                  {selectedEmail.html ? (
                    <div
                      className="text-gray-700 leading-relaxed text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                      {selectedEmail.body}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-red-500">
                <p className="font-semibold">Fehler beim Laden der E-Mail</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-5xl mb-3">📧</p>
            <p className="font-semibold text-lg">Wählen Sie eine E-Mail</p>
            <p className="text-sm">um sie zu lesen</p>
          </div>
        </div>
      )}
    </div>
  );
}
