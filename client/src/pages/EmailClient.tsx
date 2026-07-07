import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { trpc } from '../lib/trpc';
type EmailMessage = any;
import { useSearch } from 'wouter';
import ComposeModal from '../components/ComposeModal';
import ArchiveModal from '../components/ArchiveModal';
import EmailSearchBar from '../components/EmailSearchBar';
type SearchFilters = any;

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

// Page size for infinite scroll
const PAGE_SIZE = 100;

export default function Emails() {
  const search = useSearch(); // Tracks query string changes
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  
  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  
  // Archive Modal State
  const [archiveOpen, setArchiveOpen] = useState(false);
  
  // Search State with Filters
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ folder: 'INBOX' });
  const [isSearching, setIsSearching] = useState(false);
  
  // Image Loading State
  const [imagesAllowed, setImagesAllowed] = useState<Set<string>>(new Set());
  const [trustedSenders, setTrustedSenders] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('trustedEmailSenders');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Ref for scroll container
  const emailListRef = useRef<HTMLDivElement>(null);

  // Update search filters when folder changes
  useEffect(() => {
    setSearchFilters((prev: any) => ({ ...prev, folder: currentFolder }));
  }, [currentFolder]);

  // Update currentFolder when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(search);
    const folder = urlParams.get('folder') || 'INBOX';
    console.log('[EmailClient] URL changed, new folder:', folder);
    setCurrentFolder(folder);
    setSelectedEmailId(null); // Clear selection when folder changes
  }, [search]);



  // Fetch emails with Infinite Scroll
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = (trpc.emailClient.getEmails as any).useInfiniteQuery(
    { 
      folder: searchFilters.folder || currentFolder,
      take: PAGE_SIZE,
      query: searchFilters.query || '',
    },
    {
      getNextPageParam: (lastPage: any, allPages: any) => {
        // Wenn letzte Seite weniger als PAGE_SIZE E-Mails hat, keine weitere Seite
        if ((lastPage as any).emails.length < PAGE_SIZE) return undefined;
        
        // Nächste Seite: skip = Anzahl aller bisherigen E-Mails
        const totalLoaded = allPages.reduce((total: any, page: any) => total + page.emails.length, 0);
        return { skip: totalLoaded };
      },
      enabled: true,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // tRPC Utils für imperative Aufrufe (z.B. Download)
  const trpcUtils = trpc.useUtils();

  // Flatten all emails from pages
  const allEmails = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: any) => page.emails);
  }, [data?.pages]);

  // Total count from first page
  const totalCount = data?.pages?.[0]?.totalCount || 0;

  // Scroll handler for infinite scroll
  const handleScroll = useCallback(() => {
    const container = emailListRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Wenn 80% gescrollt und weitere Seiten verfügbar
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      console.log('[EmailClient] Triggering fetchNextPage at', Math.round(scrollPercentage * 100), '%');
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener
  useEffect(() => {
    const container = emailListRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-select first email when emails are loaded
  useEffect(() => {
    if ((allEmails as any).length > 0 && !selectedEmailId) {
      setSelectedEmailId(allEmails[0].id);
    }
  }, [allEmails, selectedEmailId]);

  // Extract all unique email addresses from emails
  const allEmailAddresses = useMemo(() => {
    if (!allEmails.length) return [];
    const addresses = new Set<string>();
    allEmails.forEach((email: EmailMessage) => {
      const from = extractEmailAddress(email.from);
      if (from) addresses.add(from);
      
      const to = Array.isArray(email.to) ? email.to : [email.to];
      to.forEach((t: any) => {
        const addr = extractEmailAddress(t);
        if (addr) addresses.add(addr);
      });
      
      if ((email as any).cc) {
        const cc = Array.isArray((email as any).cc) ? (email as any).cc : [(email as any).cc];
        cc.forEach((c: any) => {
          const addr = extractEmailAddress(c);
          if (addr) addresses.add(addr);
        });
      }
    });
    return Array.from(addresses);
  }, [allEmails]);

  // HTML-Processing für E-Mail-Links
  const processEmailBody = (html: string, allowImages: boolean = false) => {
    if (!html) return html;
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Alle Links durchgehen und target="_blank" hinzufügen
      doc.querySelectorAll('a').forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        // Stelle sicher, dass href nicht entfernt wurde
        if (!link.getAttribute('href')) {
          const text = link?.textContent;
          if (text && (text.startsWith('http') || text.startsWith('www'))) {
            link.setAttribute('href', text.startsWith('www') ? `https://${text}` : text);
          }
        }
        
        // Explizit pointer-events erlauben
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
      });
      
      // Bilder blockieren wenn nicht erlaubt, oder wiederherstellen wenn erlaubt
      doc.querySelectorAll('img').forEach(img => {
        const originalSrc = img.getAttribute('src') || img.getAttribute('data-original-src');
        if (originalSrc && !originalSrc.startsWith('data:')) {
          if (!allowImages) {
            // Bilder blockieren
            img.setAttribute('data-original-src', originalSrc);
            img.removeAttribute('src');
            img.style.display = 'none';
          } else {
            // Bilder wiederherstellen
            img.setAttribute('src', originalSrc);
            img.removeAttribute('data-original-src');
            img.style.display = '';
          }
        }
      });
      
      return doc.body.innerHTML;
    } catch (error) {
      console.error('Error processing email body:', error);
      return html;
    }
  };

  const handleAttachmentClick = async (att: any, idx: number, email: any) => {
    if (!email.id) {
      console.error('Email ID missing');
      alert('Download fehlgeschlagen: E-Mail ID fehlt');
      return;
    }
    if (idx >= email.attachments.length) {
      console.error('Attachment index out of bounds');
      alert('Download fehlgeschlagen: Anhang existiert nicht');
      return;
    }
    try {
      const downloadLink: string = email.attachments[idx].link;
      const dateiName: string = email.attachments[idx].filename;

      const a = document.createElement('a');
      a.href = downloadLink;
      a.download = dateiName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download fehlgeschlagen');
    }
  };

  // Fetch contacts for all email addresses
  // Get full email details when an email is selected
  const { data: fullEmailData, isLoading: isLoadingFullEmail } = (trpc.emailClient.getEmail as any).useQuery(
    {
      folder: currentFolder,
      uid: selectedEmailId || '',
    },
    {
      enabled: !!selectedEmailId,
    }
  );

  const { data: contactsData } = (trpc.emailClient.findContactsByEmails as any).useQuery(
    { emails: allEmailAddresses },
    { enabled: (allEmailAddresses as any).length > 0 }
  );

  // Delete email mutation
  const deleteMutation = (trpc.emailClient.deleteEmail as any).useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      refetch();
    },
    onError: (error: any) => {
      console.error('[deleteEmail] Error:', error);
      alert(`Error deleting: ${error.message}`);
    }
  });

  // Mark as read/unread mutation
  const markAsReadMutation = (trpc.emailClient as any).markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error: any) => {
      console.error('[markAsRead] Error:', error);
      alert(`Error marking: ${error.message}`);
    }
  });

  const handleMarkAsRead = async (markRead: boolean) => {
    if (!selectedEmail) return;
    
    try {
      await markAsReadMutation.mutateAsync({
        folder: currentFolder,
        messageUid: selectedEmail.id,
        markRead,
      });
    } catch (error) {
      console.error('[handleMarkAsRead] Error:', error);
    }
  };

  // Move messages mutation
  const moveMessagesMutation = (trpc.emailClient as any).moveMessages.useMutation({
    onSuccess: () => {
      setSelectedEmailId(null);
      refetch();
    },
    onError: (error: any) => {
      console.error('[moveMessages] Error:', error);
      alert(`Error moving: ${error.message}`);
    }
  });

  const handleMoveToFolder = async (toFolder: string) => {
    if (!selectedEmail) return;
    
    try {
      await moveMessagesMutation.mutateAsync({
        uids: [selectedEmail.id],
        fromFolder: currentFolder,
        toFolder,
      });
    } catch (error) {
      console.error('[handleMoveToFolder] Error:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    
    if (!confirm('E-Mail wirklich löschen?')) return;
    
    try {
      await deleteMutation.mutateAsync({
        folder: currentFolder,
        messageUid: selectedEmail.id,
      });
    } catch (error) {
      console.error('[handleDelete] Error:', error);
    }
  };

  // Create a map of email -> contact name
  const contactMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (contactsData) {
      Object.entries(contactsData).forEach(([email, contacts]) => {
        if (contacts && (contacts as any).length > 0) {
          map[email] = (contacts as any)[0].name;
        }
      });
    }
    return map;
  }, [contactsData]);

  // Only use fullEmailData (with HTML) when available, don't fall back to allEmails (without HTML)
  const selectedEmail = fullEmailData;

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

  // Handle search
  const handleSearch = (filters: SearchFilters) => {
    setIsSearching(true);
    setSearchFilters(filters);
    setSelectedEmailId(null);
    setTimeout(() => setIsSearching(false), 500);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-12rem)] bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="w-full md:w-[35%] lg:w-[30%] xl:w-[25%] 2xl:w-[21%] border-r border-gray-200 flex flex-col">
          {/* Header */}
        {/* LEFT COLUMN - Email List (Small - 35% width) */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-gray-900">{currentFolder}</h2>
              <EmailSearchBar
                onSearch={handleSearch}
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {allEmails.length}{totalCount > 0 && ` / ${totalCount}`}
              </span>
            </div>
          </div>

          {/* Email List with Scroll Handler */}
          <div 
            ref={emailListRef} 
            className="flex-1 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading emails...</div>
            ) : error ? (
              <div className="p-4 text-center text-gray-500">Error loading emails</div>
            ) : (allEmails as any).length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchFilters.query ? 'No emails found' : 'No emails available'}
              </div>
            ) : (
              <>
                {allEmails.map((email: EmailMessage) => (
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
                        <p className="font-semibold text-gray-900 text-sm truncate">{renderEmailAddress(email.from, contactMap)}</p>
                        <p className="text-gray-700 text-xs truncate font-medium mt-1">{email.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {email.hasAttachments && <span className="text-gray-400 text-xs">📎</span>}
                        <p className="text-gray-500 text-xs whitespace-nowrap">{formatDate(email.date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator for infinite scroll */}
                {isFetchingNextPage && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Lade weitere E-Mails...
                    </div>
                  </div>
                )}
                
                {/* End of list indicator */}
                {!hasNextPage && (allEmails as any).length > 0 && (
                  <div className="p-4 text-center text-gray-400 text-xs">
                    All emails loaded ({allEmails.length})
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Email Detail (Large - 65% width) */}
        {selectedEmailId ? (
          <div className="w-full md:w-[65%] lg:w-[70%] xl:w-[75%] 2xl:w-[79%] flex flex-col">
            {/* Action Buttons */}
            <div className="border-b border-gray-200 p-3 bg-white flex gap-2 items-center">
              <button
                onClick={() => handleCompose('new')}
                className="px-2 py-1 text-[15px] bg-[#e48f00] text-white rounded hover:bg-[#d17f00] transition-colors"
              >
                + New
              </button>
              <button
                onClick={() => handleCompose('reply')}
                className="px-2 py-1 text-[15px] bg-[#e48f00] text-white rounded hover:bg-[#d17f00] transition-colors"
              >
                Reply
              </button>
              <button
                onClick={() => handleCompose('replyAll')}
                className="px-2 py-1 text-[15px] bg-[#e48f00] text-white rounded hover:bg-[#d17f00] transition-colors"
              >
                Reply All
              </button>
              <button
                onClick={() => handleCompose('forward')}
                className="px-2 py-1 text-[15px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                Forward
              </button>
              <button
                onClick={() => handleMarkAsRead(true)}
                disabled={markAsReadMutation.isPending}
                className="px-2 py-1 text-[15px] bg-[#e48f00] text-white rounded hover:bg-[#d17f00] transition-colors disabled:opacity-50"
              >
                {markAsReadMutation.isPending ? '...' : '✓'}
              </button>
              <button
                onClick={() => handleMarkAsRead(false)}
                disabled={markAsReadMutation.isPending}
                className="px-2 py-1 text-[15px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50" title="Mark as unread"
              >
                {markAsReadMutation.isPending ? '...' : '✉'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-2 py-1 text-[15px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50" title="Delete"
              >
                {deleteMutation.isPending ? '...' : '🗑'}
              </button>
              <select
                onChange={(e: any) => {
                  if (e.target.value) {
                    handleMoveToFolder(e.target.value);
                    e.target.value = ''; // Reset dropdown
                  }
                }}
                disabled={moveMessagesMutation.isPending}
                className="px-2 py-1 text-[15px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <option value="">{moveMessagesMutation.isPending ? 'Moving...' : '📂 Move to...'}</option>
                <option value="Drafts">Drafts</option>
                <option value="Sent Items">Sent</option>
                <option value="Deleted Items">Trash</option>
                <option value="Junk E-Mail">Spam</option>
              </select>
              <button
                onClick={() => setArchiveOpen(true)}
                className="px-2 py-1 text-[15px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors" title="Archive"
              >
                📦
              </button>
            </div>

            {isLoadingFullEmail && selectedEmailId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading email...</div>
              </div>
            ) : selectedEmail && (
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
                    <p className="font-semibold text-gray-900 text-sm">{selectedEmail.subject}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-gray-900 text-sm">
                      {new Date(selectedEmail.date).toLocaleString('de-DE')}
                    </p>
                  </div>
                  {selectedEmail.attachments && (selectedEmail as any).attachments.length > 0 && (
                    <div className="mt-2">
                      <p className="text-gray-600 text-xs font-semibold mb-1">ANHÄNGE ({selectedEmail.attachments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => handleAttachmentClick(att, idx, selectedEmail)}
                            className="text-xs bg-gray-100 text-[#c87e00] px-2 py-1 rounded hover:bg-gray-200 cursor-pointer"
                          >
                            📎 {att.filename || `Anhang ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="flex-1 overflow-y-auto p-4 relative">
                  {(() => {
                    const senderEmail = extractEmailAddress(selectedEmail.from);
                    const isImagesAllowed = imagesAllowed.has(selectedEmail.id) || (senderEmail && trustedSenders.has(senderEmail));
                    const hasExternalImages = selectedEmail.html && /<img[^>]+src=["'](?!data:)[^"']+["']/i.test(selectedEmail.html);
                    
                    return (
                      <>
                        {hasExternalImages && !isImagesAllowed && (
                          <div className="mb-2 text-sm text-gray-600 flex items-center gap-1">
                            <span>📷</span>
                            <button
                              onClick={() => {
                                setImagesAllowed(prev => new Set(prev).add(selectedEmail.id));
                              }}
                              className="text-[#E48F00] hover:underline"
                            >
                              Show images
                            </button>
                            <span>or</span>
                            <button
                              onClick={() => {
                                if (senderEmail) {
                                  const newTrusted = new Set(trustedSenders).add(senderEmail);
                                  setTrustedSenders(newTrusted);
                                  localStorage.setItem('trustedEmailSenders', JSON.stringify(Array.from(newTrusted)));
                                  setImagesAllowed(prev => new Set(prev).add(selectedEmail.id));
                                }
                              }}
                              className="text-[#E48F00] hover:underline"
                            >
                              always show images from this sender
                            </button>
                          </div>
                        )}
                        {selectedEmail.html ? (
                          <iframe
                            key={`${selectedEmail.id}-${isImagesAllowed}`}
                            srcDoc={processEmailBody(selectedEmail.html, isImagesAllowed === true)}
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin allow-popups"
                            title="Email Content"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                            {selectedEmail?.text || 'Kein Inhalt verfügbar'}
                          </pre>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-[79%] flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">📧</div>
              <p className="text-base">Wählen Sie eine E-Mail</p>
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
          email={{
            id: typeof selectedEmailId === 'number' ? selectedEmailId : 0,
            subject: selectedEmail?.subject || '',
            fromName: selectedEmail?.from?.name || (typeof selectedEmail?.from === 'string' ? selectedEmail.from : '') || '',
            fromAddress: selectedEmail?.from?.email || (typeof selectedEmail?.from === 'string' ? selectedEmail.from : '') || '',
            toAddress: typeof selectedEmail?.to === 'string' ? selectedEmail.to : '',
            ccAddress: Array.isArray(selectedEmail?.cc) ? (selectedEmail as any).cc.map((c: any) => typeof c === "object" ? c.email : c).join(', ') : '',
            body: selectedEmail?.body || '',
          }}
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
