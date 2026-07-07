import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { 
  Mail, Plus, Trash2, Save, RefreshCw, CheckCircle2, XCircle, Loader2, 
  Eye, EyeOff, Server, Settings2, AlertCircle
} from 'lucide-react';

interface EmailAccount {
  id: string;
  name: string;
  email: string;
  purpose: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapSsl: boolean;
  deleteAfterFetch: boolean;
  markAsReadAfterFetch: boolean;
  fetchIntervalMinutes: number;
  isActive: boolean;
  lastFetchAt: string | null;
  lastError: string | null;
}

const purposeLabels: Record<string, string> = {
  archive: 'Archiv (Dokumente)',
  bounces: 'Rückläufer (Bounces)',
  replies: 'Antworten',
  general: 'Allgemein',
};

export default function EmailSettings() {
  const utils = trpc.useUtils();
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch email accounts
  const { data: accounts, isLoading } = trpc.emailAccounts.list.useQuery();

  // Mutations
  const createMutation = (trpc.emailAccounts.create as any).useMutation({
    onSuccess: () => {
      utils.emailAccounts.list.invalidate();
      setEditingAccount(null);
      alert('E-Mail-Konto erfolgreich erstellt!');
    },
    onError: (error: any) => {
      alert(`Fehler: ${error.message}`);
    },
  });

  const updateMutation = (trpc.emailAccounts.update as any).useMutation({
    onSuccess: () => {
      utils.emailAccounts.list.invalidate();
      setEditingAccount(null);
      alert('E-Mail-Konto erfolgreich aktualisiert!');
    },
    onError: (error: any) => {
      alert(`Fehler: ${error.message}`);
    },
  });

  const deleteMutation = (trpc.emailAccounts.delete as any).useMutation({
    onSuccess: () => {
      utils.emailAccounts.list.invalidate();
      alert('E-Mail-Konto gelöscht!');
    },
  });

  const testConnectionMutation = ((trpc.emailAccounts as any).testConnection as any).useMutation();

  const handleNewAccount = () => {
    setEditingAccount({
      id: '',
      name: '',
      email: '',
      purpose: 'archive',
      imapHost: '',
      imapPort: 993,
      imapUser: '',
      imapPassword: '',
      imapSsl: true,
      deleteAfterFetch: true,
      markAsReadAfterFetch: true,
      fetchIntervalMinutes: 5,
      isActive: true,
      lastFetchAt: null,
      lastError: null,
    });
    setTestResult(null);
  };

  const handleSave = () => {
    if (!editingAccount) return;

    if (editingAccount.id) {
      updateMutation.mutate(editingAccount);
    } else {
      createMutation.mutate({
        name: editingAccount.name,
        email: editingAccount.email,
        purpose: editingAccount.purpose as 'archive' | 'bounces' | 'replies' | 'general',
        imapHost: editingAccount.imapHost,
        imapPort: editingAccount.imapPort,
        imapUser: editingAccount.imapUser,
        imapPassword: editingAccount.imapPassword,
        imapSsl: editingAccount.imapSsl,
        deleteAfterFetch: editingAccount.deleteAfterFetch,
        markAsReadAfterFetch: editingAccount.markAsReadAfterFetch,
        fetchIntervalMinutes: editingAccount.fetchIntervalMinutes,
        isActive: editingAccount.isActive,
      });
    }
  };

  const handleTestConnection = async () => {
    if (!editingAccount) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnectionMutation.mutateAsync({
        imapHost: editingAccount.imapHost,
        imapPort: editingAccount.imapPort,
        imapUser: editingAccount.imapUser,
        imapPassword: editingAccount.imapPassword,
        imapSsl: editingAccount.imapSsl,
      });
      setTestResult({ 
        success: result.success, 
        message: result.success ? result.message || 'Verbindung erfolgreich!' : result.error || 'Verbindung fehlgeschlagen' 
      });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Möchten Sie dieses E-Mail-Konto wirklich löschen?')) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">E-Mail-Konten (IMAP)</h3>
          <p className="text-sm text-muted-foreground">
            ⬅️ Eingehende E-Mails: Konfiguriere hier IMAP-Postfächer, um E-Mails automatisch in FRIDAY zu archivieren (z.B. weitergeleitete E-Mails, Bounces, Antworten auf Kampagnen).
          </p>
        </div>
        <Button onClick={handleNewAccount}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Konto
        </Button>
      </div>

      {/* Account List */}
      {accounts && accounts.length > 0 && !editingAccount && (
        <div className="grid gap-4">
          {accounts.map((account: any) => (
            <Card key={account.id} className={!account.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${account.isActive ? 'bg-gray-100' : 'bg-gray-100'}`}>
                      <Mail className={`h-5 w-5 ${account.isActive ? 'text-gray-700' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <CardDescription>{account.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      account.purpose === 'archive' ? 'bg-gray-100 text-[#c87e00]' :
                      account.purpose === 'bounces' ? 'bg-gray-100 text-[#c87e00]' :
                      account.purpose === 'replies' ? 'bg-gray-100 text-gray-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {purposeLabels[account.purpose] || account.purpose}
                    </span>
                    {!account.isActive && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
                        Inaktiv
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      {account.imapHost}:{account.imapPort}
                    </span>
                    <span>Intervall: {account.fetchIntervalMinutes} Min.</span>
                    {account.lastFetchAt && (
                      <span>Letzter Abruf: {new Date(account.lastFetchAt).toLocaleString('de-DE')}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingAccount(account);
                      setTestResult(null);
                    }}>
                      <Settings2 className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-600" onClick={() => handleDelete(account.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {account.lastError && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {account.lastError}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {(!accounts || accounts.length === 0) && !editingAccount && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine E-Mail-Konten konfiguriert</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fügen Sie ein IMAP-Postfach hinzu, um E-Mails automatisch zu verarbeiten.
            </p>
            <Button onClick={handleNewAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Konto hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit/Create Form */}
      {editingAccount && (
        <Card>
          <CardHeader>
            <CardTitle>{editingAccount.id ? 'E-Mail-Konto bearbeiten' : 'Neues E-Mail-Konto'}</CardTitle>
            <CardDescription>
              Konfigurieren Sie die IMAP-Verbindung für dieses Postfach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="z.B. Archiv-Postfach"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="z.B. FRIDAYarchiv@BL2020.com"
                  value={editingAccount.email}
                  onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Verwendungszweck</Label>
              <Select
                value={editingAccount.purpose}
                onValueChange={(value) => setEditingAccount({ ...editingAccount, purpose: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zweck auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">📁 Archiv (Dokumente an Kontakte)</SelectItem>
                  <SelectItem value="bounces">📭 Rückläufer (Bounces)</SelectItem>
                  <SelectItem value="replies">💬 Antworten auf Kampagnen</SelectItem>
                  <SelectItem value="general">📧 Allgemein</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* IMAP Settings */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">IMAP-Server Einstellungen</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP Server</Label>
                  <Input
                    id="imapHost"
                    placeholder="z.B. mail.BL2020.com"
                    value={editingAccount.imapHost}
                    onChange={(e) => setEditingAccount({ ...editingAccount, imapHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">Port</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    placeholder="993"
                    value={editingAccount.imapPort}
                    onChange={(e) => setEditingAccount({ ...editingAccount, imapPort: parseInt(e.target.value) || 993 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="imapUser">Benutzername</Label>
                  <Input
                    id="imapUser"
                    placeholder="z.B. FRIDAYarchiv@BL2020.com"
                    value={editingAccount.imapUser}
                    onChange={(e) => setEditingAccount({ ...editingAccount, imapUser: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPassword">Passwort</Label>
                  <div className="relative">
                    <Input
                      id="imapPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={editingAccount.imapPassword}
                      onChange={(e) => setEditingAccount({ ...editingAccount, imapPassword: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Switch
                  id="imapSsl"
                  checked={editingAccount.imapSsl}
                  onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, imapSsl: checked })}
                />
                <Label htmlFor="imapSsl">SSL/TLS verwenden (empfohlen)</Label>
              </div>

              {/* Test Connection */}
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !editingAccount.imapHost || !editingAccount.imapUser || !editingAccount.imapPassword}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verbindung testen
                </Button>
                {testResult && (
                  <span className={`ml-3 text-sm ${testResult.success ? 'text-gray-700' : 'text-gray-600'}`}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4 inline mr-1" /> : <XCircle className="h-4 w-4 inline mr-1" />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Processing Options */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Verarbeitungsoptionen</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="deleteAfterFetch">Nach Abruf löschen</Label>
                    <p className="text-sm text-muted-foreground">E-Mails nach erfolgreicher Verarbeitung vom Server löschen</p>
                  </div>
                  <Switch
                    id="deleteAfterFetch"
                    checked={editingAccount.deleteAfterFetch}
                    onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, deleteAfterFetch: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="markAsRead">Als gelesen markieren</Label>
                    <p className="text-sm text-muted-foreground">E-Mails nach Verarbeitung als gelesen markieren</p>
                  </div>
                  <Switch
                    id="markAsRead"
                    checked={editingAccount.markAsReadAfterFetch}
                    onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, markAsReadAfterFetch: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Konto aktiv</Label>
                    <p className="text-sm text-muted-foreground">Automatischen E-Mail-Abruf aktivieren</p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={editingAccount.isActive}
                    onCheckedChange={(checked) => setEditingAccount({ ...editingAccount, isActive: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fetchInterval">Abruf-Intervall (Minuten)</Label>
                  <Select
                    value={editingAccount.fetchIntervalMinutes.toString()}
                    onValueChange={(value) => setEditingAccount({ ...editingAccount, fetchIntervalMinutes: parseInt(value) })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Jede Minute</SelectItem>
                      <SelectItem value="5">Alle 5 Minuten</SelectItem>
                      <SelectItem value="10">Alle 10 Minuten</SelectItem>
                      <SelectItem value="15">Alle 15 Minuten</SelectItem>
                      <SelectItem value="30">Alle 30 Minuten</SelectItem>
                      <SelectItem value="60">Stündlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setEditingAccount(null)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!editingAccount.name || !editingAccount.email || !editingAccount.imapHost || !editingAccount.imapUser || !editingAccount.imapPassword}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingAccount.id ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
