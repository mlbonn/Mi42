// client/components/EmailDetail.tsx
// E-Mail-Detail-Ansicht mit Archivierungs-Button

import React, { useState } from 'react';
import { useMessage, useMarkAsRead } from '../hooks/useEmails';
import ArchiveModal from './ArchiveModal';

interface EmailDetailProps {
  accountId: number;
  messageUid: string;
  onClose: () => void;
}

export function EmailDetail({ accountId, messageUid, onClose }: EmailDetailProps) {
  const { data: message, isLoading } = useMessage(accountId, messageUid);
  const markAsRead = useMarkAsRead();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Als gelesen markieren beim Öffnen
  React.useEffect(() => {
    if (message && !message.isRead) {
      markAsRead.mutate({ accountId, messageUid });
    }
  }, [message, accountId, messageUid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Lädt E-Mail...</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">E-Mail nicht gefunden</div>
      </div>
    );
  }

  // Extract email addresses from message
  const fromAddress = message.from || '';
  const ccAddresses = message.cc ? message.cc.split(',').map(e => e.trim()) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{message.subject}</h2>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Von: {message.from}</div>
            <div className="text-sm text-gray-600">An: {message.to}</div>
            {message.cc && <div className="text-sm text-gray-600">CC: {message.cc}</div>}
            <div className="text-xs text-gray-400 mt-1">
              {new Date(message.receivedDate).toLocaleString('de-DE')}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => {
                alert('Button clicked! State before: ' + showArchiveDialog);
                setShowArchiveDialog(true);
                alert('State set to true');
              }}
            >
              📁 Archivieren
            </button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => {
                // TODO: Reply
                alert('Antworten-Funktion noch nicht implementiert');
              }}
            >
              Antworten
            </button>
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Anhänge ({message.attachments.length})</div>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span className="text-sm">{attachment.filename}</span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(attachment.size)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {message.htmlBody ? (
          <iframe
            srcDoc={message.htmlBody}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{message.textBody}</pre>
        )}
      </div>

      {/* Archive Modal - ALWAYS RENDERED */}
      <ArchiveModal
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        emailId={messageUid}
        fromAddress={fromAddress}
        ccAddresses={ccAddresses}
        onSuccess={() => setShowArchiveDialog(false)}
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
