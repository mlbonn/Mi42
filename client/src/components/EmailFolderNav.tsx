import React from 'react';

interface EmailFolderNavProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
}

const folders = [
  { id: 'INBOX', label: 'Inbox', icon: '📥' },
  { id: 'Drafts', label: 'Drafts', icon: '✏️' },
  { id: 'Sent', label: 'Sent', icon: '📤' },
  { id: 'Trash', label: 'Trash', icon: '🗑️' },
  { id: 'Spam', label: 'Spam', icon: '⚠️' },
];

export default function EmailFolderNav({ activeFolder, onFolderChange }: EmailFolderNavProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Folders</h3>
      <nav className="space-y-1">
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFolder === folder.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{folder.icon}</span>
            {folder.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
