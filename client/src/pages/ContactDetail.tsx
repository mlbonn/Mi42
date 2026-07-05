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

function displayAddr(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as { name?: string; email?: string };
      return obj.name ? `${obj.name} <${obj.email ?? ''}>` : (obj.email ?? raw);
    } catch { /* ignore */ }
  }
  return raw;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactStatus = 'cold' | 'warm' | 'hot' | 'active' | 'inactive';
type ContactType = 'partner' | 'supplier' | 'customer' | 'staff' | 'staff_plus' | 'prospect';
type FeedFilter = 'all' | 'email' | 'call' | 'note' | 'file';

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
  attachments?: Array<{ filename: string; size_bytes?: number; content_type?: string }>;
}

interface EditFormState {
  firstName: string;
  lastName: string;
  email: string;
  email2: string;
  email3: string;
  email4: string;
  email5: string;
  phone: string;
  jobTitle: string;
  contactStatus: ContactStatus;
  contactType: ContactType;
  notes: string;
}

// Typen aus tRPC-Inferenz (Drizzle schema.ts Contact)
interface ContactRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  email2?: string | null;
  email3?: string | null;
  email4?: string | null;
  email5?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  contactStatus?: string | null;
  contactType?: string | null;
  notes?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

interface CompanyRow {
  id: string;
  name?: string | null;
}

interface ListRow {
  id: string;
  listId?: string;
  listName?: string;
  name?: string;
}

interface ArchivedEmailRow {
  id: string;
  from_address?: string | null;
  from_name?: string | null;
  to_address?: string | null;
  subject?: string | null;
  email_date?: string | null;
  body?: string | null;
  html_body?: string | null;
  notes?: string | null;
  archived_at?: string | null;
}

interface EmailRow {
  id: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  subject?: string | null;
  timestamp?: string | Date | null;
  createdAt?: string | Date | null;
  direction?: string | null;
  body?: string | null;
  htmlBody?: string | null;
  attachments?: Array<{ id: string; name?: string | null; size?: number | null }>;
}

interface ActivityRow {
  id: string;
  activityType?: string | null;
  subject?: string | null;
  content?: string | null;
  activityDate?: string | Date | null;
  createdAt?: string | Date | null;
  createdBy?: string | null;
  direction?: string | null;
}

// ─── Status-Badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  cold: 'Cold', warm: 'Warm', hot: 'Hot', active: 'Active', inactive: 'Inactive',
};

function statusBadgeClass(status: string | null | undefined): string {
  if (status === 'hot') return 'bg-[#E48F00]/10 text-[#E48F00]';
  return 'bg-gray-100 text-gray-600';
}

// ─── Filter-Chips ─────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ key: FeedFilter; label: string }> = [
  { key: 'all',   label: 'Alle' },
  { key: 'email', label: 'E-Mails' },
  { key: 'call',  label: 'Anrufe' },
  { key: 'note',  label: 'Notizen' },
  { key: 'file',  label: 'Dateien' },
];

