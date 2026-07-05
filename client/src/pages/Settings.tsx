import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Trash2, Edit, Star, Check, X } from 'lucide-react';

export default function Settings() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  
  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formServerUrl, setFormServerUrl] = useState('https://mail.bl2020.com');
  const [formIsPrimary, setFormIsPrimary] = useState(false);

  // Fetch all SmarterMail accounts
  const { data: accounts = [], refetch } = trpc.smartermailApiAccounts.list.useQuery();

  // Mutations
  const createMutation = trpc.smartermailApiAccounts.create.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Konto erfolgreich hinzugefügt!' });
      setTimeout(() => setMessage(null), 3000);
      refetch();
      closeModal();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Fehler: ${error.message}` });
    },
  });

  const updateMutation = trpc.smartermailApiAccounts.update.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Konto erfolgreich aktualisiert!' });
      setTimeout(() => setMessage(null), 3000);
      refetch();
      closeModal();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Fehler: ${error.message}` });
    },
  });

  const deleteMutation = trpc.smartermailApiAccounts.delete.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Konto erfolgreich gelöscht!' });
      setTimeout(() => setMessage(null), 3000);
      refetch();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Fehler: ${error.message}` });
    },
  });

  const setPrimaryMutation = trpc.smartermailApiAccounts.setPrimary.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Primary-Konto gesetzt!' });
      setTimeout(() => setMessage(null), 3000);
      refetch();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Fehler: ${error.message}` });
    },
  });

  const testConnectionMutation = trpc.smartermailApiAccounts.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Verbindung erfolgreich!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Verbindung fehlgeschlagen' });
      }
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Fehler: ${error.message}` });
    },
  });

  const openAddModal = () => {
    setEditingAccount(null);
    setFormEmail('');
    setFormPassword('');
    setFormServerUrl('https://mail.bl2020.com');
    setFormIsPrimary(accounts.length === 0); // First account is primary by default
    setShowAddModal(true);
  };

  const openEditModal = (account: any) => {
    setEditingAccount(account);
    setFormEmail(account.emailAddress);
    setFormPassword(''); // Don't pre-fill password for security
    setFormServerUrl(account.serverUrl || 'https://mail.bl2020.com');
    setFormIsPrimary(account.isPrimary);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAccount(null);
    setFormEmail('');
    setFormPassword('');
    setFormServerUrl('https://mail.bl2020.com');
    setFormIsPrimary(false);
  };

  const handleSave = async () => {
    if (!formEmail) {
      setMessage({ type: 'error', text: 'Bitte Email-Adresse eingeben' });
      return;
    }

    if (!editingAccount && !formPassword) {
      setMessage({ type: 'error', text: 'Bitte Passwort eingeben' });
      return;
    }

    if (editingAccount) {
      // Update existing account
      const updateData: any = {
        id: editingAccount.id,
        emailAddress: formEmail,
        serverUrl: formServerUrl,
        isPrimary: formIsPrimary,
      };
      if (formPassword) {
        updateData.password = formPassword;
      }
      await updateMutation.mutateAsync(updateData);
    } else {
      // Create new account
      await createMutation.mutateAsync({
        emailAddress: formEmail,
        password: formPassword,
        serverUrl: formServerUrl,
        isPrimary: formIsPrimary,
      });
    }
  };

  const handleDelete = async (accountId: number) => {
    if (!confirm('Möchten Sie dieses Konto wirklich löschen?')) {
      return;
    }
    await deleteMutation.mutateAsync({ id: accountId });
  };

  const handleSetPrimary = async (accountId: number) => {
    await setPrimaryMutation.mutateAsync({ id: accountId });
  };

  const handleTestConnection = async () => {
    if (!formEmail || !formPassword) {
      setMessage({ type: 'error', text: 'Bitte Email und Passwort eingeben' });
      return;
    }
    await testConnectionMutation.mutateAsync({
      emailAddress: formEmail,
      password: formPassword,
      serverUrl: formServerUrl,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SmarterMail Accounts Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📧 Email-Konten (SmarterMail)</h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-bl2020-orange text-white rounded-lg hover:bg-bl2020-orange-dark transition"
          >
            <Plus className="h-4 w-4" />
            Neues Konto hinzufügen
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Verwalten Sie Ihre SmarterMail Email-Konten für den Email-Client.
        </p>

        {/* Accounts List */}
        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account: any) => (
              <div
                key={account.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {account.isPrimary && (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      )}
                      <h3 className="text-lg font-semibold">{account.emailAddress}</h3>
                      {account.isPrimary && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Primary
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          account.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {account.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Server: {account.serverUrl}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Erstellt: {new Date(account.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!account.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(account.id)}
                        className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition"
                        title="Als Primary setzen"
                      >
                        Als Primary
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(account)}
                      className="p-2 text-orange-600 hover:bg-gray-50 rounded transition"
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Löschen"
                      disabled={accounts.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Keine Email-Konten vorhanden</p>
            <p className="text-sm mt-2">Fügen Sie Ihr erstes Konto hinzu, um zu starten.</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">ℹ️ Hinweise</h3>
        <ul className="text-sm text-gray-800 space-y-2">
          <li>✓ Sie können mehrere SmarterMail-Konten hinzufügen</li>
          <li>✓ Das Primary-Konto wird standardmäßig im Email-Client verwendet</li>
          <li>✓ Passwörter werden verschlüsselt gespeichert</li>
          <li>✓ Mindestens ein Konto muss vorhanden sein</li>
        </ul>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingAccount ? 'Konto bearbeiten' : 'Neues Konto hinzufügen'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email-Adresse *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="z.B. ml@bl2020.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort {editingAccount && '(leer lassen um nicht zu ändern)'}
                  {!editingAccount && ' *'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Server URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server URL (optional)
                </label>
                <input
                  type="text"
                  value={formServerUrl}
                  onChange={(e) => setFormServerUrl(e.target.value)}
                  placeholder="https://mail.bl2020.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Primary Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formIsPrimary}
                  onChange={(e) => setFormIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <label htmlFor="isPrimary" className="ml-2 text-sm font-medium text-gray-700">
                  Als Primary-Konto setzen
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 transition"
                >
                  {testConnectionMutation.isPending ? 'Teste...' : 'Verbindung testen'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-bl2020-orange text-white rounded-lg hover:bg-bl2020-orange-dark disabled:bg-blue-300 transition"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Speichere...'
                    : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
