import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import type { EmailMessage } from '../../../server/emailService';
import { useSearch } from 'wouter';
import ComposeModal from '../components/ComposeModal';
import ArchiveModal from '../components/ArchiveModal';

// Helper function to extract email address from various formats
const extractEmailAddress = (addr: any): string | null => {
  if (!addr) return null;
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object' && addr.email) return addr.email;
  return null;
};

// Helper function to render email addresses with contact names
const renderEmailAddress = (addr: any, contactMap: Record<string, string>): string => {
  if (!addr) return 'Unknown';
  
  const email = extractEmailAddress(addr);
  if (email && contactMap[email]) {
    return contactMap[email];
  }
  
  if (typeof addr === 'string') return addr;
  if (Array.isArray(addr)) {
    return addr.map(a => {
      const e = extractEmailAddress(a);
      if (e && contactMap[e]) return contactMap[e];
      return (typeof a === 'string' ? a : (a.name || a.email));
    }).join(', ');
  }
  return addr.name || addr.email || 'Unknown';
};

// Helper function to render email address with both name and email
const renderEmailWithAddress = (addr: any, contactMap: Record<string, string>): string => {
  if (!addr) return 'Unknown';
  
  const email = extractEmailAddress(addr);
  if (email && contactMap[email]) {
    return `${contactMap[email]} <${email}>`;
  }
  
  if (typeof addr === 'string') return addr;
  if (Array.isArray(addr)) {
    return addr.map(a => {
      const e = extractEmailAddress(a);
      if (e && contactMap[e]) return `${contactMap[e]} <${e}>`;
      return (typeof a === 'string' ? a : (a.name ? `${a.name} <${a.email}>` : a.email));
    }).join(', ');
  }
  
  if (addr.name && addr.email) {
    return `${addr.name} <${addr.email}>`;
  }
  return addr.email || addr.name || 'Unknown';
};