function matchesFilter(item: FeedItem, filter: FeedFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'email') return item.type === 'email';
  if (filter === 'file') return item.activityType === 'Document' || item.activityType === 'file_upload' || item.activityType === 'File Upload';
  if (filter === 'call') return item.activityType === 'Call' || item.activityType === 'call';
  if (filter === 'note') return item.activityType === 'Note' || item.activityType === 'note';
  return true;
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
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: '', lastName: '', email: '', email2: '', email3: '',
    email4: '', email5: '', phone: '', jobTitle: '',
    contactStatus: 'cold',
    contactType: 'prospect',
    notes: ''
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: contactRaw, isLoading, refetch: refetchContact } = trpc.contacts.get.useQuery(
    { id: id! }, { enabled: !!id }
  );
  const contact = contactRaw as ContactRow | undefined;

  const { data: emailsRaw = [], refetch: refetchEmails } = trpc.emails.listByContact.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const emails = emailsRaw as EmailRow[];

  const { data: activitiesRaw = [], refetch: refetchActivities } = trpc.activities.listByContact.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const activities = activitiesRaw as ActivityRow[];

  const { data: archivedEmailsRaw = [] } = trpc.contacts.getArchivedEmails.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const archivedEmails = archivedEmailsRaw as ArchivedEmailRow[];

  const { data: companiesRaw = [] } = trpc.contacts.getCompanies.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const companies = companiesRaw as CompanyRow[];

  const { data: contactListsRaw = [], refetch: refetchContactLists } = trpc.distributionLists.getByContactId.useQuery(
    { contactId: id! }, { enabled: !!id }
  );
  const contactLists = contactListsRaw as ListRow[];

  const { data: allListsRaw = [] } = trpc.distributionLists.list.useQuery();
  const allLists = allListsRaw as ListRow[];

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
      const nl = newList as { id: string } | undefined;
      if (nl && id) addToList.mutate({ distributionListId: nl.id, contactId: id });
      setShowListDialog(false); setNewListName(''); setNewListDescription('');
    }
  });

  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName ?? '',
        lastName: contact.lastName ?? '',
        email: contact.email ?? '',
        email2: contact.email2 ?? '',
        email3: contact.email3 ?? '',
        email4: contact.email4 ?? '',
        email5: contact.email5 ?? '',
        phone: contact.phone ?? '',
        jobTitle: contact.jobTitle ?? '',
        contactStatus: (contact.contactStatus as ContactStatus) ?? 'cold',
        contactType: (contact.contactType as ContactType) ?? 'prospect',
        notes: contact.notes ?? ''
      });
    }
  }, [contact]);

  // ── Feed aufbauen ──────────────────────────────────────────────────────────

  const emailFeedItems: FeedItem[] = emails.map((e) => ({
    id: `email-${e.id}`,
    type: 'email',
    date: parseDate(e.timestamp ?? e.createdAt),
    subject: e.subject ?? '(Kein Betreff)',
    from: displayAddr(e.fromAddress),
    to: displayAddr(e.toAddress),
    direction: e.direction ?? 'inbound',
    body: e.body ?? undefined,
    htmlBody: e.htmlBody ?? undefined,
    attachments: (e.attachments ?? []).map(a => ({ filename: a.name ?? '', size_bytes: a.size ?? undefined })),
    isArchived: false,
  }));

  const archivedFeedItems: FeedItem[] = archivedEmails.map((e) => ({
    id: `archived-${e.id}`,
    type: 'email',
    date: parseDate(e.email_date ?? e.archived_at),
    subject: e.subject ?? '(Kein Betreff)',
    from: e.from_name ? `${e.from_name} <${e.from_address ?? ''}>` : (e.from_address ?? ''),
    to: e.to_address ?? '',
    direction: 'inbound',
    body: e.body ?? undefined,
    htmlBody: e.html_body ?? undefined,
    // archived_email_attachments: werden über getArchivedEmails nicht mitgeliefert
    // (separate Query nötig – Tabelle existiert, Router-Endpunkt folgt in Aufgabe 1.5)
    attachments: [],
    isArchived: true,
  }));

  const activityFeedItems: FeedItem[] = activities
    .filter((a) =>
      a.activityType !== 'Email Archive' &&
      a.activityType !== 'email' &&
      !(a.subject ?? '').startsWith('📧')
    )
    .map((a) => ({
      id: `activity-${a.id}`,
      type: 'activity',
      date: parseDate(a.activityDate ?? a.createdAt),
      subject: a.subject ?? '(Keine Beschreibung)',
      from: a.createdBy ?? '',
      to: '',
      direction: a.direction ?? '',
      activityType: a.activityType ?? undefined,
      body: a.content ?? undefined,
    }));

  // Deduplizieren: archived_emails und emails können sich überschneiden
  const archivedEmailIds = new Set(
    archivedEmails.map((e) => e.id).filter(Boolean)
  );
  const deduplicatedEmailItems = emailFeedItems.filter(
    (item) => !archivedEmailIds.has(item.id.replace('email-', ''))
  );

  const allFeedItems: FeedItem[] = [
    ...archivedFeedItems,
    ...deduplicatedEmailItems,
    ...activityFeedItems,
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const filteredFeedItems = allFeedItems.filter((item) => matchesFilter(item, feedFilter));
  const paginatedFeed = filteredFeedItems.slice(0, emailPage * EMAILS_PER_PAGE);
  const hasMore = filteredFeedItems.length > emailPage * EMAILS_PER_PAGE;

  const toggleExpand = (itemId: string) => {
    const s = new Set(expandedItems);
    s.has(itemId) ? s.delete(itemId) : s.add(itemId);
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

  const fullName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  const companyNames = companies.map((c) => c.name ?? '').filter(Boolean).join(', ') || '—';

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
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(contact.contactStatus)}`}>
                {STATUS_LABEL[contact.contactStatus ?? ''] ?? (contact.contactStatus ?? 'Cold')}
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
              {([contact.email, contact.email2, contact.email3, contact.email4, contact.email5] as (string | null | undefined)[])
                .filter((addr): addr is string => !!addr)
                .map((addr, i) => (
                  <a key={i} href={`mailto:${addr}`}
                    className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                    <Mail className="h-3.5 w-3.5" />{addr}
                  </a>
                ))}
              {!contact.email && !contact.email2 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Mail className="h-3.5 w-3.5" />Keine E-Mail-Adresse
                </span>
              )}
            </div>

            {/* Address */}
            {(contact.street || contact.city) && (
              <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-2">
                <Building2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {[contact.street,
                    [contact.postalCode, contact.city].filter(Boolean).join(' '),
                    contact.country
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
            {contactLists.length > 0 ? (
              <div className="space-y-1">
                {contactLists.map((list) => (
                  <div key={list.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <Users className="h-3 w-3 text-gray-400" />{list.listName ?? list.name ?? '—'}
                    </span>
                    <button
                      onClick={() => removeFromList.mutate({ contactId: id!, distributionListId: list.listId ?? list.id })}
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

            {/* Filter-Chips */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto">
              {FILTER_OPTIONS.map(({ key, label }) => {
                const count = key === 'all'
                  ? allFeedItems.length
                  : allFeedItems.filter(i => matchesFilter(i, key)).length;
                return (
                  <button
                    key={key}
                    onClick={() => { setFeedFilter(key); setEmailPage(1); }}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      feedFilter === key
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-1 ${feedFilter === key ? 'text-gray-300' : 'text-gray-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feed Items */}
            {paginatedFeed.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Keine Einträge</p>
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
                            <ArrowUpRight className="h-4 w-4 text-[#E48F00]" />
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
                            {/* Attachments */}
                            {(item.attachments?.length ?? 0) > 0 && (
                              <div className="border-t pt-2 mt-2 space-y-1">
                                {item.attachments!.map((att, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Paperclip className="h-3 w-3 text-gray-400" />
                                    <span>{att.filename}</span>
                                    {att.size_bytes != null && (
                                      <span className="text-gray-400">({Math.round(att.size_bytes / 1024)} KB)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
                  Weitere {Math.min(EMAILS_PER_PAGE, filteredFeedItems.length - emailPage * EMAILS_PER_PAGE)} laden
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
                <Input value={editForm.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div><Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div><Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div><Label>Job Title</Label>
              <Input value={editForm.jobTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, jobTitle: e.target.value })} />
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm">E-Mail Addresses</h4>
              <div className="space-y-2">
                {(['email', 'email2', 'email3', 'email4', 'email5'] as const).map((field, i) => (
                  <div key={field}>
                    <Label className="text-xs text-gray-500">E-Mail {i + 1}{i === 0 ? ' (primary)' : ''}</Label>
                    <Input value={editForm[field]} type="email"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, [field]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={editForm.contactStatus} onValueChange={(v: ContactStatus) => setEditForm({ ...editForm, contactStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['cold', 'warm', 'hot', 'active', 'inactive'] as ContactStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={editForm.contactType} onValueChange={(v: ContactType) => setEditForm({ ...editForm, contactType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['prospect', 'customer', 'partner', 'supplier', 'staff', 'staff_plus'] as ContactType[]).map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, notes: e.target.value })} className="min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!id) return;
                updateContact.mutate({
                  id,
                  firstName: editForm.firstName,
                  lastName: editForm.lastName,
                  email: editForm.email || undefined,
                  email2: editForm.email2 || null,
                  email3: editForm.email3 || null,
                  email4: editForm.email4 || null,
                  email5: editForm.email5 || null,
                  phone: editForm.phone || undefined,
                  jobTitle: editForm.jobTitle || undefined,
                  contactStatus: editForm.contactStatus,
                  contactType: editForm.contactType,
                  notes: editForm.notes || undefined,
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
            {allLists.length > 0 && (
              <div>
                <Label className="mb-2 block text-sm">Existing Lists</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {allLists.map((list) => {
                    const isIn = contactLists.some((cl) => (cl.listId ?? cl.id) === list.id);
                    return (
                      <div key={list.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${isIn ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                        onClick={() => { if (!isIn) addToList.mutate({ distributionListId: list.id, contactId: id! }); }}>
                        <span>{list.name ?? list.listName ?? '—'}</span>
                        {isIn && <CheckCircle className="h-4 w-4 text-[#E48F00]" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <Label className="mb-2 block text-sm">Create New List</Label>
              <Input placeholder="List name" value={newListName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewListName(e.target.value)} className="mb-2" />
              <Input placeholder="Description (optional)" value={newListDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewListDescription(e.target.value)} className="mb-3" />
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
