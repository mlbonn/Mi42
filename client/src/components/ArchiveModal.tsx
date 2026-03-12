import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';

interface ArchiveModalProps {
  email: {
    id: number;
    subject: string;
    fromName: string;
    fromAddress: string;
    toAddress: string;
    ccAddress?: string;
    body: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

interface ExtractedContact {
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  confidence: 'high' | 'low' | 'none';
}

export default function ArchiveModal({ email, onClose, onSuccess }: ArchiveModalProps) {
  const [loading, setLoading] = useState(true);
  const [suggestedContact, setSuggestedContact] = useState<Contact | null>(null);
  const [additionalContacts, setAdditionalContacts] = useState<Contact[]>([]);
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [extractedContact, setExtractedContact] = useState<ExtractedContact | null>(null);
  const [deleteAfterArchive, setDeleteAfterArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const findContactsMutation = trpc.emailClient.findContactsByEmails.useMutation();
  const extractContactMutation = trpc.emailClient.extractContactFromSignature.useMutation();
  const archiveEmailMutation = trpc.emailClient.archiveEmail.useMutation();
  const searchContactsMutation = trpc.contacts.searchContacts.useMutation();

  // Initial: Find contacts by email addresses
  useEffect(() => {
    const emails = [email.fromAddress];
    if (email.toAddress) emails.push(email.toAddress);
    if (email.ccAddress) {
      email.ccAddress.split(',').forEach(cc => emails.push(cc.trim()));
    }

    findContactsMutation.mutate(
      { emails },
      {
        onSuccess: (data) => {
          // First email (from) is suggested contact
          if (data[email.fromAddress] && data[email.fromAddress].length > 0) {
            setSuggestedContact(data[email.fromAddress][0]);
          }

          // Other emails are additional contacts
          const additional: Contact[] = [];
          Object.entries(data).forEach(([emailAddr, contacts]) => {
            if (emailAddr !== email.fromAddress && contacts.length > 0) {
              additional.push(...contacts);
            }
          });
          setAdditionalContacts(additional);
          setLoading(false);

          // If no contact found, extract from signature
          if (!data[email.fromAddress] || data[email.fromAddress].length === 0) {
            extractContactMutation.mutate(
              { emailBody: email.body, fromAddress: email.fromAddress },
              {
                onSuccess: (extracted) => {
                  setExtractedContact(extracted);
                },
              }
            );
          }
        },
        onError: () => {
          setLoading(false);
        },
      }
    );
  }, []);

  // Search contacts
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchContactsMutation.mutate(
        { query: searchQuery },
        {
          onSuccess: (results) => {
            setSearchResults(results);
          },
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleArchive = async () => {
    if (!suggestedContact) {
      alert('Bitte wählen Sie einen Kontakt aus oder legen Sie einen neuen an.');
      return;
    }

    setArchiving(true);

    try {
      const contactIds = [suggestedContact.id, ...selectedAdditionalIds];

      await archiveEmailMutation.mutateAsync({
        emailId: email.id,
        contactIds,
        deleteAfterArchive,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Archive error:', error);
      alert('Fehler beim Archivieren der E-Mail');
      setArchiving(false);
    }
  };

  const toggleAdditionalContact = (id: number) => {
    setSelectedAdditionalIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Suche nach Kontakten...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">📧 Email archivieren</h2>
          <p className="text-sm text-gray-600 mb-4">
            Betreff: {email.subject}
            <br />
            Email-ID: {email.id}
          </p>

          {/* Suggested Contact */}
          {suggestedContact && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                ✅ VORGESCHLAGENER KONTAKT
              </h3>
              <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      👤 {suggestedContact.firstName} {suggestedContact.lastName}
                      {suggestedContact.company && ` | ${suggestedContact.company}`}
                    </p>
                    <p className="text-sm text-gray-600">✉️ {suggestedContact.email}</p>
                    <p className="text-xs text-green-600 mt-1">[Automatisch gefunden]</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Recipients */}
          {additionalContacts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                📋 WEITERE EMPFÄNGER (Optional)
              </h3>
              <div className="space-y-2">
                {additionalContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleAdditionalContact(contact.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAdditionalIds.includes(contact.id)}
                        onChange={() => toggleAdditionalContact(contact.id)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                          {contact.company && ` | ${contact.company}`}
                        </p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search for additional contacts */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              🔍 Weiteren Kontakt suchen...
            </h3>
            <input
              type="text"
              placeholder="Name, E-Mail oder Firma eingeben..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      if (!suggestedContact) {
                        setSuggestedContact(contact);
                      } else {
                        toggleAdditionalContact(contact.id);
                      }
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                      {contact.company && ` | ${contact.company}`}
                    </p>
                    <p className="text-sm text-gray-600">{contact.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Contact Form */}
          {!suggestedContact && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                ➕ KONTAKT NICHT GEFUNDEN?
              </h3>
              <button
                onClick={() => setShowNewContactForm(!showNewContactForm)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 hover:bg-orange-50 transition"
              >
                <span className="text-orange-600 font-medium">
                  + Neuen Kontakt anlegen
                </span>
              </button>

              {showNewContactForm && extractedContact && (
                <div className="mt-4 border rounded-lg p-4 bg-blue-50">
                  <p className="text-sm font-semibold text-blue-900 mb-3">
                    🤖 KI-Vorschlag aus Signatur:
                  </p>
                  <div className="space-y-2 text-sm">
                    {extractedContact.firstName && (
                      <p>• Name: {extractedContact.firstName} {extractedContact.lastName}</p>
                    )}
                    {extractedContact.company && <p>• Company: {extractedContact.company}</p>}
                    {extractedContact.title && <p>• Title: {extractedContact.title}</p>}
                    {extractedContact.phone && <p>• Phone: {extractedContact.phone}</p>}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Confidence: {extractedContact.confidence}
                  </p>
                  <button
                    className="mt-3 w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
                    onClick={() => {
                      // TODO: Open contact creation modal with pre-filled data
                      alert('Contact creation modal would open here with pre-filled data');
                    }}
                  >
                    Bearbeiten & Speichern
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete after archive option */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAfterArchive}
                onChange={(e) => setDeleteAfterArchive(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Mail nach Archivierung löschen</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={archiving}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving || !suggestedContact}
              className="flex-1 bg-orange-600 text-white rounded-lg px-4 py-2 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {archiving ? 'Archiviere...' : 'Archivieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
