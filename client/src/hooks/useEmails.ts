// client/hooks/useEmails.ts
// React Query Hooks für E-Mail-Client

import { trpc } from '../utils/trpc';

// ============================================================
// E-Mail-Konten
// ============================================================

export function useEmailAccounts() {
  return trpc.emailLive.listAccounts.useQuery(undefined, {
    staleTime: 300000, // 5 Minuten Cache
  });
}

export function useAddEmailAccount() {
  const utils = trpc.useContext();

  return trpc.emailLive.addAccount.useMutation({
    onSuccess: () => {
      utils.emailLive.listAccounts.invalidate();
    },
  });
}

export function useDeleteEmailAccount() {
  const utils = trpc.useContext();

  return trpc.emailLive.deleteAccount.useMutation({
    onSuccess: () => {
      utils.emailLive.listAccounts.invalidate();
    },
  });
}

export function useTestConnection() {
  return trpc.emailLive.testConnection.useMutation();
}

// ============================================================
// Live E-Mail-Abruf
// ============================================================

export function useMessages(accountId: number, folder: string = 'INBOX', skip: number = 0) {
  return trpc.emailLive.getMessages.useQuery(
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
  return trpc.emailLive.getMessage.useQuery(
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
  return trpc.emailLive.searchMessages.useQuery(
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
  return trpc.emailLive.getFolders.useQuery(
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
  return trpc.emailLive.sendMessage.useMutation();
}

// ============================================================
// E-Mail-Operationen
// ============================================================

export function useMarkAsRead() {
  const utils = trpc.useContext();

  return trpc.emailLive.markAsRead.useMutation({
    onSuccess: () => {
      utils.emailLive.getMessages.invalidate();
    },
  });
}

export function useMoveMessage() {
  const utils = trpc.useContext();

  return trpc.emailLive.moveMessage.useMutation({
    onSuccess: () => {
      utils.emailLive.getMessages.invalidate();
    },
  });
}

export function useDeleteMessage() {
  const utils = trpc.useContext();

  return trpc.emailLive.deleteMessage.useMutation({
    onSuccess: () => {
      utils.emailLive.getMessages.invalidate();
    },
  });
}

// ============================================================
// Archivierung
// ============================================================

export function useArchiveEmail() {
  const utils = trpc.useContext();

  return trpc.emailArchive.archiveEmail.useMutation({
    onSuccess: () => {
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useArchivedEmails(filters?: {
  contactId?: number;
  companyId?: number;
  dealId?: number;
  status?: string;
}) {
  return trpc.emailArchive.listArchivedEmails.useQuery(
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
  return trpc.emailArchive.getArchivedEmail.useQuery(
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

  return trpc.emailArchive.linkToContact.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useLinkToCompany() {
  const utils = trpc.useContext();

  return trpc.emailArchive.linkToCompany.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useLinkToDeal() {
  const utils = trpc.useContext();

  return trpc.emailArchive.linkToDeal.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

// ============================================================
// Team-Kollaboration
// ============================================================

export function useAssignToUser() {
  const utils = trpc.useContext();

  return trpc.emailArchive.assignToUser.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

export function useAddComment() {
  const utils = trpc.useContext();

  return trpc.emailArchive.addComment.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
    },
  });
}

export function useUpdateStatus() {
  const utils = trpc.useContext();

  return trpc.emailArchive.updateStatus.useMutation({
    onSuccess: () => {
      utils.emailArchive.getArchivedEmail.invalidate();
      utils.emailArchive.listArchivedEmails.invalidate();
    },
  });
}

// ============================================================
// Statistiken
// ============================================================

export function useEmailStats() {
  return trpc.emailArchive.getStats.useQuery(undefined, {
    staleTime: 300000, // 5 Minuten
  });
}
