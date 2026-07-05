// client/hooks/useEmails.ts
// React Query Hooks für E-Mail-Client

import { trpc } from '../lib/trpc';

// ============================================================
// E-Mail-Konten
// ============================================================

export function useEmailAccounts() {
  return (trpc as any).emailLive.listAccounts.useQuery(undefined, {
    staleTime: 300000, // 5 Minuten Cache
  });
}

export function useAddEmailAccount() {
  const utils = trpc.useContext();

  return (trpc as any).emailLive.addAccount.useMutation({
    onSuccess: () => {
      (utils as any).emailLive.listAccounts.invalidate();
    },
  });
}

export function useDeleteEmailAccount() {
  const utils = trpc.useContext();

  return (trpc as any).emailLive.deleteAccount.useMutation({
    onSuccess: () => {
      (utils as any).emailLive.listAccounts.invalidate();
    },
  });
}

export function useTestConnection() {
  return (trpc as any).emailLive.testConnection.useMutation();
}

// ============================================================
// Live E-Mail-Abruf
// ============================================================

export function useMessages(accountId: number, folder: string = 'INBOX', skip: number = 0) {
  return (trpc as any).emailLive.getMessages.useQuery(
    {
      accountId,
      folder,
      skip,
      take: 50,
    },
    {
      enabled: !!accountId,
      staleTime: 60000, // 1 Minute Cache
      cacheTime: 300000, // 5 Minuten im Cache behalten
    }
  );
}

export function useMessage(accountId: number, messageUid: string) {
  return (trpc as any).emailLive.getMessage.useQuery(
    {
      accountId,
      messageUid,
    },
    {
      enabled: !!accountId && !!messageUid,
      staleTime: 300000, // 5 Minuten Cache
    }
  );
}

export function useSearchMessages(accountId: number, query: string, folder: string = 'INBOX') {
  return (trpc as any).emailLive.searchMessages.useQuery(
    {
      accountId,
      query,
      folder,
      skip: 0,
      take: 50,
    },
    {
      enabled: !!accountId && query.length > 0,
      staleTime: 60000,
    }
  );
}

export function useFolders(accountId: number) {
  return (trpc as any).emailLive.getFolders.useQuery(
    {
      accountId,
    },
    {
      enabled: !!accountId,
      staleTime: 600000, // 10 Minuten Cache (Ordner ändern sich selten)
    }
  );
}

// ============================================================
// E-Mail senden
// ============================================================

export function useSendMessage() {
  return (trpc as any).emailLive.sendMessage.useMutation();
}

// ============================================================
// E-Mail-Operationen
// ============================================================

export function useMarkAsRead() {
  const utils = trpc.useContext();

  return (trpc as any).emailLive.markAsRead.useMutation({
    onSuccess: () => {
      (utils as any).emailLive.getMessages.invalidate();
    },
  });
}

export function useMoveMessage() {
  const utils = trpc.useContext();

  return (trpc as any).emailLive.moveMessage.useMutation({
    onSuccess: () => {
      (utils as any).emailLive.getMessages.invalidate();
    },
  });
}

export function useDeleteMessage() {
  const utils = trpc.useContext();

  return (trpc as any).emailLive.deleteMessage.useMutation({
    onSuccess: () => {
      (utils as any).emailLive.getMessages.invalidate();
    },
  });
}

// ============================================================
// Archivierung
// ============================================================

export function useArchiveEmail() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.archiveEmail.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useArchivedEmails(filters?: {
  contactId?: number;
  companyId?: number;
  dealId?: number;
  status?: string;
}) {
  return (trpc as any).emailArchive.listArchivedEmails.useQuery(
    {
      ...filters,
      skip: 0,
      take: 50,
    },
    {
      staleTime: 60000,
    }
  );
}

export function useArchivedEmail(emailId: number) {
  return (trpc as any).emailArchive.getArchivedEmail.useQuery(
    {
      emailId,
    },
    {
      enabled: !!emailId,
      staleTime: 300000,
    }
  );
}

// ============================================================
// CRM-Verknüpfungen
// ============================================================

export function useLinkToContact() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.linkToContact.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useLinkToCompany() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.linkToCompany.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useLinkToDeal() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.linkToDeal.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

// ============================================================
// Team-Kollaboration
// ============================================================

export function useAssignToUser() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.assignToUser.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useAddComment() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.addComment.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
    },
  });
}

export function useUpdateStatus() {
  const utils = trpc.useContext();

  return (trpc as any).emailArchive.updateStatus.useMutation({
    onSuccess: () => {
      (utils as any).emailArchive.getArchivedEmail.invalidate();
      (utils as any).emailArchive.listArchivedEmails.invalidate();
    },
  });
}

// ============================================================
// Statistiken
// ============================================================

export function useEmailStats() {
  return (trpc as any).emailArchive.getStats.useQuery(undefined, {
    staleTime: 300000, // 5 Minuten
  });
}
