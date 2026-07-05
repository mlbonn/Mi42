import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import {
  Mail, Phone, Building2, Edit, ArrowLeft, Plus, X,
  CheckCircle, FileText, Paperclip, ArrowDownLeft, ArrowUpRight,
  Upload, Download, Users, RefreshCw, ChevronDown
} from 'lucide-react';
import FileUploadActivity from '@/components/FileUploadActivity';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(val: unknown): string {
  const d = parseDate(val);
  if (!d) return 'Datum unbekannt';
  return d.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtShort(val: unknown): string {
  const d = parseDate(val);
  if (!d) return '—';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function extractAddr(raw: string | null | undefined): string {
  if (!raw) return '';
  const m = raw.match(/<([^>]+)>/);
  return m ? m[1] : raw.trim();
}

function displayAddr(raw: string | null | undefined): string {
  if (!raw) return '';
  // Handle JSON objects from SmarterMail
  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      return obj.name ? `${obj.name} <${obj.email}>` : obj.email || raw;
    } catch { /* ignore */ }
  }
  return raw;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  type: 'email' | 'activity';
  date: Date | null;
  subject: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound' | string;
  body?: string;
  htmlBody?: string;
  activityType?: string;
  isArchived?: boolean;
  attachments?: any[];
}

// ─── Component ───────────────────────────────────────────────────────────────

const EMAILS_PER_PAGE = 25;