export default function Emails() {
  const search = useSearch(); // Tracks query string changes
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  
  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  
  // Archive Modal State
  const [archiveOpen, setArchiveOpen] = useState(false);
  
  // Selected email full data
  const [selectedEmailData, setSelectedEmailData] = useState<EmailMessage | null>(null);
  
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

  // Extract all unique email addresses from emails
  const allEmailAddresses = useMemo(() => {
    if (!data?.emails) return [];
    const addresses = new Set<string>();
    data.emails.forEach((email: EmailMessage) => {
      const from = extractEmailAddress(email.from);
      if (from) addresses.add(from);
      
      const to = Array.isArray(email.to) ? email.to : [email.to];
      to.forEach((t: any) => {
        const addr = extractEmailAddress(t);
        if (addr) addresses.add(addr);
      });
      
      if (email.cc) {
        const cc = Array.isArray(email.cc) ? email.cc : [email.cc];
        cc.forEach((c: any) => {
          const addr = extractEmailAddress(c);
          if (addr) addresses.add(addr);
        });
      }
    });
    return Array.from(addresses);
  }, [data?.emails]);

  // Fetch contacts for all email addresses
  const { data: contactsData } = trpc.emailClient.findContactsByEmails.useQuery(
    { emails: allEmailAddresses },
    { enabled: allEmailAddresses.length > 0 }
  );

  // Create a map of email -> contact name
  const contactMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (contactsData) {
      Object.entries(contactsData).forEach(([email, contacts]) => {
        if (contacts && contacts.length > 0) {
          map[email] = contacts[0].name;
        }
      });
    }
    return map;
  }, [contactsData]);

  const emails = data?.emails || [];
  
  // Fetch full email data when an email is selected
  const { data: fullEmailData } = trpc.emailClient.getEmail.useQuery(
    { uid: selectedEmailId || '', folder: currentFolder },
    { enabled: !!selectedEmailId }
  );
  
  // Update selectedEmailData when fullEmailData changes
  useEffect(() => {
    if (fullEmailData) {
      setSelectedEmailData(fullEmailData as EmailMessage);
    }
  }, [fullEmailData]);
  
  const selectedEmail = selectedEmailData || emails.find((e: EmailMessage) => e.id === selectedEmailId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleCompose = (mode: 'new' | 'reply' | 'replyAll' | 'forward') => {
    setComposeMode(mode);
    setComposeOpen(true);
  };

  const handleComposeSent = () => {
    setComposeOpen(false);
    refetch();
  };

  return (
    <>
      <div className="flex h-screen bg-white">
        {/* LEFT COLUMN - Email List (Small - 35% width) */}
        <div className="w-[35%] border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">{currentFolder}</h2>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Suchen..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Lade E-Mails...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">Fehler beim Laden der E-Mails</div>
            ) : emails.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Keine E-Mails vorhanden</div>
            ) : (
              emails.map((email: EmailMessage) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  className={`border-b border-gray-100 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEmailId === email.id
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{renderEmailAddress(email.from, contactMap)}</p>
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
          <div className="w-[65%] flex flex-col">
            {/* Action Buttons */}
            <div className="border-b border-gray-200 p-3 bg-white flex gap-2 items-center">
              <button
                onClick={() => handleCompose('new')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                + Neu
              </button>
              <button
                onClick={() => handleCompose('reply')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Reply
              </button>
              <button
                onClick={() => handleCompose('replyAll')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Reply All
              </button>
              <button
                onClick={() => handleCompose('forward')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Forward
              </button>
              <button
                onClick={() => {/* TODO: Delete */}}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setArchiveOpen(true)}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                📁 Archivieren
              </button>
            </div>

            {selectedEmail && (
              <>
                {/* Compact Header */}
                <div className="border-b border-gray-200 p-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">VON</p>
                      <p className="font-semibold text-gray-900 text-sm">{renderEmailWithAddress(selectedEmail.from, contactMap)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">AN</p>
                      <p className="font-semibold text-gray-900 text-sm">{renderEmailWithAddress(selectedEmail.to, contactMap)}</p>
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
                        {selectedEmail.attachments.map((att: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            📎 {att.filename || `Anhang ${idx + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  {(fullEmailData?.html || selectedEmail.html) ? (
                    <iframe
                      srcDoc={fullEmailData?.html || selectedEmail.html}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin"
                      title="Email Content"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {fullEmailData?.text || selectedEmail.text || 'Kein Inhalt verfügbar'}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-[65%] flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">📧</div>
              <p className="text-xl">Wählen Sie eine E-Mail</p>
              <p className="text-sm mt-2">um sie zu lesen</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        mode={composeMode}
        email={selectedEmail}
        onSent={handleComposeSent}
      />
      
      {/* Archive Modal */}
      {archiveOpen && selectedEmailId && (
        <ArchiveModal
          emailId={selectedEmailId}
          email={(selectedEmailData || selectedEmail) ? { 
            from: (selectedEmailData || selectedEmail).from?.email || (selectedEmailData || selectedEmail).from || '',
            fromName: (selectedEmailData || selectedEmail).from?.name || '',
            to: (selectedEmailData || selectedEmail).to || '',
            subject: (selectedEmailData || selectedEmail).subject || '',
            body: (selectedEmailData || selectedEmail).body || (selectedEmailData || selectedEmail).text || '',
            html: (selectedEmailData || selectedEmail).html || '',
            date: (selectedEmailData || selectedEmail).date || new Date().toISOString(),
            attachments: (selectedEmailData || selectedEmail).attachments || [],
          } : undefined}
          fromAddress={selectedEmail?.from?.email || selectedEmail?.from || ""}
          ccAddresses={Array.isArray(selectedEmail?.cc) ? selectedEmail.cc.map((c: any) => typeof c === "object" ? c.email : c) : []}
          onClose={() => setArchiveOpen(false)}
          onSuccess={() => {
            setArchiveOpen(false);
            refetch();
          }}
        />
      )}
    </>
  );
}
