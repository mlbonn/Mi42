import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Building2 } from "lucide-react";

export default function Corporations() {
  const { user } = useAuth();
  const { data: corporations, isLoading } = trpc.corporations.list.useQuery();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filter and sort
  const filteredCorps = useMemo(() => {
    if (!corporations?.data) return [];

    let filtered = (corporations?.data || []).filter(corp => {
      const matchesSearch = 
        corp.name.toLowerCase().includes(search.toLowerCase()) ||
        corp.industry?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || corp.status === filterStatus;
      const matchesPriority = filterPriority === "all" || corp.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "revenue":
          aVal = a.totalRevenueEur || 0;
          bVal = b.totalRevenueEur || 0;
          break;
        case "country":
          aVal = a.headquartersCountry || "";
          bVal = b.headquartersCountry || "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [corporations, search, filterStatus, filterPriority, sortBy, sortOrder]);

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredCorps.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredCorps.map(c => c.id)));
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container py-6">
        {/* Search & Filter */}
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              type="text"
              placeholder="Suche nach Name oder Branche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Alle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="Target">Target</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Demo">Demo</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Alle Prioritäten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="revenue">Umsatz</SelectItem>
                <SelectItem value="country">Land</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-8 w-8"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        {/* Corporations Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
        ) : filteredCorps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-600">Keine Konzerne gefunden.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="w-12 px-3 py-2">
                    <Checkbox
                      checked={selectedRows.size === filteredCorps.length && filteredCorps.length > 0}
                      onCheckedChange={toggleAllRows}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Land</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Branche</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Umsatz</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Priorität</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCorps.map((corp) => (
                  <tr 
                    key={corp.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedRows.has(corp.id)}
                        onCheckedChange={() => toggleRowSelection(corp.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/corporations/${corp.id}`}>
                        <div className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">{corp.name}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {corp.headquartersCountry ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {corp.headquartersCountry}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {corp.industry || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {corp.totalRevenueEur
                        ? `€${(corp.totalRevenueEur / 1_000_000_000).toFixed(1)}B`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {corp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {corp.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/corporations/${corp.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs hover:bg-gray-100"
                        >
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* How to use section */}
        <div className="mt-16 pt-8 border-t-2 border-gray-200 bg-white rounded-lg p-6">
          <h3 className="text-xl font-bold text-black mb-4">So verwendest du diese Seite</h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="mb-3">
              Auf dieser Seite findest du alle Konzerne in deinem CRM. Ein Konzern ist die oberste Ebene und kann mehrere Firmen, Kontakte und Deals enthalten.
            </p>
            <p className="mb-3">
              <strong>Suchen und Filtern:</strong> Nutze das Suchfeld oben, um schnell einen bestimmten Konzern zu finden. Du kannst nach Name oder Branche suchen. Mit den Dropdown-Menüs kannst du nach Status (Target, Contacted, Demo, Customer) und Priorität (High, Medium, Low) filtern.
            </p>
            <p className="mb-3">
              <strong>Sortieren:</strong> Wähle aus, ob du die Liste nach Name, Umsatz oder Land sortieren möchtest. Mit dem Pfeil-Button kannst du zwischen aufsteigender und absteigender Sortierung wechseln.
            </p>
            <p className="mb-3">
              <strong>Konzern-Details ansehen:</strong> Klicke auf einen Konzern-Namen oder auf den "Details" Button, um alle Informationen zu diesem Konzern zu sehen. Dort findest du auch die zugehörigen Firmen, Kontakte und Deals.
            </p>
            <p>
              <strong>Mehrere Konzerne auswählen:</strong> Mit den Checkboxen links kannst du mehrere Konzerne markieren. Das ist nützlich, wenn du später Massenaktionen durchführen möchtest.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

