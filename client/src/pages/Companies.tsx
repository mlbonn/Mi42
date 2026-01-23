import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Building2 } from "lucide-react";

// Notion-style table with checkboxes and compact layout
export default function Companies() {
  const { user } = useAuth();
  const { data: companies, isLoading } = trpc.companies.list.useQuery();
  const { data: allCorporations } = trpc.corporations.list.useQuery();

  const [search, setSearch] = useState("");
  const [filterCorporation, setFilterCorporation] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  // Unique corporations and countries for filters
  const corporations = useMemo(() => {
    if (!allCorporations?.data) return [];
    return allCorporations.data;
  }, [allCorporations]);

  const countries = useMemo(() => {
    if (!companies?.data) return [];
    const unique = new Set(companies.data.map(c => c.country).filter(Boolean));
    return Array.from(unique).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!companies?.data) return [];

    let filtered = (companies?.data || []).filter((company) => {
      const matchesSearch =
        search === "" ||
        company.name?.toLowerCase().includes(search.toLowerCase()) ||
        company.city?.toLowerCase().includes(search.toLowerCase()) ||
        company.products?.toLowerCase().includes(search.toLowerCase());

      const matchesCorporation =
        filterCorporation === "all" || company.corporationId === filterCorporation;

      const matchesCountry =
        filterCountry === "all" || company.country === filterCountry;

      return matchesSearch && matchesCorporation && matchesCountry;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case "name":
          aVal = a.name || "";
          bVal = b.name || "";
          break;
        case "revenue":
          aVal = a.revenueEur || 0;
          bVal = b.revenueEur || 0;
          break;
        case "country":
          aVal = a.country || "";
          bVal = b.country || "";
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [companies, search, filterCorporation, filterCountry, sortBy, sortOrder]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    city: "",
    country: "",
    corporationId: "",
  });

  const utils = trpc.useUtils();

  const createCompanyMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      setIsCreateOpen(false);
      setNewCompany({ name: "", city: "", country: "", corporationId: "" });
    },
  });

  const handleCreateCompany = () => {
    createCompanyMutation.mutate(newCompany);
  };

  const toggleCompanySelection = (id: string) => {
    const newSelection = new Set(selectedCompanies);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCompanies(newSelection);
  };

  const toggleAllCompanies = () => {
    if (selectedCompanies.size === filteredCompanies.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(filteredCompanies.map(c => c.id)));
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container py-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-800">Firmen</h1>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white text-gray-700 text-sm">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Neuer Datensatz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Firma anlegen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="z.B. James Hardie"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                    placeholder="z.B. Düsseldorf"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Land *</Label>
                  <Input
                    id="country"
                    value={newCompany.country}
                    onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                    placeholder="z.B. DE"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="corporation">Konzern (optional)</Label>
                  <Select
                    value={newCompany.corporationId}
                    onValueChange={(value) => setNewCompany({ ...newCompany, corporationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Konzern auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {corporations.map((corp) => (
                        <SelectItem key={corp.id} value={corp.id}>
                          {corp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateCompany}
                  disabled={!newCompany.name || !newCompany.city || !newCompany.country || createCompanyMutation.isPending}
                  className="w-full"
                >
                  {createCompanyMutation.isPending ? "Erstelle..." : "Firma anlegen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Alle Firmen</span>
            <span className="text-gray-400">· {filteredCompanies.length}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter</span>
            <span className="text-sm text-gray-500">Sortieren</span>
            <span className="text-sm text-gray-500">Optionen</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Suche nach Name oder Branche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white text-sm h-8"
            />

            <Select value={filterCorporation} onValueChange={setFilterCorporation}>
              <SelectTrigger className="bg-white text-sm h-8">
                <SelectValue placeholder="Alle Konzerne" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Konzerne</SelectItem>
                {corporations.map((corp) => (
                  <SelectItem key={corp.id} value={corp.id}>
                    {corp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="bg-white text-sm h-8">
                <SelectValue placeholder="Alle Länder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Länder</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country || ""}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white text-sm h-8">
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
                className="bg-white h-8 w-8"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>

        {/* Companies Table - Notion Style */}
        {isLoading ? (
          <div className="text-center py-12 bg-white rounded">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded">
            <p className="text-sm text-gray-500">Keine Firmen gefunden.</p>
          </div>
        ) : (
          <div className="bg-white rounded shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="px-3 py-2 w-10">
                    <Checkbox
                      checked={selectedCompanies.size === filteredCompanies.length}
                      onCheckedChange={toggleAllCompanies}
                    />
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Konzern</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Land</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Stadt</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Umsatz</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Industrie</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Stufe</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer group"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedCompanies.has(company.id)}
                        onCheckedChange={() => toggleCompanySelection(company.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/companies/${company.id}`}>
                        <a className="text-sm text-gray-800 hover:underline font-medium">
                          {company.name}
                        </a>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {(company as any).corporationName || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                        {company.country || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {company.city || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {company.revenueEur
                          ? `€${(company.revenueEur / 1_000_000_000).toFixed(1)}B`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {(company as any).industry || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {(company as any).stage || "-"}
                      </span>
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
              Hier siehst du alle Firmen in deinem CRM. Eine Firma gehört immer zu einem Konzern und kann mehrere Kontakte haben.
            </p>
            <p className="mb-3">
              <strong>Neue Firma anlegen:</strong> Klicke oben rechts auf den "+ Neue Firma" Button. Gib mindestens den Namen, die Stadt und das Land ein. Du kannst die Firma optional einem Konzern zuordnen.
            </p>
            <p className="mb-3">
              <strong>Suchen und Filtern:</strong> Nutze das Suchfeld, um nach Firmennamen oder Branchen zu suchen. Mit den Dropdown-Menüs kannst du nach Konzern oder Land filtern.
            </p>
            <p className="mb-3">
              <strong>Sortieren:</strong> Wähle aus, ob du die Liste nach Name, Umsatz oder Land sortieren möchtest. Mit dem Pfeil-Button kannst du die Sortierrichtung ändern.
            </p>
            <p className="mb-3">
              <strong>Firma-Details ansehen:</strong> Klicke auf einen Firmennamen, um zur Detailseite zu gelangen. Dort findest du alle Kontakte und Deals dieser Firma.
            </p>
            <p>
              <strong>Mehrere Firmen auswählen:</strong> Mit den Checkboxen links kannst du mehrere Firmen markieren. Das ist praktisch für spätere Massenaktionen.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

