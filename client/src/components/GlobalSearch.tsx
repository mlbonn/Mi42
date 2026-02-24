/**
 * FRIDAY CRM - Global Search
 * Suche nach Kontakten, E-Mails, Firmen, Konzerne, Deals
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "corporations" | "companies" | "contacts" | "deals">("all");
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search queries using globalSearch API
  const { data: searchResults } = trpc.search.global.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  // Extract results
  const filteredCorporations = searchResults?.corporations || [];
  const filteredContacts = searchResults?.contacts || [];
  const filteredDeals: any[] = []; // Deals not yet implemented in globalSearch

  const hasResults = filteredCorporations.length > 0 || filteredContacts.length > 0 || filteredDeals.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Suche nach Kontakten, Firmen, Deals, E-Mails..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm ${activeTab === "all" ? "border-b-2 border-orange-600 font-bold" : "text-gray-600"}`}
            >
              Alle ({filteredCorporations.length + filteredContacts.length + filteredDeals.length})
            </button>
            <button
              onClick={() => setActiveTab("corporations")}
              className={`px-4 py-2 text-sm ${activeTab === "corporations" ? "border-b-2 border-orange-600 font-bold" : "text-gray-600"}`}
            >
              Konzerne ({filteredCorporations.length})
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`px-4 py-2 text-sm ${activeTab === "contacts" ? "border-b-2 border-orange-600 font-bold" : "text-gray-600"}`}
            >
              Kontakte ({filteredContacts.length})
            </button>
            <button
              onClick={() => setActiveTab("deals")}
              className={`px-4 py-2 text-sm ${activeTab === "deals" ? "border-b-2 border-orange-600 font-bold" : "text-gray-600"}`}
            >
              Deals ({filteredDeals.length})
            </button>
          </div>

          {/* Results */}
          <div className="p-2">
            {!hasResults && (
              <div className="text-center py-8 text-gray-500">
                Keine Ergebnisse für "{query}"
              </div>
            )}

            {/* Corporations */}
            {(activeTab === "all" || activeTab === "corporations") && filteredCorporations.length > 0 && (
              <div className="mb-4">
                {activeTab === "all" && <div className="text-xs font-bold text-gray-500 uppercase mb-2">Konzerne</div>}
                {filteredCorporations.slice(0, activeTab === "all" ? 3 : 20).map((corp) => (
                  <Link key={corp.id} href={`/corporations/${corp.id}`}>
                    <div
                      onClick={() => setIsOpen(false)}
                      className="p-3 hover:bg-gray-50 cursor-pointer rounded border-b"
                    >
                      <div className="font-bold">{corp.name}</div>
                      <div className="text-sm text-gray-600">
                        {corp.industry} • {corp.headquartersCountry}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Contacts */}
            {(activeTab === "all" || activeTab === "contacts") && filteredContacts.length > 0 && (
              <div className="mb-4">
                {activeTab === "all" && <div className="text-xs font-bold text-gray-500 uppercase mb-2">Kontakte</div>}
                {filteredContacts.slice(0, activeTab === "all" ? 3 : 20).map((contact: any) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <div
                      className="p-3 hover:bg-gray-50 cursor-pointer rounded border-b"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="font-bold">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {contact.position} • {contact.email}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Deals */}
            {(activeTab === "all" || activeTab === "deals") && filteredDeals.length > 0 && (
              <div className="mb-4">
                {activeTab === "all" && <div className="text-xs font-bold text-gray-500 uppercase mb-2">Deals</div>}
                {filteredDeals.slice(0, activeTab === "all" ? 3 : 20).map((deal) => (
                  <Link key={deal.id} href={`/deals`}>
                    <div
                      onClick={() => setIsOpen(false)}
                      className="p-3 hover:bg-gray-50 cursor-pointer rounded border-b"
                    >
                      <div className="font-bold">{deal.dealName}</div>
                      <div className="text-sm text-gray-600">
                        {deal.stage} • €{deal.dealValueEur ? parseFloat(deal.dealValueEur).toLocaleString() : '0'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

