import { useState, useRef, useEffect } from 'react';

interface EmailSearchBarProps {
  onSearch: (params: {
    query: string;
    dateFrom?: string;
    dateTo?: string;
    sender?: string;
    folder?: string;
  }) => void;
}

export default function EmailSearchBar({ onSearch }: EmailSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sender, setSender] = useState('');
  const [folder, setFolder] = useState('INBOX');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    onSearch({
      query,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sender: sender || undefined,
      folder,
    });
    setShowFilters(false);
  };

  const handleClear = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setSender('');
    setFolder('INBOX');
    onSearch({ query: '', folder: 'INBOX' });
  };

  const hasActiveFilters = query || dateFrom || dateTo || sender;

  return (
    <div className="relative flex-1 max-w-3xl" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Emails durchsuchen..."
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Filter zurücksetzen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded ${showFilters ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title="Filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Von"
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Bis"
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <input
              type="email"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Absender: email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            >
              <option value="INBOX">Posteingang</option>
              <option value="Sent">Gesendet</option>
              <option value="Drafts">Entwürfe</option>
              <option value="Trash">Papierkorb</option>
              <option value="Spam">Spam</option>
            </select>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSearch}
                style={{ backgroundColor: "#6B7280" }}
                className="px-4 py-2 text-sm text-white rounded hover:opacity-90"
              >
                Suchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="absolute top-full left-0 right-0 mt-1 flex flex-wrap gap-1.5 text-xs">
          {query && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              🔍 "{query}"
            </span>
          )}
          {dateFrom && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              📅 Von: {new Date(dateFrom).toLocaleDateString('de-DE')}
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              📅 Bis: {new Date(dateTo).toLocaleDateString('de-DE')}
            </span>
          )}
          {sender && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              👤 {sender}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
