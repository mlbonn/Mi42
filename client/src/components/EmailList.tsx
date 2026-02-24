// client/components/EmailList.tsx
// Virtualisierte E-Mail-Liste

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SmarterMailMessage } from '../../server/services/smarterMailService';

interface EmailListProps {
  messages: SmarterMailMessage[];
  isLoading: boolean;
  selectedMessageUid: string | null;
  onSelectMessage: (messageUid: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function EmailList({
  messages,
  isLoading,
  selectedMessageUid,
  onSelectMessage,
  onLoadMore,
  hasMore,
}: EmailListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Infinite Scroll
  React.useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (lastItem.index >= messages.length - 1 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, messages.length, onLoadMore, virtualizer.getVirtualItems()]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Lädt E-Mails...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Keine E-Mails</div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          const isSelected = message.uid === selectedMessageUid;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`border-b p-4 cursor-pointer hover:bg-gray-50 ${
                isSelected ? 'bg-gray-50' : ''
              } ${!message.isRead ? 'font-semibold' : ''}`}
              onClick={() => onSelectMessage(message.uid)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{message.from}</span>
                    {message.hasAttachments && (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 truncate mt-1">{message.subject}</div>
                </div>
                <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                  {formatDate(message.receivedDate)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="p-4 text-center text-gray-500">Lädt weitere E-Mails...</div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 24 * 7) {
    return date.toLocaleDateString('de-DE', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }
}
