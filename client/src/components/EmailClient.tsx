// client/components/EmailClient.tsx
// Gmail-Style E-Mail-Client Hauptkomponente

import React, { useState } from 'react';
import { useMessages, useFolders, useEmailAccounts } from '../hooks/useEmails';
import { EmailList } from './EmailList';
import { EmailDetail } from './EmailDetail';
import { FolderList } from './FolderList';
import { EmailAccountSelector } from './EmailAccountSelector';
import { ComposeModal } from './ComposeModal';

export function EmailClient() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [selectedMessageUid, setSelectedMessageUid] = useState<string | null>(null);
  const [skip, setSkip] = useState<number>(0);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);

  const { data: accounts, isLoading: accountsLoading } = useEmailAccounts();
  const { data: messages, isLoading: messagesLoading } = useMessages(
    selectedAccountId || 0,
    selectedFolder,
    skip
  );
  const { data: folders } = useFolders(selectedAccountId || 0);

  // Primäres Konto automatisch auswählen
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      const primaryAccount = accounts.find((a) => a.isPrimary) || accounts[0];
      setSelectedAccountId(primaryAccount.id);
    }
  }, [accounts, selectedAccountId]);

  const handleLoadMore = () => {
    setSkip(skip + 50);
  };

  const handleSelectFolder = (folder: string) => {
    setSelectedFolder(folder);
    setSkip(0); // Reset pagination
    setSelectedMessageUid(null); // Deselect message
  };

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccountId(accountId);
    setSelectedFolder('INBOX'); // Reset to INBOX
    setSkip(0); // Reset pagination
    setSelectedMessageUid(null); // Deselect message
  };

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Lädt E-Mail-Konten...</div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Kein E-Mail-Konto konfiguriert</h2>
          <p className="text-gray-600 mb-4">
            Füge ein E-Mail-Konto hinzu, um E-Mails zu senden und zu empfangen.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              // TODO: Open account settings modal
              alert('Account-Settings öffnen');
            }}
          >
            E-Mail-Konto hinzufügen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">E-Mail</h1>
          <EmailAccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={handleSelectAccount}
          />
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setIsComposeOpen(true)}
        >
          Verfassen
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Ordner */}
        <div className="w-64 border-r overflow-y-auto">
          <FolderList
            folders={folders?.folders || []}
            selectedFolder={selectedFolder}
            onSelectFolder={handleSelectFolder}
          />
        </div>

        {/* E-Mail-Liste */}
        <div className="w-96 border-r overflow-y-auto">
          <EmailList
            messages={messages?.messages || []}
            isLoading={messagesLoading}
            selectedMessageUid={selectedMessageUid}
            onSelectMessage={setSelectedMessageUid}
            onLoadMore={handleLoadMore}
            hasMore={messages ? skip + 50 < messages.total : false}
          />
        </div>

        {/* E-Mail-Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedMessageUid && selectedAccountId ? (
            <EmailDetail
              accountId={selectedAccountId}
              messageUid={selectedMessageUid}
              onClose={() => setSelectedMessageUid(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Wähle eine E-Mail aus
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && selectedAccountId && (
        <ComposeModal
          accountId={selectedAccountId}
          onClose={() => setIsComposeOpen(false)}
        />
      )}
    </div>
  );
}