export default function ContactDetail() {
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [emailPage, setEmailPage] = useState(1);

  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', email: '', email2: '', email3: '',
    email4: '', email5: '', phone: '', jobTitle: '',
    contactStatus: 'cold' as 'cold' | 'warm' | 'hot' | 'active' | 'inactive',
    contactType: 'prospect' as 'partner' | 'supplier' | 'customer' | 'staff' | 'staff_plus' | 'prospect',
    notes: ''
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: contact, isLoading, refetch: refetchContact } = trpc.contacts.get.useQuery(
    { id: id! }, { enabled: !!id }
  );
  const { data: emails = [], refetch: refetchEmails } = trpc.emails.listByContact.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const { data: activities = [], refetch: refetchActivities } = trpc.activities.listByContact.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const { data: archivedEmailsRaw = [] } = trpc.contacts.getArchivedEmails.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const { data: companies = [] } = trpc.contacts.getCompanies.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const { data: contactLists = [], refetch: refetchContactLists } = trpc.distributionLists.getByContactId.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const { data: allLists = [] } = trpc.distributionLists.list.useQuery();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => { refetchContact(); setIsEditing(false); }
  });
  const addToList = trpc.distributionLists.addContact.useMutation({
    onSuccess: () => refetchContactLists()
  });
  const removeFromList = trpc.distributionLists.removeContact.useMutation({
    onSuccess: () => refetchContactLists()
  });
  const createList = trpc.distributionLists.create.useMutation({
    onSuccess: (newList) => {
      if (newList && id) addToList.mutate({ distributionListId: newList.id, contactId: id });
      setShowListDialog(false); setNewListName(''); setNewListDescription('');
    }
  });

  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName || '', lastName: contact.lastName || '',
        email: contact.email || '', email2: (contact as any).email2 || '',
        email3: (contact as any).email3 || '', email4: (contact as any).email4 || '',
        email5: (contact as any).email5 || '', phone: contact.phone || '',
        jobTitle: contact.jobTitle || '',
        contactStatus: (contact.contactStatus as any) || 'cold',
        contactType: ((contact as any).contactType as any) || 'prospect',
        notes: contact.notes || ''
      });
    }
  }, [contact]);

  // ── Feed aufbauen ──────────────────────────────────────────────────────────

  // E-Mails aus emails-Tabelle (via listByContact, nur direkt verknüpfte)
  const emailFeedItems: FeedItem[] = (emails as any[]).map((e: any) => ({
    id: `email-${e.id}`,
    type: 'email',
    date: parseDate(e.timestamp ?? e.createdAt),
    subject: e.subject || '(Kein Betreff)',
    from: displayAddr(e.fromAddress),
    to: displayAddr(e.toAddress),
    direction: e.direction || 'inbound',
    body: e.body,
    htmlBody: e.htmlBody,
    attachments: e.attachments || [],
    isArchived: false,
  }));

  // Archivierte E-Mails aus archived_emails (via getArchivedEmails)
  const archivedFeedItems: FeedItem[] = (archivedEmailsRaw as any[]).map((e: any) => ({
    id: `archived-${e.id}`,
    type: 'email',
    date: parseDate(e.email_date ?? e.timestamp),
    subject: e.subject || '(Kein Betreff)',
    from: e.from_name ? `${e.from_name} <${e.from_address}>` : (e.from_address || ''),
    to: e.to_address || '',
    direction: 'inbound',
    body: e.body,
    htmlBody: e.html_body,
    attachments: [],
    isArchived: true,
  }));

  // Aktivitäten (Dateien, Notizen, etc.) — keine E-Mails
  const activityFeedItems: FeedItem[] = (activities as any[])
    .filter((a: any) =>
      a.activityType !== 'Email Archive' &&
      a.activityType !== 'email' &&
      !a.subject?.startsWith('📧')
    )
    .map((a: any) => ({
      id: `activity-${a.id}`,
      type: 'activity',
      date: parseDate(a.activityDate ?? a.createdAt),
      subject: a.subject || '(Keine Beschreibung)',
      from: a.createdBy || '',
      to: '',
      direction: a.direction || '',
      activityType: a.activityType,
      body: a.content,
    }));

  // Deduplizieren: archived_emails und emails können sich überschneiden
  // Bevorzuge archived_emails (haben email_date), entferne Duplikate aus emails
  const archivedEmailIds = new Set(
    (archivedEmailsRaw as any[]).map((e: any) => e.id).filter(Boolean)
  );
  const deduplicatedEmailItems = emailFeedItems.filter(
    (item) => !archivedEmailIds.has(item.id.replace('email-', ''))
  );

  // Alle Feed-Items zusammenführen und nach Datum sortieren
  const allFeedItems: FeedItem[] = [
    ...archivedFeedItems,
    ...deduplicatedEmailItems,
    ...activityFeedItems,
  ].sort((a, b) => {
    const ta = a.date?.getTime() ?? 0;
    const tb = b.date?.getTime() ?? 0;
    return tb - ta;
  });

  const paginatedFeed = allFeedItems.slice(0, emailPage * EMAILS_PER_PAGE);
  const hasMore = allFeedItems.length > emailPage * EMAILS_PER_PAGE;

  const toggleExpand = (id: string) => {
    const s = new Set(expandedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedItems(s);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Lädt...</div>
    </div>
  );

  if (!contact) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Kontakt nicht gefunden</div>
    </div>
  );

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  const companyNames = (companies as any[]).map((c: any) => c.name).join(', ') || '—';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-screen-xl mx-auto">

      {/* Back */}
      <Link href="/contacts">
        <a className="text-orange-600 hover:text-gray-800 text-sm mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Kontaktliste
        </a>
      </Link>

      {/* ── Header Card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name + Status */}
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{fullName || 'Unbenannt'}</h1>
              {contact.jobTitle && <span className="text-gray-500 text-sm">{contact.jobTitle}</span>}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                contact.contactStatus === 'active' ? 'bg-green-100 text-green-800' :
                contact.contactStatus === 'hot'    ? 'bg-red-100 text-red-800' :
                contact.contactStatus === 'warm'   ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {contact.contactStatus
                  ? contact.contactStatus.charAt(0).toUpperCase() + contact.contactStatus.slice(1)
                  : 'Cold'}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Phone className="h-3.5 w-3.5" />{contact.phone}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />{companyNames}
              </span>
            </div>

            {/* E-Mail addresses */}
            <div className="flex items-center gap-3 flex-wrap text-sm mt-2">
              {[contact.email, (contact as any).email2, (contact as any).email3,
                (contact as any).email4, (contact as any).email5]
                .filter(Boolean)
                .map((addr: string, i: number) => (
                  <a key={i} href={`mailto:${addr}`}
                    className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                    <Mail className="h-3.5 w-3.5" />{addr}
                  </a>
                ))}
              {!contact.email && !(contact as any).email2 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Mail className="h-3.5 w-3.5" />Keine E-Mail-Adresse
                </span>
              )}
            </div>

            {/* Address */}
            {((contact as any).street || (contact as any).city) && (
              <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-2">
                <Building2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {[(contact as any).street,
                    [(contact as any).postalCode, (contact as any).city].filter(Boolean).join(' '),
                    (contact as any).country
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          <Button onClick={() => setIsEditing(true)} variant="default" size="sm">
            <Edit className="h-4 w-4 mr-1.5" />Edit
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left sidebar: Verteiler + Aktivitäten + Notizen ─────────────── */}
        <div className="space-y-4">

          {/* Verteiler */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Distribution Lists</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowListDialog(true)} className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(contactLists as any[]).length > 0 ? (
              <div className="space-y-1">
                {(contactLists as any[]).map((list: any) => (
                  <div key={list.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <Users className="h-3 w-3 text-gray-400" />{list.listName}
                    </span>
                    <button onClick={() => removeFromList.mutate({ contactId: id!, distributionListId: list.listId })}
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Keine Verteiler</p>
            )}
          </div>

          {/* Aktivitäten (Dateien/Notizen) */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">
                Activities <span className="text-gray-400 font-normal">({activityFeedItems.length})</span>
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="h-7 text-xs">
                <Upload className="h-3 w-3 mr-1" />Upload
              </Button>
            </div>
            {activityFeedItems.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {activityFeedItems.map((item) => (
                  <div key={item.id}
                    className="flex items-start gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer group"
                    onClick={() => {
                      if (item.activityType === 'Document' || item.activityType === 'file_upload' || item.activityType === 'File Upload') {
                        const link = document.createElement('a');
                        link.href = `/api/download/activity/${item.id.replace('activity-', '')}`;
                        link.download = item.subject;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}>
                    <div className="mt-0.5 flex-shrink-0">
                      {item.activityType === 'Document' || item.activityType === 'file_upload' || item.activityType === 'File Upload'
                        ? <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                        : <FileText className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium group-hover:text-orange-600 line-clamp-1">{item.subject}</span>
                      <span className="text-xs text-gray-400">{fmtShort(item.date)}</span>
                    </div>
                    {(item.activityType === 'Document' || item.activityType === 'file_upload') && (
                      <Download className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Keine Aktivitäten</p>
            )}
          </div>

          {/* Notizen */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Notes</h3>
              <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-orange-600">
                <Edit className="h-3.5 w-3.5" />
              </button>
            </div>
            {contact.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 cursor-pointer hover:text-orange-600" onClick={() => setIsEditing(true)}>
                Click to add notes…
              </p>
            )}
          </div>
        </div>

        {/* ── Main feed: E-Mail-Historie ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border">
            {/* Feed Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-gray-700">
                Communication History
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  ({allFeedItems.filter(i => i.type === 'email').length} E-Mails)
                </span>
              </h3>
              <button onClick={() => { refetchEmails(); refetchActivities(); }}
                className="text-gray-400 hover:text-orange-600 transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Feed Items */}
            {paginatedFeed.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Keine E-Mail-Historie</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paginatedFeed.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const isEmail = item.type === 'email';

                  return (
                    <div key={item.id} className="hover:bg-gray-50 transition-colors">
                      {/* Compact row */}
                      <div
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => isEmail && toggleExpand(item.id)}
                      >
                        {/* Direction icon */}
                        <div className="mt-0.5 flex-shrink-0">
                          {!isEmail ? (
                            <FileText className="h-4 w-4 text-gray-300" />
                          ) : item.direction === 'outbound' ? (
                            <ArrowUpRight className="h-4 w-4 text-orange-400" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Subject line */}
                          <div className="flex items-baseline gap-2">
                            <span className={`text-sm font-medium truncate ${isEmail ? 'text-gray-900' : 'text-gray-600'}`}>
                              {item.subject}
                            </span>
                            {item.isArchived && (
                              <span className="text-xs text-gray-400 flex-shrink-0">archiviert</span>
                            )}
                            {(item.attachments?.length ?? 0) > 0 && (
                              <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          {/* From / To */}
                          {isEmail && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span className="truncate">
                                {item.direction === 'outbound'
                                  ? <><span className="text-gray-400">An: </span>{item.to || '—'}</>
                                  : <><span className="text-gray-400">Von: </span>{item.from || '—'}</>
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                          {fmtShort(item.date)}
                        </span>

                        {/* Expand chevron */}
                        {isEmail && (
                          <ChevronDown className={`h-4 w-4 text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>

                      {/* Expanded body */}
                      {isExpanded && isEmail && (
                        <div className="px-4 pb-4 ml-7">
                          <div className="bg-gray-50 rounded p-3 text-sm">
                            {/* Full meta */}
                            <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                              <div><span className="text-gray-400">Von: </span>{item.from || '—'}</div>
                              <div><span className="text-gray-400">An: </span>{item.to || '—'}</div>
                              <div><span className="text-gray-400">Datum: </span>{fmtDate(item.date)}</div>
                            </div>
                            {/* Body */}
                            {item.htmlBody ? (
                              <div
                                className="text-sm text-gray-700 max-h-64 overflow-y-auto border-t pt-2 mt-2"
                                dangerouslySetInnerHTML={{ __html: item.htmlBody }}
                              />
                            ) : item.body ? (
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto border-t pt-2 mt-2 font-sans">
                                {item.body}
                              </pre>
                            ) : (
                              <p className="text-gray-400 text-xs border-t pt-2 mt-2">Kein Inhalt</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="px-4 py-3 border-t text-center">
                <button
                  onClick={() => setEmailPage(p => p + 1)}
                  className="text-sm text-orange-600 hover:text-gray-800"
                >
                  Weitere {Math.min(EMAILS_PER_PAGE, allFeedItems.length - emailPage * EMAILS_PER_PAGE)} laden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name</Label>
                <Input value={editForm.firstName} onChange={(e: any) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div><Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e: any) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div><Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e: any) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div><Label>Job Title</Label>
              <Input value={editForm.jobTitle} onChange={(e: any) => setEditForm({ ...editForm, jobTitle: e.target.value })} />
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm">E-Mail Addresses</h4>
              <div className="space-y-2">
                {(['email', 'email2', 'email3', 'email4', 'email5'] as const).map((field, i) => (
                  <div key={field}>
                    <Label className="text-xs text-gray-500">E-Mail {i + 1}{i === 0 ? ' (primary)' : ''}</Label>
                    <Input value={(editForm as any)[field]} type="email"
                      onChange={(e: any) => setEditForm({ ...editForm, [field]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={editForm.contactStatus} onValueChange={(v: any) => setEditForm({ ...editForm, contactStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['cold', 'warm', 'hot', 'active', 'inactive'].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={(editForm as any).contactType} onValueChange={(v: any) => setEditForm({ ...editForm, contactType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['prospect', 'customer', 'partner', 'supplier', 'staff', 'staff_plus'].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e: any) => setEditForm({ ...editForm, notes: e.target.value })} className="min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!id) return;
                updateContact.mutate({
                  id, firstName: editForm.firstName, lastName: editForm.lastName,
                  email: editForm.email || undefined,
                  email2: editForm.email2 || null, email3: editForm.email3 || null,
                  email4: editForm.email4 || null, email5: editForm.email5 || null,
                  phone: editForm.phone || undefined, jobTitle: editForm.jobTitle || undefined,
                  contactStatus: editForm.contactStatus,
                  contactType: (editForm as any).contactType,
                  notes: editForm.notes || undefined
                });
              }} disabled={updateContact.isPending}>
                {updateContact.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── File Upload Dialog ───────────────────────────────────────────── */}
      {showUpload && (
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
            <FileUploadActivity contactId={id!} onUploadSuccess={() => { setShowUpload(false); refetchActivities(); }} />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add to List Dialog ───────────────────────────────────────────── */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add to Distribution List</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {(allLists as any[]).length > 0 && (
              <div>
                <Label className="mb-2 block text-sm">Existing Lists</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(allLists as any[]).map((list: any) => {
                    const isIn = (contactLists as any[]).some((cl: any) => cl.listId === list.id);
                    return (
                      <div key={list.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${isIn ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                        onClick={() => { if (!isIn) addToList.mutate({ distributionListId: list.id, contactId: id! }); }}>
                        <span>{list.name}</span>
                        {isIn && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <Label className="mb-2 block text-sm">Create New List</Label>
              <Input placeholder="List name" value={newListName} onChange={(e: any) => setNewListName(e.target.value)} className="mb-2" />
              <Input placeholder="Description (optional)" value={newListDescription} onChange={(e: any) => setNewListDescription(e.target.value)} className="mb-3" />
              <Button onClick={() => {
                if (newListName.trim()) createList.mutate({ name: newListName.trim(), description: newListDescription });
              }} disabled={!newListName.trim()} className="w-full">
                Create & Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
