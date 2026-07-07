import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Search, X, Building2, Users, Globe } from "lucide-react";

interface SearchResult {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  city?: string;
}

interface SearchResults {
  corporations: SearchResult[];
  companies: SearchResult[];
  contacts: SearchResult[];
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce: 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // tRPC query – only fires when debouncedQuery >= 2 chars
  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery, limit: 7 },
    {
      enabled: debouncedQuery.length >= 2
    }
  );

  const results = data as SearchResults | undefined;
  const hasResults =
    results &&
    (results.corporations.length > 0 ||
      results.companies.length > 0 ||
      results.contacts.length > 0);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(path: string) {
    navigate(path);
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  const showDropdown = isOpen && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search..."
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 p-0.5 hover:bg-gray-200 rounded"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isFetching && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
          )}

          {!isFetching && !hasResults && debouncedQuery.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-400">No results for &ldquo;{debouncedQuery}&rdquo;</div>
          )}

          {/* Corporations */}
          {results && results.corporations.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Corporations
              </div>
              {results.corporations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/corporations/${c.id}`)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-800">{c.name}</span>
                  {c.city && <span className="text-gray-400 text-xs ml-auto">{c.city}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Companies */}
          {results && results.companies.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Companies
              </div>
              {results.companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/companies/${c.id}`)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-800">{c.name}</span>
                  {c.city && <span className="text-gray-400 text-xs ml-auto">{c.city}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Contacts */}
          {results && results.contacts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Contacts
              </div>
              {results.contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/contacts/${c.id}`)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-gray-800">
                      {c.firstName} {c.lastName}
                    </span>
                    {c.email && <span className="text-gray-400 text-xs truncate">{c.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
