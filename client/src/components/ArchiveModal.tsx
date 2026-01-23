import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '../lib/trpc';

interface ArchiveModalProps {
  isOpen?: boolean;
  onClose: () => void;
  emailId: string;
  fromAddress: string;
  ccAddresses: string[];
  onSuccess: () => void;
  email?: { 
    from: string; 
    fromName?: string;
    to?: string;
    subject: string;
    body?: string;
    html?: string;
    date?: string;
    attachments?: Array<{
      filename: string;
      contentType: string;
      size: number;
      content?: string; // Base64
    }>;
  };
}

interface ContactMatch {
  email: string;
  contacts: Array<{
    id: number;
    name: string;
    email: string;
  }>;
  selected: number[];  // IDs of selected contacts
  createNew: boolean;
}

export default function ArchiveModal({ 
  isOpen = true,
  onClose, 
  emailId, 
  fromAddress, 
  ccAddresses, 
  onSuccess,
  email
}: ArchiveModalProps) {
  const [contactMatches, setContactMatches] = useState<ContactMatch[]>([]);
  const [deleteFromInbox, setDeleteFromInbox] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debug logging
  console.log('[ArchiveModal] Received email prop:', email);
  console.log('[ArchiveModal] email.fromName type:', typeof email?.fromName);
  console.log('[ArchiveModal] email.fromName value:', email?.fromName);

  // Collect all email addresses
  const allEmails = useMemo(() => 
    [fromAddress, ...ccAddresses].filter(e => e && e.trim()),
    [fromAddress, ccAddresses]
  );

  // Query to find contacts by emails (using useQuery instead of useMutation)
  const { data: contactsData, isLoading } = trpc.emailClient.findContactsByEmails.useQuery(
    { emails: allEmails },
    { enabled: isOpen && allEmails.length > 0 }
  );
  
  const archiveEmailMutation = trpc.emailClient.archiveEmail.useMutation();
  const createContactMutation = trpc.contacts.create.useMutation();
  const deleteEmailMutation = trpc.emailClient.deleteEmail.useMutation();

  // Initialize contact matches when data is loaded
  useEffect(() => {
    if (contactsData) {
      const matches: ContactMatch[] = allEmails.map(email => {
        const foundContacts = contactsData[email] || [];
        return {
          email,
          contacts: foundContacts,
          selected: foundContacts.length > 0 ? [foundContacts[0].id] : [],
          createNew: foundContacts.length === 0
        };
      });
      setContactMatches(matches);
    }
  }, [contactsData, allEmails]);

  const toggleContactSelection = (emailIndex: number, contactId: number) => {
    setContactMatches(prev => {
      const updated = [...prev];
      const match = updated[emailIndex];
      if (match.selected.includes(contactId)) {
        match.selected = match.selected.filter(id => id !== contactId);
      } else {
        match.selected = [...match.selected, contactId];
      }
      return updated;
    });
  };

  const toggleCreateNew = (emailIndex: number) => {
    setContactMatches(prev => {
      const updated = [...prev];
      updated[emailIndex].createNew = !updated[emailIndex].createNew;
      return updated;
    });
  };

  const handleArchive = async () => {
    setIsSaving(true);
    
    try {
      // Collect all selected contact IDs
      const selectedContactIds: number[] = [];
      const newContactEmails: string[] = [];

      contactMatches.forEach(match => {
        selectedContactIds.push(...match.selected);
        if (match.createNew && match.contacts.length === 0) {
          newContactEmails.push(match.email);
        }
      });

      // Archive email for each selected contact
      for (const contactId of selectedContactIds) {
            await archiveEmailMutation.mutateAsync({
              emailId,
              contactId: contactId.toString(),
              notes: `Archived from email: ${email?.subject || 'No subject'}`,
              // Pass email data from frontend
              fromAddress: fromAddress,
              fromName: email?.fromName || '',
              toAddress: email?.to || '',
              ccAddress: ccAddresses.join(', '),
              subject: email?.subject || '',
              body: email?.body || '',
              htmlBody: email?.html || '',
              emailDate: email?.date || new Date().toISOString(),
              attachments: email?.attachments || [],
            });
      }

      // Create new contacts if requested
      const createdContactIds: string[] = [];
      for (const emailAddr of newContactEmails) {
        try {
          const [localPart, domain] = emailAddr.split('@');
          const firstName = localPart.split('.')[0] || localPart;
          const lastName = localPart.split('.')[1] || '';
          
          const newContact = await createContactMutation.mutateAsync({
            firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
            lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '',
            email: emailAddr,
          });
          
          if (newContact && newContact.id) {
            createdContactIds.push(newContact.id);
            
            // Archive email for newly created contact
              await archiveEmailMutation.mutateAsync({
                emailId,
                contactId: newContact.id,
                notes: `Archived from email: ${email?.subject || 'No subject'} (New contact created)`,
                fromAddress: fromAddress,
                fromName: email?.fromName || '',
                toAddress: email?.to || '',
                ccAddress: ccAddresses.join(', '),
                subject: email?.subject || '',
                body: email?.body || '',
                htmlBody: email?.html || '',
                emailDate: email?.date || new Date().toISOString(),
                attachments: email?.attachments || [],
              });
          }
        } catch (error) {
          console.error(`Error creating contact for ${emailAddr}:`, error);
          alert(`Fehler beim Erstellen des Kontakts für ${emailAddr}`);
        }
      }

      // Delete from inbox if requested
      if (deleteFromInbox) {
        try {
          // Get account ID from email data (assuming it's available)
          // For now, we'll need to get the first email account
          // TODO: Pass accountId from EmailClient
          await deleteEmailMutation.mutateAsync({
            accountId: '1', // Default account ID
            folder: 'INBOX',
            messageUid: emailId,
          });
        } catch (error) {
          console.error('Error deleting email from inbox:', error);
          // Don't fail the whole operation if delete fails
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error archiving email:', error);
      alert('Fehler beim Archivieren der Email');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Email archivieren</h2>
        
        {email && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Betreff: {email.subject}</div>
            <div className="text-xs text-gray-500">Email ID: {emailId}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Suche nach Kontakten...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {contactMatches.map((match, index) => (
              <div key={index} className="border rounded p-4">
                <div className="font-semibold mb-2">{match.email}</div>
                
                {match.contacts.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Gefundene Kontakte:</div>
                    {match.contacts.map(contact => (
                      <label key={contact.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={match.selected.includes(contact.id)}
                          onChange={() => toggleContactSelection(index, contact.id)}
                          className="rounded"
                        />
                        <span>{contact.name} ({contact.email})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-2">
                    Kein Kontakt gefunden
                  </div>
                )}

                <label className="flex items-center space-x-2 mt-3 pt-3 border-t">
                  <input
                    type="checkbox"
                    checked={match.createNew}
                    onChange={() => toggleCreateNew(index)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-blue-600">
                    Neuen Kontakt anlegen
                  </span>
                </label>
              </div>
            ))}

            <div className="border-t pt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={deleteFromInbox}
                  onChange={(e) => setDeleteFromInbox(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Mail im Eingang löschen
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleArchive}
            disabled={isLoading || isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? 'Archiviere...' : 'Archivieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
