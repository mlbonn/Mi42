import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function CorporationDetail() {
  const { user, logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  
  const { data: corporation, isLoading: corpLoading } = trpc.corporations.get.useQuery({ id: id! });
  const { data: companies } = trpc.companies.listByCorporation.useQuery(
    { corporationId: id! },
    { enabled: !!id }
  );
  const { data: contacts } = trpc.contacts.listByCorporation.useQuery(
    { corporationId: id! },
    { enabled: !!id }
  );
  const { data: deals } = trpc.deals.listByCorporation.useQuery(
    { corporationId: id! },
    { enabled: !!id }
  );
  const { data: activities } = trpc.activities.listByCorporation.useQuery(
    { corporationId: id!, limit: 20 },
    { enabled: !!id }
  );

  // Dialog states
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);

  // Form states
  const [newCompany, setNewCompany] = useState({ name: "", country: "", city: "", website: "" });
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", position: "" });
  const [newDeal, setNewDeal] = useState({ dealName: "", dealValueEur: "", stage: "Qualification", probability: "25" });

  // Mutations
  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.listByCorporation.invalidate({ corporationId: id! });
      setShowAddCompany(false);
      setNewCompany({ name: "", country: "", city: "", website: "" });
      toast.success("Firma erfolgreich hinzugefügt");
    },
    onError: (error) => {
      toast.error("Fehler beim Hinzufügen der Firma: " + error.message);
    }
  });

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.listByCorporation.invalidate({ corporationId: id! });
      setShowAddContact(false);
      setNewContact({ firstName: "", lastName: "", email: "", position: "" });
      toast.success("Kontakt erfolgreich hinzugefügt");
    },
    onError: (error) => {
      toast.error("Fehler beim Hinzufügen des Kontakts: " + error.message);
    }
  });

  const createDeal = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.listByCorporation.invalidate({ corporationId: id! });
      setShowAddDeal(false);
      setNewDeal({ dealName: "", dealValueEur: "", stage: "Qualification", probability: "25" });
      toast.success("Deal erfolgreich hinzugefügt");
    },
    onError: (error) => {
      toast.error("Fehler beim Hinzufügen des Deals: " + error.message);
    }
  });

  const handleAddCompany = () => {
    if (!newCompany.name.trim()) {
      toast.error("Bitte gib einen Firmennamen ein");
      return;
    }
    createCompany.mutate({
      name: newCompany.name,
      corporationId: id!,
      country: newCompany.country || undefined,
      city: newCompany.city || undefined,
      website: newCompany.website || undefined,
    });
  };

  const handleAddContact = () => {
    if (!newContact.firstName.trim() || !newContact.lastName.trim()) {
      toast.error("Bitte gib Vor- und Nachnamen ein");
      return;
    }
    createContact.mutate({
      firstName: newContact.firstName,
      lastName: newContact.lastName,
      corporationId: id!,
      email: newContact.email || undefined,
      position: newContact.position || undefined,
    });
  };

  const handleAddDeal = () => {
    if (!newDeal.dealName.trim()) {
      toast.error("Bitte gib einen Deal-Namen ein");
      return;
    }
    createDeal.mutate({
      dealName: newDeal.dealName,
      corporationId: id!,
      dealValueEur: newDeal.dealValueEur ? parseInt(newDeal.dealValueEur) : undefined,
      stage: newDeal.stage,
      probability: parseInt(newDeal.probability),
    });
  };

  if (corpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!corporation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Konzern nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="text-2xl font-bold text-black hover:underline">FRIDAY CRM</a>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/corporations">
                <a className="text-black hover:underline">Konzerne</a>
              </Link>
              <Link href="/deals">
                <a className="text-black hover:underline">Pipeline</a>
              </Link>
              {user?.role === 'staff_plus' && (
                <Link href="/my-deals">
                  <a className="text-black hover:underline">My Deals</a>
                </Link>
              )}
              <div className="flex items-center gap-4 ml-6 pl-6 border-l border-gray-300">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="border-black text-black hover:bg-gray-100"
                >
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/corporations">
            <a className="text-gray-600 hover:underline">← Zurück zu Konzerne</a>
          </Link>
        </div>

        {/* Corporation Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-2">{corporation.name}</h2>
          <div className="flex items-center gap-4 text-gray-600">
            {corporation.industry && <span>{corporation.industry}</span>}
            {corporation.headquartersCountry && <span>• {corporation.headquartersCountry}</span>}
            {corporation.totalRevenueEur && (
              <span>• €{corporation.totalRevenueEur.toLocaleString()} Umsatz</span>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-black">{corporation.status}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Priorität</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-black">{corporation.priority}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Firmen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-black">{companies?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="border-b-2 border-gray-300 bg-transparent">
            <TabsTrigger value="companies" className="data-[state=active]:border-b-2 data-[state=active]:border-black">
              Firmen ({companies?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:border-b-2 data-[state=active]:border-black">
              Kontakte ({contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="deals" className="data-[state=active]:border-b-2 data-[state=active]:border-black">
              Deals ({deals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:border-b-2 data-[state=active]:border-black">
              Aktivitäten ({activities?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-black">
              Notizen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowAddCompany(true)}
                className="bg-black text-white hover:bg-gray-800"
              >
                + Add
              </Button>
            </div>
            {companies && companies.length > 0 ? (
              <div className="space-y-4">
                {companies.map((company) => (
                  <Card key={company.id} className="border-2 border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-black">{company.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Land:</span>{' '}
                          <span className="text-black">{company.country || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stadt:</span>{' '}
                          <span className="text-black">{company.city || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rechtsform:</span>{' '}
                          <span className="text-black">{company.legalForm || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Website:</span>{' '}
                          {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-black underline">
                              Link
                            </a>
                          ) : (
                            <span className="text-black">-</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                Keine Firmen vorhanden
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowAddContact(true)}
                className="bg-black text-white hover:bg-gray-800"
              >
                + Add
              </Button>
            </div>
            {contacts && contacts.length > 0 ? (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <Card key={contact.id} className="border-2 border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-black">{contact.firstName} {contact.lastName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Position:</span>{' '}
                          <span className="text-black">{contact.position || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span>{' '}
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-black underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-black">-</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                Keine Kontakte vorhanden
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowAddDeal(true)}
                className="bg-black text-white hover:bg-gray-800"
              >
                + Add
              </Button>
            </div>
            {deals && deals.length > 0 ? (
              <div className="space-y-4">
                {deals.map((deal) => (
                  <Card key={deal.id} className="border-2 border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-black">{deal.dealName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Wert:</span>{' '}
                          <span className="text-black">
                            {deal.dealValueEur ? `€${Number(deal.dealValueEur).toLocaleString()}` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stage:</span>{' '}
                          <span className="text-black">{deal.stage}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Probability:</span>{' '}
                          <span className="text-black">{deal.probability}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                Keine Deals vorhanden
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Card key={activity.id} className="border-2 border-gray-300">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-black text-base">{activity.subject}</CardTitle>
                        <span className="text-sm text-gray-600">
                          {activity.activityDate ? new Date(activity.activityDate).toLocaleDateString('de-DE') : ''}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600 mb-2">
                        {activity.activityType} • {activity.direction}
                      </div>
                      {activity.content && (
                        <div className="text-sm text-black whitespace-pre-wrap">
                          {activity.content}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                Keine Aktivitäten vorhanden
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <Card className="border-2 border-gray-300">
              <CardContent className="pt-6">
                <div className="text-sm text-black whitespace-pre-wrap">
                  {corporation.notes || 'Keine Notizen vorhanden'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* How to use section */}
        <div className="mt-16 pt-8 border-t-2 border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">So verwendest du diese Seite</h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="mb-3">
              Auf dieser Seite siehst du alle Details zu einem Konzern. Hier kannst du die zugehörigen Firmen, Kontakte, Deals und Aktivitäten verwalten.
            </p>
            <p className="mb-3">
              <strong>Firmen hinzufügen:</strong> Klicke im Tab "Firmen" auf den "+ Add" Button, um eine neue Firma zu diesem Konzern hinzuzufügen. Gib mindestens den Firmennamen ein und optional weitere Details wie Land, Stadt und Website.
            </p>
            <p className="mb-3">
              <strong>Kontakte hinzufügen:</strong> Wechsle zum Tab "Kontakte" und klicke auf "+ Add", um einen neuen Ansprechpartner anzulegen. Vor- und Nachname sind Pflichtfelder, Email und Position sind optional.
            </p>
            <p className="mb-3">
              <strong>Deals hinzufügen:</strong> Im Tab "Deals" kannst du neue Verkaufschancen erfassen. Klicke auf "+ Add" und gib mindestens einen Deal-Namen ein. Du kannst auch den Wert, die Phase und die Wahrscheinlichkeit angeben.
            </p>
            <p className="mb-3">
              <strong>Aktivitäten ansehen:</strong> Im Tab "Aktivitäten" findest du alle E-Mails, Anrufe und Meetings, die zu diesem Konzern erfasst wurden. Diese werden automatisch chronologisch sortiert.
            </p>
            <p>
              <strong>Notizen bearbeiten:</strong> Im Tab "Notizen" kannst du wichtige Informationen zu diesem Konzern festhalten. Diese sind nur für dein Team sichtbar.
            </p>
          </div>
        </div>
      </main>

      {/* Add Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-black">Neue Firma hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="company-name">Firmenname *</Label>
              <Input
                id="company-name"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="z.B. Wilo SE"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="company-country">Land</Label>
              <Input
                id="company-country"
                value={newCompany.country}
                onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                placeholder="z.B. DE"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="company-city">Stadt</Label>
              <Input
                id="company-city"
                value={newCompany.city}
                onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                placeholder="z.B. Dortmund"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="company-website">Website</Label>
              <Input
                id="company-website"
                value={newCompany.website}
                onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                placeholder="z.B. https://wilo.com"
                className="border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCompany(false)}
              className="border-gray-300"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddCompany}
              disabled={createCompany.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createCompany.isPending ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-black">Neuen Kontakt hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contact-firstname">Vorname *</Label>
              <Input
                id="contact-firstname"
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                placeholder="z.B. Max"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="contact-lastname">Nachname *</Label>
              <Input
                id="contact-lastname"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                placeholder="z.B. Mustermann"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="z.B. max.mustermann@firma.de"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="contact-position">Position</Label>
              <Input
                id="contact-position"
                value={newContact.position}
                onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                placeholder="z.B. Geschäftsführer"
                className="border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddContact(false)}
              className="border-gray-300"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddContact}
              disabled={createContact.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createContact.isPending ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-black">Neuen Deal hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="deal-name">Deal-Name *</Label>
              <Input
                id="deal-name"
                value={newDeal.dealName}
                onChange={(e) => setNewDeal({ ...newDeal, dealName: e.target.value })}
                placeholder="z.B. Pumpen-Projekt Q1 2025"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="deal-value">Wert (EUR)</Label>
              <Input
                id="deal-value"
                type="number"
                value={newDeal.dealValueEur}
                onChange={(e) => setNewDeal({ ...newDeal, dealValueEur: e.target.value })}
                placeholder="z.B. 50000"
                className="border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="deal-stage">Phase</Label>
              <select
                id="deal-stage"
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="Qualification">Qualification</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <Label htmlFor="deal-probability">Wahrscheinlichkeit (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                value={newDeal.probability}
                onChange={(e) => setNewDeal({ ...newDeal, probability: e.target.value })}
                placeholder="z.B. 50"
                className="border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDeal(false)}
              className="border-gray-300"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddDeal}
              disabled={createDeal.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createDeal.isPending ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
