import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { User, Plus } from "lucide-react";

export default function Contacts() {
  const { user } = useAuth();
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [, setLocation] = useLocation();
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    position: "",
  });

  const utils = trpc.useUtils();
  const createContactMutation = trpc.contacts.createStandalone.useMutation({
    onSuccess: (data) => {
      utils.contacts.list.invalidate();
      setShowNewContactDialog(false);
      setNewContact({ firstName: "", lastName: "", title: "", email: "", phone: "", position: "" });
      if (data?.id) {
        setLocation(`/contacts/${data.id}`);
      }
    },
  });

  const handleCreateContact = () => {
    if (!newContact.firstName || !newContact.lastName) return;
    createContactMutation.mutate(newContact);
  };

  const filteredContacts = useMemo(() => {
    if (!contacts?.data) return [];

    let filtered = (contacts?.data || []).filter((contact) => {
      const matchesSearch =
        search === "" ||
        contact.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        contact.primaryEmail?.toLowerCase().includes(search.toLowerCase()) ||
        contact.position?.toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case "name":
          aVal = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          bVal = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          break;
        case "email":
          aVal = a.primaryEmail || "";
          bVal = b.primaryEmail || "";
          break;
        case "position":
          aVal = a.position || "";
          bVal = b.position || "";
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
  }, [contacts, search, sortBy, sortOrder]);

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
    if (selectedRows.size === filteredContacts.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredContacts.map(c => c.id)));
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container py-6">
        {/* Header with New Contact Button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Kontakte</h1>
          <Button onClick={() => setShowNewContactDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kontakt
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              type="text"
              placeholder="Suche nach Name, E-Mail, Position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />

            <Button
              variant="outline"
              onClick={() => setSortBy("name")}
              className={`h-8 text-sm ${sortBy === "name" ? "bg-gray-100" : ""}`}
            >
              Name
              {sortBy === "name" && (
                <span className="ml-2">{sortOrder === "asc" ? "↑" : "↓"}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Contacts Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-sm text-gray-600">Lädt...</div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-600">Keine Kontakte gefunden</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="w-12 px-3 py-2">
                    <Checkbox
                      checked={selectedRows.size === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={toggleAllRows}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">E-Mail</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Telefon</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Position</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Firmen</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedRows.has(contact.id)}
                        onCheckedChange={() => toggleRowSelection(contact.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/contacts/${contact.id}`}>
                        <div className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {contact.primaryEmail || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {contact.primaryPhone || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {contact.position || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">-</span>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/contacts/${contact.id}`}>
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
              Auf dieser Seite findest du alle Kontakte in deinem CRM. Ein Kontakt ist eine Person, die zu einer Firma und einem Konzern gehört.
            </p>
            <p className="mb-3">
              <strong>Kontakte suchen:</strong> Nutze das Suchfeld oben, um schnell einen bestimmten Kontakt zu finden. Du kannst nach Name, E-Mail-Adresse oder Position suchen.
            </p>
            <p className="mb-3">
              <strong>Sortieren:</strong> Klicke auf den "Name" Button, um die Liste alphabetisch zu sortieren. Mit einem weiteren Klick kannst du die Sortierrichtung umkehren.
            </p>
            <p className="mb-3">
              <strong>Kontakt-Details ansehen:</strong> Klicke auf einen Kontaktnamen oder auf den "Details" Button, um alle Informationen zu dieser Person zu sehen. Dort findest du auch die zugehörigen Firmen, Deals und Aktivitäten.
            </p>
            <p className="mb-3">
              <strong>Mehrere Kontakte auswählen:</strong> Mit den Checkboxen links kannst du mehrere Kontakte markieren. Das ist praktisch, wenn du später Massenaktionen durchführen möchtest.
            </p>
            <p>
              <strong>Neue Kontakte hinzufügen:</strong> Klicke auf "Neuer Kontakt" oben rechts, um einen neuen Kontakt anzulegen.
            </p>
          </div>
        </div>
      </main>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuer Kontakt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newFirstName">Vorname *</Label>
                <Input
                  id="newFirstName"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  placeholder="Vorname"
                />
              </div>
              <div>
                <Label htmlFor="newLastName">Nachname *</Label>
                <Input
                  id="newLastName"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  placeholder="Nachname"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="newTitle">Titel</Label>
              <Input
                id="newTitle"
                value={newContact.title}
                onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                placeholder="z.B. Dr., Prof."
              />
            </div>
            <div>
              <Label htmlFor="newEmail">E-Mail</Label>
              <Input
                id="newEmail"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="email@beispiel.de"
              />
            </div>
            <div>
              <Label htmlFor="newPhone">Telefon</Label>
              <Input
                id="newPhone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder="+49 123 456789"
              />
            </div>
            <div>
              <Label htmlFor="newPosition">Position</Label>
              <Input
                id="newPosition"
                value={newContact.position}
                onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                placeholder="z.B. Geschäftsführer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>Abbrechen</Button>
            <Button 
              onClick={handleCreateContact}
              disabled={!newContact.firstName || !newContact.lastName || createContactMutation.isPending}
            >
              {createContactMutation.isPending ? "Speichern..." : "Kontakt anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

