import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { 
  Mail, Phone, Building2, Calendar, Edit, ArrowLeft, Plus, X, 
  CheckCircle, Circle, Clock3, Reply, Forward, Trash2, RefreshCw,
  Upload, FileText, Paperclip, ArrowDownLeft, ArrowUpRight, Archive,
  ChevronDown, ChevronUp, ExternalLink, MoreHorizontal, Users, Download
} from 'lucide-react';
import FileUploadActivity from '@/components/FileUploadActivity';
import { EmailHistoryTimeline } from '@/components/EmailHistoryTimeline';

export default function ContactDetail() {
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [showListDialog, setShowListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [emailPage, setEmailPage] = useState(1);
  const EMAILS_PER_PAGE = 20;

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    email2: '',
    email3: '',
    email4: '',
    email5: '',
    phone: '',
    jobTitle: '',
    contactStatus: 'cold' as 'cold' | 'warm' | 'hot' | 'active' | 'inactive',
    contactType: 'prospect' as 'partner' | 'supplier' | 'customer' | 'staff' | 'staff_plus' | 'prospect',
    notes: ''
  });

  // Queries - using correct API endpoints
  const { data: contact, isLoading: contactLoading, refetch: refetchContact } = trpc.contacts.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const { data: emails = [], refetch: refetchEmails } = trpc.emails.listByContact.useQuery(
    { contactId: id! },
    { enabled: !!id }
  );

  const { data: activities = [], refetch: refetchActivities } = trpc.activities.listByContact.useQuery(
    { contactId: id! },
    { enabled: !!id }
  );

  const { data: archivedEmailsFromDB = [] } = trpc.contacts.getArchivedEmails.useQuery(
    { contactId: id! },
    { enabled: !!id }
  );

  const { data: companies = [] } = trpc.contacts.getCompanies.useQuery(
    { contactId: id! },
    { enabled: !!id }
  );

  const { data: contactLists = [], refetch: refetchContactLists } = trpc.distributionLists.getByContactId.useQuery(
    { contactId: id! },
    { enabled: !!id }
  );

  const { data: allLists = [] } = trpc.distributionLists.list.useQuery();

  // Mutations
  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      refetchContact();
      setIsEditing(false);
    }
  });

  const addToListMutation = trpc.distributionLists.addContact.useMutation({
    onSuccess: () => {
      refetchContactLists();
    }
  });

  const removeFromListMutation = trpc.distributionLists.removeContact.useMutation({
    onSuccess: () => {
      refetchContactLists();
    }
  });

  const createListMutation = trpc.distributionLists.create.useMutation({
    onSuccess: (newList) => {
      if (newList && id) {
        addToListMutation.mutate({ distributionListId: newList.id, contactId: id });
      }
      setShowListDialog(false);
      setNewListName('');
      setNewListDescription('');
    }
  });

  // Initialize edit form when contact loads
  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        email2: (contact as any).email2 || '',
        email3: (contact as any).email3 || '',
        email4: (contact as any).email4 || '',
        email5: (contact as any).email5 || '',
        phone: contact.phone || '',
        jobTitle: contact.jobTitle || '',
        contactStatus: (contact.contactStatus as any) || 'cold',
        contactType: ((contact as any).contactType as any) || 'prospect',
        notes: contact.notes || ''
      });
    }
  }, [contact]);

  const handleSaveContact = () => {
    if (!id) return;
    updateContactMutation.mutate({
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
      contactType: (editForm as any).contactType,
      notes: editForm.notes || undefined
    });
  };

  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const toggleAllEmails = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e: any) => e.id)));
    }
  };

  const toggleEmailExpand = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter activities to exclude Email Archive (show only file uploads, notes, etc.)
  const nonEmailActivities = activities.filter((a: any) => 
    a.activityType !== 'Email Archive' && 
    a.activityType !== 'email' &&
    !a.subject?.startsWith('📧')
  );
  
  // Get archived emails from activities (Email Archive type)
  // Extract sender/recipient from email content using regex
  const extractEmailFromContent = (content: string, type: 'from' | 'to'): string => {
    if (!content) return 'Unbekannt';
    // Look for From:/Von: or To:/An: patterns in the forwarded email header
    const patterns = type === 'from' 
      ? [/From:\s*"?([^"<]+)?"?\s*<([^>]+)>/i, /Von:\s*"?([^"<]+)?"?\s*<([^>]+)>/i, /From:\s*([^\n<]+)/i, /Von:\s*([^\n<]+)/i]
      : [/To:\s*"?([^"<]+)?"?\s*<([^>]+)>/i, /An:\s*"?([^"<]+)?"?\s*<([^>]+)>/i, /To:\s*([^\n<]+)/i, /An:\s*([^\n<]+)/i];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // Return email address if found, otherwise the name
        return match[2] || match[1]?.trim() || 'Unbekannt';
      }
    }
    return 'Unbekannt';
  };

  // Map archived emails from DB to display format
  const archivedEmails = archivedEmailsFromDB.map((email: any) => ({
    id: `archived-${email.id}`,
    subject: email.subject || '(Kein Betreff)',
    fromAddress: email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address,
    toAddress: email.to_address,
    timestamp: email.email_date,
    direction: 'inbound', // Archived emails are typically inbound
    body: email.body,
    htmlBody: email.html_body,
    notes: email.notes,
    isArchived: true,
    archivedAt: email.archived_at
  }));
  
  // Combine emails from both sources
  const allEmailsForDisplay = [...emails, ...archivedEmails].sort((a: any, b: any) => {
    const dateA = new Date(a.timestamp || a.createdAt || 0);
    const dateB = new Date(b.timestamp || b.createdAt || 0);
    return dateB.getTime() - dateA.getTime(); // Sort by date descending
  });

  // Get all contact email addresses for display in header
  const contactEmailAddresses = [
    contact?.email,
    (contact as any)?.email2,
    (contact as any)?.email3,
    (contact as any)?.email4,
    (contact as any)?.email5
  ].filter(Boolean);
  
  // Pagination for combined emails
  const paginatedEmails = allEmailsForDisplay.slice(0, emailPage * EMAILS_PER_PAGE);
  const hasMoreEmails = allEmailsForDisplay.length > emailPage * EMAILS_PER_PAGE;

  if (contactLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lädt...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Kontakt nicht gefunden</div>
      </div>
    );
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  const companyNames = companies.map((c: any) => c.name).join(', ') || 'Keine';

  return (
    <div className="p-6">
      {/* Back Link */}
      <Link href="/contacts">
        <a className="text-orange-600 hover:text-gray-800 text-sm mb-4 inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Zurück zur Kontaktliste
        </a>
      </Link>

      {/* Main Header Card - Full Width */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Top Row: Name, Position, Phone, Companies, Status */}
            <div className="flex items-center gap-4 flex-wrap mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{fullName || 'Unbenannt'}</h1>
              {contact.jobTitle && (
                <span className="text-gray-500">{contact.jobTitle}</span>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Phone className="h-4 w-4" />
                  {contact.phone}
                </a>
              )}
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-gray-500">Firmen:</span>
                <span>{companyNames}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                contact.contactStatus === 'active' ? 'bg-green-100 text-green-800' :
                contact.contactStatus === 'hot' ? 'bg-red-100 text-red-800' :
                contact.contactStatus === 'warm' ? 'bg-orange-100 text-orange-800' :
                contact.contactStatus === 'cold' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {contact.contactStatus ? contact.contactStatus.charAt(0).toUpperCase() + contact.contactStatus.slice(1) : 'Cold'}
              </span>
            </div>
            
            {/* Email Addresses Row */}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Mail className="h-4 w-4" />
                  {contact.email}
                </a>
              )}
              {(contact as any).email2 && (
                <a href={`mailto:${(contact as any).email2}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Mail className="h-4 w-4" />
                  {(contact as any).email2}
                </a>
              )}
              {(contact as any).email3 && (
                <a href={`mailto:${(contact as any).email3}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Mail className="h-4 w-4" />
                  {(contact as any).email3}
                </a>
              )}
              {(contact as any).email4 && (
                <a href={`mailto:${(contact as any).email4}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Mail className="h-4 w-4" />
                  {(contact as any).email4}
                </a>
              )}
              {(contact as any).email5 && (
                <a href={`mailto:${(contact as any).email5}`} className="flex items-center gap-1 text-orange-600 hover:text-gray-800">
                  <Mail className="h-4 w-4" />
                  {(contact as any).email5}
                </a>
              )}
              {!contact.email && !(contact as any).email2 && !(contact as any).email3 && !(contact as any).email4 && !(contact as any).email5 && (
                <span className="text-gray-400 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Keine E-Mail-Adresse
                </span>
              )}

            {/* Address Section */}
            {((contact as any).street || (contact as any).city || (contact as any).country) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {(contact as any).street && (
                      <span>{(contact as any).street}</span>
                    )}
                    {((contact as any).postalCode || (contact as any).city) && (
                      <span>
                        {(contact as any).postalCode && `${(contact as any).postalCode} `}
                        {(contact as any).city}
                      </span>
                    )}
                    {(contact as any).state && (
                      <span>{(contact as any).state}</span>
                    )}
                    {(contact as any).country && (
                      <span>{(contact as any).country}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* Edit Button */}
            <Button onClick={() => setIsEditing(true)} variant="default">
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        </div>
      </div>

      {/* Email History Timeline */}


      {/* Bottom Section - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Lists Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase">Verteiler</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowListDialog(true)}
              className="h-6 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {contactLists.length > 0 ? (
            <div className="space-y-1">
              {contactLists.map((list: any) => (
                <div key={list.id} className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span>{list.listName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromListMutation.mutate({
                      contactId: id!,
                      distributionListId: list.listId
                    })}
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Verteiler</p>
          )}
        </div>

        {/* Activities Section */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-500 uppercase">Aktivitäten</h3>
              <span className="text-xs text-gray-400">({nonEmailActivities.length})</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Datei hochladen
            </Button>
          </div>

          {nonEmailActivities.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {nonEmailActivities.map((activity: any) => (
                <div 
                  key={activity.id} 
                  className="p-2 hover:bg-gray-50 rounded cursor-pointer group"
                  onClick={() => {
                    // For Document type activities, trigger download
                    if (activity.activityType === 'Document' || activity.activityType === 'file_upload' || activity.activityType === 'File Upload') {
                      // Create a hidden anchor element to trigger download
                      const link = document.createElement('a');
                      link.href = `/api/download/activity/${activity.id}`;
                      link.download = activity.subject || 'download';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {activity.activityType === 'Document' || activity.activityType === 'file_upload' || activity.activityType === 'File Upload' ? (
                        <Paperclip className="h-4 w-4 text-gray-400" />
                      ) : activity.activityType === 'note' || activity.activityType === 'Note' ? (
                        <FileText className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm group-hover:text-orange-600">{activity.subject}</span>
                      {activity.description && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{activity.description}</p>
                      )}
                    </div>
                    {(activity.activityType === 'Document' || activity.activityType === 'file_upload' || activity.activityType === 'File Upload') && (
                      <Download className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <FileText className="h-6 w-6 mx-auto mb-1 text-gray-300" />
              <p className="text-sm">Keine Aktivitäten</p>
            </div>
          )}
        </div>

        {/* Notes Card */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase">Notizen</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="h-6 px-2 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Bearbeiten
            </Button>
          </div>
          {contact.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          ) : (
            <p className="text-sm text-gray-500 cursor-pointer hover:text-orange-600" onClick={() => setIsEditing(true)}>
              Klicken zum Hinzufügen...
            </p>
          )}
        </div>
      <EmailHistoryTimeline


        emails={allEmailsForDisplay.map((email: any) => ({


          id: email.id,


          subject: email.subject,


          from_address: email.fromAddress,


          from_name: email.fromName,


          to_address: email.toAddress,


          email_date: email.email_date || email.timestamp,


          body: email.body,


          html_body: email.htmlBody,


          direction: email.direction,


          attachments: email.attachments || []


        }))}


        onRefresh={() => refetchEmails()}


        onArchive={() => {/* TODO: Implement archive */}}


      />




      
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kontakt bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vorname</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e: any) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label>Nachname</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e: any) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label>Telefon</Label>
              <Input
                value={editForm.phone}
                onChange={(e: any) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            <div>
              <Label>Position</Label>
              <Input
                value={editForm.jobTitle}
                onChange={(e: any) => setEditForm({ ...editForm, jobTitle: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">E-Mail-Adressen</h4>
              <div className="space-y-3">
                <div>
                  <Label>E-Mail 1 (primär)</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e: any) => setEditForm({ ...editForm, email: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>E-Mail 2</Label>
                  <Input
                    value={editForm.email2}
                    onChange={(e: any) => setEditForm({ ...editForm, email2: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>E-Mail 3</Label>
                  <Input
                    value={editForm.email3}
                    onChange={(e: any) => setEditForm({ ...editForm, email3: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>E-Mail 4</Label>
                  <Input
                    value={editForm.email4}
                    onChange={(e: any) => setEditForm({ ...editForm, email4: e.target.value })}
                    type="email"
                  />
                </div>
                <div>
                  <Label>E-Mail 5</Label>
                  <Input
                    value={editForm.email5}
                    onChange={(e: any) => setEditForm({ ...editForm, email5: e.target.value })}
                    type="email"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.contactStatus}
                  onValueChange={(value: any) => setEditForm({ ...editForm, contactStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Typ</Label>
                <Select
                  value={(editForm as any).contactType}
                  onValueChange={(value: any) => setEditForm({ ...editForm, contactType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="staff_plus">Staff Plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notizen</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e: any) => setEditForm({ ...editForm, notes: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveContact} disabled={updateContactMutation.isPending}>
                {updateContactMutation.isPending ? 'Speichert...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      {showUpload && (
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Datei hochladen</DialogTitle>
            </DialogHeader>
            <FileUploadActivity
              contactId={id!}
              onUploadSuccess={() => {
                setShowUpload(false);
                refetchActivities();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add to List Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zu Verteiler hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing lists */}
            {allLists.length > 0 && (
              <div>
                <Label className="mb-2 block">Bestehende Verteiler</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {allLists.map((list: any) => {
                    const isInList = contactLists.some((cl: any) => cl.listId === list.id);
                    return (
                      <div
                        key={list.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                          isInList ? 'bg-green-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (!isInList) {
                            addToListMutation.mutate({ distributionListId: list.id, contactId: id! });
                          }
                        }}
                      >
                        <span>{list.name}</span>
                        {isInList && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create new list */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Neuen Verteiler erstellen</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Name des Verteilers"
                  value={newListName}
                  onChange={(e: any) => setNewListName(e.target.value)}
                />
                <Input
                  placeholder="Beschreibung (optional)"
                  value={newListDescription}
                  onChange={(e: any) => setNewListDescription(e.target.value)}
                />
                <Button
                  onClick={() => createListMutation.mutate({
                    name: newListName,
                    description: newListDescription || undefined
                  })}
                  disabled={!newListName || createListMutation.isPending}
                  className="w-full"
                >
                  {createListMutation.isPending ? 'Erstellt...' : 'Erstellen und hinzufügen'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
