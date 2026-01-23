import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function CompanyDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    legalForm: "",
    city: "",
    country: "",
    address: "",
    revenueEur: 0,
    website: "",
    products: "",
    notes: "",
  });
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
  });
  
  const { data: company, isLoading: companyLoading } = trpc.companies.get.useQuery({ id: id! });
  const { data: corporation } = trpc.corporations.get.useQuery(
    { id: company?.corporationId || '' },
    { enabled: !!company?.corporationId }
  );
  const { data: contacts } = trpc.contacts.listByCompany.useQuery(
    { companyId: id! },
    { enabled: !!id }
  );
  const { data: deals } = trpc.deals.listByCompany.useQuery(
    { companyId: id! },
    { enabled: !!id }
  );
  const { data: activities } = trpc.activities.listByCompany.useQuery(
    { companyId: id!, limit: 20 },
    { enabled: !!id }
  );

  const updateCompanyMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.get.invalidate({ id: id! });
      setIsEditOpen(false);
    },
  });

  const createContactMutation = trpc.contacts.create.useMutation({
    onMutate: () => {
      // Prevent double submission
    },
    onSuccess: () => {
      utils.contacts.listByCompany.invalidate({ companyId: id! });
      setIsCreateContactOpen(false);
      setNewContact({ firstName: "", lastName: "", email: "", phone: "", position: "" });
    },
  });

  const handleCreateContact = () => {
    createContactMutation.mutate({
      ...newContact,
      companyId: id!,
    });
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Firma nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-600">
          <Link href="/corporations">
            <a className="hover:underline">Konzerne</a>
          </Link>
          {corporation && (
            <>
              {' > '}
              <Link href={`/corporations/${corporation.id}`}>
                <a className="hover:underline">{corporation.name}</a>
              </Link>
            </>
          )}
          {' > '}
          <span className="text-gray-900 font-medium">{company.name}</span>
        </div>

        {/* Company Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                {company.legalForm && <span>{company.legalForm}</span>}
                {company.country && <span>• {company.country}</span>}
                {company.city && <span>• {company.city}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setEditData({
                  name: company.name || "",
                  legalForm: company.legalForm || "",
                  city: company.city || "",
                  country: company.country || "",
                  address: company.address || "",
                  revenueEur: company.revenueEur || 0,
                  website: company.website || "",
                  products: company.products || "",
                  notes: company.notes || "",
                });
                setIsEditOpen(true);
              }}>Bearbeiten</Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-8">
          <Button variant="outline" size="sm">✉ Email</Button>
          <Button variant="outline" size="sm">☎ Call</Button>
          <Button variant="outline" size="sm">📅 Meeting</Button>
          <Button variant="outline" size="sm">📝 Note</Button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Umsatz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900">
                {company.revenueEur ? `€${(company.revenueEur / 1000000000).toFixed(1)}B` : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Kontakte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900">{contacts?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900">{deals?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900">{activities?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList>
            <TabsTrigger value="contacts">
              Kontakte ({contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals ({deals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activities">
              Aktivitäten ({activities?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="info">
              Informationen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-6">
             {contacts && contacts.length > 0 ? (
              <div>
                <div className="mb-4">
                  <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Kontakt hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="firstName">Vorname *</Label>
                          <Input
                            id="firstName"
                            value={newContact.firstName}
                            onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Nachname *</Label>
                          <Input
                            id="lastName"
                            value={newContact.lastName}
                            onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefon</Label>
                          <Input
                            id="phone"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="position">Position</Label>
                          <Input
                            id="position"
                            value={newContact.position}
                            onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={handleCreateContact}
                          disabled={!newContact.firstName || !newContact.lastName || !newContact.email || createContactMutation.isPending}
                          className="w-full"
                        >
                          {createContactMutation.isPending ? "Erstellt..." : "Kontakt anlegen"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                {contacts.map((contact) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-black">
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.decisionMaker && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Decision Maker</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <div>Position: {contact.jobTitle || '-'}</div>
                            <div>Email: {(contact as any).email || '-'}</div>
                            <div>Tel: {contact.phone || '-'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs rounded ${
                            contact.contactStatus === 'Active' ? 'bg-green-100 text-green-800' :
                            contact.contactStatus === 'Cold' ? 'bg-gray-100 text-gray-800' :
                            contact.contactStatus === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
                            contact.contactStatus === 'Hot' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {contact.contactStatus || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <p className="mb-4">Keine Kontakte vorhanden</p>
                <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Kontakt hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="firstName">Vorname *</Label>
                        <Input
                          id="firstName"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          placeholder="z.B. Peter"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nachname *</Label>
                        <Input
                          id="lastName"
                          value={newContact.lastName}
                          onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                          placeholder="z.B. Salz"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-Mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          placeholder="z.B. peter@JH-test.de"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          placeholder="z.B. +49 123 456789"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={newContact.position}
                          onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                          placeholder="z.B. Geschäftsführer"
                        />
                      </div>
                      <Button
                        onClick={handleCreateContact}
                        disabled={!newContact.firstName || !newContact.lastName || !newContact.email || createContactMutation.isPending}
                        className="w-full"
                      >
                        {createContactMutation.isPending ? "Erstelle..." : "Kontakt anlegen"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            {deals && deals.length > 0 ? (
              <div className="space-y-4">
                {deals.map((deal: any) => (
                  <Card key={deal.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{deal.dealName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Wert:</span>{' '}
                          <span className="text-gray-900">
                            €{deal.dealValueEur ? Number(deal.dealValueEur).toLocaleString() : '0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stage:</span>{' '}
                          <span className="text-gray-900">{deal.stage || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Wahrscheinlichkeit:</span>{' '}
                          <span className="text-gray-900">{deal.probability || 0}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <p className="mb-4">Keine Deals vorhanden</p>
                <Button>+ Deal hinzufügen</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity: any) => (
                  <Card key={activity.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="text-2xl">{activity.activityType === 'email' ? '✉️' : activity.activityType === 'call' ? '☎️' : '📝'}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{activity.subject}</div>
                          <div className="text-sm text-gray-600 mt-1">{activity.notes}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            {activity.activityDate ? new Date(activity.activityDate).toLocaleDateString('de-DE') : '-'}
                          </div>
                        </div>
                      </div>
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

          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Firmeninformationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Name</div>
                    <div className="text-gray-900">{company.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Rechtsform</div>
                    <div className="text-gray-900">{company.legalForm || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Land</div>
                    <div className="text-gray-900">{company.country || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Stadt</div>
                    <div className="text-gray-900">{company.city || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Adresse</div>
                    <div className="text-gray-900">{company.address || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Website</div>
                    <div className="text-gray-900">
                      {company.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {company.website}
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Produkte</div>
                    <div className="text-gray-900">{company.products || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Notizen</div>
                    <div className="text-gray-900">{company.notes || '-'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Company Dialog - Verbessert */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Firma bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Grunddaten */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Grunddaten</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input id="edit-name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Firmenname" />
                </div>
                <div>
                  <Label htmlFor="edit-legalForm">Rechtsform</Label>
                  <Input id="edit-legalForm" value={editData.legalForm || ''} onChange={(e) => setEditData({ ...editData, legalForm: e.target.value })} placeholder="z.B. GmbH, AG" />
                </div>
                <div>
                  <Label htmlFor="edit-country">Land</Label>
                  <Input id="edit-country" value={editData.country} onChange={(e) => setEditData({ ...editData, country: e.target.value })} placeholder="z.B. DE" />
                </div>
                <div>
                  <Label htmlFor="edit-city">Stadt</Label>
                  <Input id="edit-city" value={editData.city} onChange={(e) => setEditData({ ...editData, city: e.target.value })} placeholder="z.B. Berlin" />
                </div>
                <div>
                  <Label htmlFor="edit-revenue">Umsatz (EUR)</Label>
                  <Input id="edit-revenue" type="number" value={editData.revenueEur || ''} onChange={(e) => setEditData({ ...editData, revenueEur: parseInt(e.target.value) || 0 })} placeholder="z.B. 100000000" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">Adresse</Label>
                  <Input id="edit-address" value={editData.address || ''} onChange={(e) => setEditData({ ...editData, address: e.target.value })} placeholder="Straße, PLZ, Stadt" />
                </div>
              </div>
            </div>
            
            {/* Online & Produkte */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Online & Produkte</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-website">Website</Label>
                  <Input id="edit-website" value={editData.website} onChange={(e) => setEditData({ ...editData, website: e.target.value })} placeholder="https://www.beispiel.de" />
                </div>
                <div>
                  <Label htmlFor="edit-products">Produkte</Label>
                  <Input id="edit-products" value={editData.products} onChange={(e) => setEditData({ ...editData, products: e.target.value })} placeholder="z.B. Software, Consulting" />
                </div>
              </div>
            </div>
            
            {/* Notizen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Notizen</h3>
              <Textarea id="edit-notes" value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} placeholder="Notizen zur Firma..." rows={3} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Abbrechen</Button>
            <Button onClick={() => updateCompanyMutation.mutate({ id: id!, ...editData })} disabled={!editData.name || updateCompanyMutation.isPending}>
              {updateCompanyMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

