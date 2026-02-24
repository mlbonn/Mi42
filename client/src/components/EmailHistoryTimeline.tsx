import { useState } from 'react';
import { Mail, RefreshCw, Archive, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownLeft, Paperclip } from 'lucide-react';
import { Button } from '../components/ui/button';

interface Email {
  id: string;
  subject: string;
  from_address: string;
  from_name?: string;
  to_address: string;
  email_date: string;
  body?: string;
  html_body?: string;
  direction?: 'inbound' | 'outbound';
  attachments?: Array<{
    filename: string;
    size: number;
    url: string;
  }>;
}

interface EmailHistoryTimelineProps {
  emails: Email[];
  onRefresh: () => void;
  onArchive: () => void;
}

export function EmailHistoryTimeline({ emails, onRefresh, onArchive }: EmailHistoryTimelineProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  const toggleEmailExpand = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Sticky Header with Actions */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold">E-Mail Historie</h3>
            <span className="text-sm text-gray-500">({emails.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Aktualisieren
            </Button>
            <Button variant="ghost" size="sm" onClick={onArchive}>
              <Archive className="h-4 w-4 mr-1" />
              Archivierte E-Mail
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {emails.length > 0 ? (
          <div className="space-y-2">
            {emails.map((email) => {
              const isExpanded = expandedEmails.has(email.id);
              const displayName = email.from_name || email.from_address;
              
              return (
                <div key={email.id} className="border rounded-lg hover:shadow-sm transition-shadow">
                  {/* Compact Row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleEmailExpand(email.id)}
                  >
                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    {/* Direction Icon */}
                    <div className="flex-shrink-0">
                      {email.direction === 'outbound' ? (
                        <ArrowUpRight className="h-4 w-4 text-orange-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-orange-500" />
                      )}
                    </div>

                    {/* Subject and Sender */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{email.subject || '(Kein Betreff)'}</div>
                      <div className="text-xs text-gray-500 truncate">{displayName}</div>
                    </div>

                    {/* Date */}
                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {formatDate(email.email_date)}
                    </div>

                    {/* Attachment Icon */}
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex-shrink-0">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      {/* Email Details */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Von:</span> {email.from_address}
                        </div>
                        <div>
                          <span className="font-medium">An:</span> {email.to_address}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Datum:</span> {formatDate(email.email_date)}
                        </div>
                      </div>

                      {/* Email Body */}
                      <div className="bg-white p-3 rounded border mb-3 max-h-64 overflow-y-auto">
                        {email.html_body ? (
                          <div dangerouslySetInnerHTML={{ __html: email.html_body }} className="text-sm" />
                        ) : email.body ? (
                          <div className="whitespace-pre-wrap text-sm">{email.body}</div>
                        ) : (
                          <p className="text-gray-500 italic text-sm">Kein Inhalt</p>
                        )}
                      </div>

                      {/* Attachments */}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="bg-white p-3 rounded border">
                          <div className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Anhänge ({email.attachments.length})
                          </div>
                          <div className="space-y-1">
                            {email.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm truncate">{attachment.filename}</span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    ({(attachment.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                  <a href={attachment.url} download>
                                    Download
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Keine E-Mails vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}
