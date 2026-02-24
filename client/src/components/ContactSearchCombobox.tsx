import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface ContactSearchComboboxProps {
  onSelect: (contact: { id: string; name: string; email: string }) => void;
  placeholder?: string;
}

export const ContactSearchCombobox: React.FC<ContactSearchComboboxProps> = ({
  onSelect,
  placeholder = 'Kontakt oder E-Mail eingeben...',
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchMutation = trpc.emailSearch.searchContacts.useMutation();
  const results = searchMutation.data || [];

  useEffect(() => {
    if (input.length > 1) {
      searchMutation.mutate({ query: input, limit: 10 });
    }
  }, [input]);

  const handleSelect = (contact: any) => {
    onSelect({
      id: contact.id,
      name: contact.name,
      email: contact.email,
    });
    setInput('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setIsOpen(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {results.map((contact, index) => (
            <button
              key={contact.id}
              onClick={() => handleSelect(contact)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <div className="font-medium">{contact.name}</div>
              <div className="text-xs text-gray-600">{contact.email}</div>
            </button>
          ))}
        </div>
      )}

      {isOpen && input.length > 1 && results.length === 0 && !searchMutation.isPending && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500">
          Keine Kontakte gefunden
        </div>
      )}

      {searchMutation.isPending && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500">
          Wird gesucht...
        </div>
      )}
    </div>
  );
};
