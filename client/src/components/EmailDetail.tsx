// client/components/EmailDetail.tsx
// E-Mail-Detail-Ansicht mit Auto-Archivierung bei eindeutigem Email-Match

import React, { useState } from 'react';
import { useMessage, useMarkAsRead } from '../hooks/useEmails';
import { trpc } from '../lib/trpc';
import ArchiveModal from './ArchiveModal';
import ReplyModal from './ReplyModal';

interface EmailDetailProps {
  accountId: number;
  messageUid: string;
  onClose: () => void;
}

export function EmailDetail({ accountId, messageUid, onClose }: EmailDetailProps) {
  const { data: message, isLoading } = useMessage(accountId, messageUid);
  const markAsRead = useMarkAsRead();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [imagesAllowed, setImagesAllowed] = useState(false);
  const [trustedSender, setTrustedSender] = useState(false);
  const [isAutoArchiving, setIsAutoArchiving] = useState(false);
  const [archiveNotification, setArchiveNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const archiveEmailMutation = trpc.emailClient.archiveEmail.useMutation();

  // Als gelesen markieren beim Öffnen
  React.useEffect(() => {
    if (message && !message.isRead) {
      markAsRead.mutate({ accountId, messageUid });
    }
  }, [message, accountId, messageUid]);

  // Check if sender is trusted (from localStorage)
  React.useEffect(() => {
    if (message?.from) {
      const trusted = localStorage.getItem(`trusted_sender_${message.from}`) === 'true';
      setTrustedSender(trusted);
      if (trusted) {
        setImagesAllowed(true);
      }
    }
  }, [message]);

  const handleTrustSender = () => {
    if (message?.from) {
      localStorage.setItem(`trusted_sender_${message.from}`, 'true');
      setTrustedSender(true);
      setImagesAllowed(true);
    }
  };

  // Auto-archive logic
  const handleArchiveClick = async () => {
    if (!message) return;

    const fromAddress = message.from || '';
    
    try {
      setIsAutoArchiving(true);
      
      // Check if there's exactly one contact match
      const contactsResponse = await trpc.emailClient.findContactsByEmails.query({
        emails: [fromAddress]
      });
      
      const matchedContacts = contactsResponse[fromAddress] || [];
      
      if (matchedContacts.length === 1) {
        // Auto-archive: exactly one match
        const contact = matchedContacts[0];
        
        await archiveEmailMutation.mutateAsync({
          emailId: messageUid,
          contactId: contact.id.toString(),
          notes: `Auto-archived from email: ${message.subject}`,
          fromAddress: fromAddress,
          fromName: message.fromName || '',
          toAddress: message.to || '',
          ccAddress: message.cc || '',
          subject: message.subject || '',
          body: message.textBody || '',
          htmlBody: message.htmlBody || '',
          emailDate: message.receivedDate || new Date().toISOString(),
          attachments: message.attachments || [],
        });
        
        // Show success notification
        setArchiveNotification({
          type: 'success',
          message: `✓ Email automatisch archiviert für ${contact.name}`
        });
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setArchiveNotification(null);
        }, 3000);
        
      } else {
        // Manual archive: no match or multiple matches
        setShowArchiveDialog(true);
      }
      
    } catch (error) {
      console.error('Auto-archive error:', error);
      setArchiveNotification({
        type: 'error',
        message: '✗ Fehler bei der Archivierung'
      });
      setTimeout(() => {
        setArchiveNotification(null);
      }, 3000);
    } finally {
      setIsAutoArchiving(false);
    }
  };

  // Download attachment
  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const response = await fetch(attachment.link);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Fehler beim Herunterladen des Anhangs');
    }
  };

  // Download all attachments
  const handleDownloadAllAttachments = async () => {
    if (!message.attachments || message.attachments.length === 0) return;
    
    for (const attachment of message.attachments) {
      await handleDownloadAttachment(attachment);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Get file icon based on file type
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h8l4 4v12H4V2zm8 0v4h4l-4-4z"/>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h8l4 4v12H4V2zm8 0v4h4l-4-4z"/>
          </svg>
        );
      case 'xls':
      case 'xlsx':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h8l4 4v12H4V2zm8 0v4h4l-4-4z"/>
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'zip':
      case 'rar':
      case '7z':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

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

  // Process HTML to block images if not allowed
  const processedHtmlBody = React.useMemo(() => {
    if (!message.htmlBody) return '';
    if (imagesAllowed) return message.htmlBody;
    
    return message.htmlBody.replace(
      /<img([^>]*?)src=["']([^"']+)["']/gi,
      '<img$1data-blocked-src="$2" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23ddd\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E🖼️%3C/text%3E%3C/svg%3E"'
    );
  }, [message.htmlBody, imagesAllowed]);

  return (
    <div className="flex flex-col h-full">
      {/* Archive Notification */}
      {archiveNotification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg ${
          archiveNotification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {archiveNotification.message}
        </div>
      )}

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
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleArchiveClick}
              disabled={isAutoArchiving}
            >
              {isAutoArchiving ? '⏳ Prüfe...' : '📁 Archivieren'}
            </button>
            <button
              className="px-4 py-2 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark"
              onClick={() => setShowReplyModal(true)}
            >
              Antworten
            </button>
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">
                📎 Anhänge ({message.attachments.length})
              </div>
              {message.attachments.length > 1 && (
                <button
                  onClick={handleDownloadAllAttachments}
                  className="text-xs px-3 py-1 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Alle herunterladen</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {message.attachments.map((attachment: any, index: number) => (
                <div
                  key={attachment.id || index}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(attachment.filename)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {attachment.filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="ml-2 p-2 text-orange-600 hover:bg-gray-50 rounded transition-colors flex-shrink-0"
                    title="Herunterladen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Control Bar */}
      {message.htmlBody && !imagesAllowed && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Bilder wurden aus Sicherheitsgründen blockiert</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setImagesAllowed(true)}
              className="px-3 py-1 text-xs bg-white border border-yellow-300 rounded hover:bg-yellow-100 text-yellow-800"
            >
              Bilder anzeigen
            </button>
            <button
              onClick={handleTrustSender}
              className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Absender vertrauen
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {message.htmlBody ? (
          <div 
            dangerouslySetInnerHTML={{ __html: processedHtmlBody }}
            className="email-content"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{message.textBody}</pre>
        )}
      </div>

      {/* Archive Modal - Only shown for manual archiving */}
      <ArchiveModal
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        emailId={messageUid}
        fromAddress={fromAddress}
        ccAddresses={ccAddresses}
        onSuccess={() => {
          setShowArchiveDialog(false);
          setArchiveNotification({
            type: 'success',
            message: '✓ Email erfolgreich archiviert'
          });
          setTimeout(() => setArchiveNotification(null), 3000);
        }}
        email={{
          from: message.from,
          fromName: message.fromName,
          to: message.to,
          subject: message.subject,
          body: message.textBody,
          html: message.htmlBody,
          date: message.receivedDate,
          attachments: message.attachments
        }}      </div>

      {/* Reply Modal */}
      <ReplyModal
        isOpen={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        originalEmail={message}
        onSent={() => {
          setShowReplyModal(false);
          // Optional: Notification anzeigen
        }}
      />
    </div>
  );
}unction formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
