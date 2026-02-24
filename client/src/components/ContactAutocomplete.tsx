// client/src/components/ContactAutocomplete.tsx
import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';

interface ContactAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function ContactAutocomplete({
  value,
  onChange,
  placeholder = 'Name oder E-Mail eingeben...',
  disabled = false,
  className = '',
  label,
}: ContactAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Search contacts query
  const { data: contacts, isLoading } = trpc.contacts.searchContacts.useQuery(
    { query: searchTerm, limit: 10 },
    { enabled: searchTerm.length >= 2 }
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setShowSuggestions(newValue.length >= 2);
    setSelectedIndex(-1);
  };

  const handleSelectContact = (contact: any) => {
    const email = contact.email || contact.email2 || contact.email3;
    const displayValue = `${contact.firstName} ${contact.lastName} <${email}>`;
    onChange(displayValue);
    setSearchTerm(displayValue);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !contacts || contacts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < contacts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < contacts.length) {
          handleSelectContact(contacts[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="text-xs text-gray-600 w-12">{label}</label>
      )}
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Suche...
            </div>
          )}

          {!isLoading && contacts && contacts.length > 0 && (
            <ul className="py-1">
              {contacts.map((contact: any, index: number) => {
                const email = contact.email || contact.email2 || contact.email3;
                const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                
                return (
                  <li
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                      index === selectedIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {name.charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {name || email}
                        </div>
                        {name && (
                          <div className="text-xs text-gray-500 truncate">
                            {email}
                          </div>
                        )}
                        {contact.company && (
                          <div className="text-xs text-gray-400 truncate">
                            {contact.company}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && contacts && contacts.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              Keine Kontakte gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}
