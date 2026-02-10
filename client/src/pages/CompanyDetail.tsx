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
    country: "",
    city: "",
    address: "",
    revenueEur: 0,
    products: "",
    website: "",
    notes: "",
    companyName2: "",
    responsibleUserId: "",
    street: "",
    zip: "",
    state: "",
    poBox: "",
    poBoxZip: "",
    rebate: 0,
    priceList: "",
    rebateList: "",
    debitorNumber: "",
    creditorNumber: "",
    taxNumber: "",
    paymentTerm: "",
    currency: "",
    company_type: "",
    parent_company_id: "",
    domain: "",
    addressFormat: "",
    branch: "",
    city2: "",
    companySize: "",
    deactivated: false,
    district: "",
    email: "",
    externalAddressId: "",
    gwAddressNumber: "",
    name2: "",
    ownerName: "",
    phone: "",
    phone2: "",
    poBoxCity: "",
    stage: "",
    state2: "",
    street2: "",
    taxId: "",
    website2: "",
    zip2: "",
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
                  country: company.country || "",
                  city: company.city || "",
                  address: company.address || "",
                  revenueEur: company.revenueEur || 0,
                  products: company.products || "",
                  website: company.website || "",
                  notes: company.notes || "",
                  companyName2: company.companyName2 || "",
                  responsibleUserId: company.responsibleUserId || "",
                  street: company.street || "",
                  zip: company.zip || "",
                  state: company.state || "",
                  poBox: company.poBox || "",
                  poBoxZip: company.poBoxZip || "",
                  rebate: company.rebate || 0,
                  priceList: company.priceList || "",
                  rebateList: company.rebateList || "",
                  debitorNumber: company.debitorNumber || "",
                  creditorNumber: company.creditorNumber || "",
                  taxNumber: company.taxNumber || "",
                  paymentTerm: company.paymentTerm || "",
                  currency: company.currency || "",
                  company_type: company.company_type || "",
                  parent_company_id: company.parent_company_id || "",
                  domain: company.domain || "",
                  addressFormat: company.addressFormat || "",
                  branch: company.branch || "",
                  city2: company.city2 || "",
                  companySize: company.companySize || "",
                  deactivated: company.deactivated || false,
                  district: company.district || "",
                  email: company.email || "",
                  externalAddressId: company.externalAddressId || "",
                  gwAddressNumber: company.gwAddressNumber || "",
                  name2: company.name2 || "",
                  ownerName: company.ownerName || "",
                  phone: company.phone || "",
                  phone2: company.phone2 || "",
                  poBoxCity: company.poBoxCity || "",
                  stage: company.stage || "",
                  state2: company.state2 || "",
                  street2: company.street2 || "",
                  taxId: company.taxId || "",
                  website2: company.website2 || "",
                  zip2: company.zip2 || "",
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
                  <Input id="edit-name" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Firmenname" />
                </div>
                <div className="">
                  <Label htmlFor="edit-legalForm">Rechtsform</Label>
                  <Input id="edit-legalForm" value={editData.legalForm || ''} onChange={(e) => setEditData({ ...editData, legalForm: e.target.value })} placeholder="z.B. GmbH, AG" />
                </div>
                <div className="">
                  <Label htmlFor="edit-country">Land</Label>
                  <Input id="edit-country" value={editData.country || ''} onChange={(e) => setEditData({ ...editData, country: e.target.value })} placeholder="z.B. DE" />
                </div>
                <div className="">
                  <Label htmlFor="edit-city">Stadt</Label>
                  <Input id="edit-city" value={editData.city || ''} onChange={(e) => setEditData({ ...editData, city: e.target.value })} placeholder="z.B. Berlin" />
                </div>
                <div>
                  <Label htmlFor="edit-revenueEur">Umsatz (EUR)</Label>
                  <Input id="edit-revenueEur" type="number" value={editData.revenueEur || ''} onChange={(e) => setEditData({ ...editData, revenueEur: revenueEur === 'rebate' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0 })} placeholder="z.B. 100000000" />
                </div>
                <div className="">
                  <Label htmlFor="edit-companySize">Unternehmensgröße</Label>
                  <Input id="edit-companySize" value={editData.companySize || ''} onChange={(e) => setEditData({ ...editData, companySize: e.target.value })} placeholder="z.B. 50-250" />
                </div>
                <div className="">
                  <Label htmlFor="edit-branch">Branche</Label>
                  <Input id="edit-branch" value={editData.branch || ''} onChange={(e) => setEditData({ ...editData, branch: e.target.value })} placeholder="z.B. IT, Consulting" />
                </div>
                <div className="">
                  <Label htmlFor="edit-stage">Phase</Label>
                  <Input id="edit-stage" value={editData.stage || ''} onChange={(e) => setEditData({ ...editData, stage: e.target.value })} placeholder="z.B. Lead, Customer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-company_type">Typ</Label>
                  <Input id="edit-company_type" value={editData.company_type || ''} onChange={(e) => setEditData({ ...editData, company_type: e.target.value })} placeholder="z.B. customer, prospect" />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Adresse</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="edit-street">Straße</Label>
                  <Input id="edit-street" value={editData.street || ''} onChange={(e) => setEditData({ ...editData, street: e.target.value })} placeholder="Straße und Hausnummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-zip">PLZ</Label>
                  <Input id="edit-zip" value={editData.zip || ''} onChange={(e) => setEditData({ ...editData, zip: e.target.value })} placeholder="Postleitzahl" />
                </div>
                <div className="">
                  <Label htmlFor="edit-state">Bundesland</Label>
                  <Input id="edit-state" value={editData.state || ''} onChange={(e) => setEditData({ ...editData, state: e.target.value })} placeholder="z.B. Bayern" />
                </div>
                <div className="">
                  <Label htmlFor="edit-district">Bezirk</Label>
                  <Input id="edit-district" value={editData.district || ''} onChange={(e) => setEditData({ ...editData, district: e.target.value })} placeholder="Bezirk/Region" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">Vollständige Adresse</Label>
                  <Textarea id="edit-address" value={editData.address || ''} onChange={(e) => setEditData({ ...editData, address: e.target.value })} placeholder="Straße, PLZ, Stadt" rows={3} className="resize-none" />
                </div>
              </div>
            </div>

            {/* Zweite Adresse */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Zweite Adresse</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="edit-street2">Straße 2</Label>
                  <Input id="edit-street2" value={editData.street2 || ''} onChange={(e) => setEditData({ ...editData, street2: e.target.value })} placeholder="Zweite Adresse" />
                </div>
                <div className="">
                  <Label htmlFor="edit-zip2">PLZ 2</Label>
                  <Input id="edit-zip2" value={editData.zip2 || ''} onChange={(e) => setEditData({ ...editData, zip2: e.target.value })} placeholder="PLZ zweite Adresse" />
                </div>
                <div className="">
                  <Label htmlFor="edit-city2">Stadt 2</Label>
                  <Input id="edit-city2" value={editData.city2 || ''} onChange={(e) => setEditData({ ...editData, city2: e.target.value })} placeholder="Stadt zweite Adresse" />
                </div>
                <div className="">
                  <Label htmlFor="edit-state2">Bundesland 2</Label>
                  <Input id="edit-state2" value={editData.state2 || ''} onChange={(e) => setEditData({ ...editData, state2: e.target.value })} placeholder="Bundesland zweite Adresse" />
                </div>
              </div>
            </div>

            {/* Postfach */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Postfach</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="edit-poBox">Postfach</Label>
                  <Input id="edit-poBox" value={editData.poBox || ''} onChange={(e) => setEditData({ ...editData, poBox: e.target.value })} placeholder="Postfachnummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-poBoxZip">Postfach PLZ</Label>
                  <Input id="edit-poBoxZip" value={editData.poBoxZip || ''} onChange={(e) => setEditData({ ...editData, poBoxZip: e.target.value })} placeholder="PLZ des Postfachs" />
                </div>
                <div className="">
                  <Label htmlFor="edit-poBoxCity">Postfach Stadt</Label>
                  <Input id="edit-poBoxCity" value={editData.poBoxCity || ''} onChange={(e) => setEditData({ ...editData, poBoxCity: e.target.value })} placeholder="Stadt des Postfachs" />
                </div>
              </div>
            </div>

            {/* Kontakt */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Kontakt</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input id="edit-phone" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} placeholder="Haupttelefonnummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-phone2">Telefon 2</Label>
                  <Input id="edit-phone2" value={editData.phone2 || ''} onChange={(e) => setEditData({ ...editData, phone2: e.target.value })} placeholder="Zweite Telefonnummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-email">E-Mail</Label>
                  <Input id="edit-email" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} placeholder="Haupt-E-Mail-Adresse" />
                </div>
                <div className="">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input id="edit-website" value={editData.website || ''} onChange={(e) => setEditData({ ...editData, website: e.target.value })} placeholder="https://www.beispiel.de" />
                </div>
                <div className="">
                  <Label htmlFor="edit-website2">Website 2</Label>
                  <Input id="edit-website2" value={editData.website2 || ''} onChange={(e) => setEditData({ ...editData, website2: e.target.value })} placeholder="Zweite Website" />
                </div>
                <div className="">
                  <Label htmlFor="edit-domain">Domain</Label>
                  <Input id="edit-domain" value={editData.domain || ''} onChange={(e) => setEditData({ ...editData, domain: e.target.value })} placeholder="beispiel.de" />
                </div>
              </div>
            </div>

            {/* Finanzen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Finanzen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="edit-debitorNumber">Debitorennummer</Label>
                  <Input id="edit-debitorNumber" value={editData.debitorNumber || ''} onChange={(e) => setEditData({ ...editData, debitorNumber: e.target.value })} placeholder="Debitorennummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-creditorNumber">Kreditorennummer</Label>
                  <Input id="edit-creditorNumber" value={editData.creditorNumber || ''} onChange={(e) => setEditData({ ...editData, creditorNumber: e.target.value })} placeholder="Kreditorennummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-taxNumber">Steuernummer</Label>
                  <Input id="edit-taxNumber" value={editData.taxNumber || ''} onChange={(e) => setEditData({ ...editData, taxNumber: e.target.value })} placeholder="Steuernummer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-taxId">USt-IdNr.</Label>
                  <Input id="edit-taxId" value={editData.taxId || ''} onChange={(e) => setEditData({ ...editData, taxId: e.target.value })} placeholder="Umsatzsteuer-ID" />
                </div>
                <div className="">
                  <Label htmlFor="edit-currency">Währung</Label>
                  <Input id="edit-currency" value={editData.currency || ''} onChange={(e) => setEditData({ ...editData, currency: e.target.value })} placeholder="z.B. EUR, USD" />
                </div>
                <div className="">
                  <Label htmlFor="edit-paymentTerm">Zahlungsbedingungen</Label>
                  <Input id="edit-paymentTerm" value={editData.paymentTerm || ''} onChange={(e) => setEditData({ ...editData, paymentTerm: e.target.value })} placeholder="z.B. 30 Tage netto" />
                </div>
                <div>
                  <Label htmlFor="edit-rebate">Rabatt (%)</Label>
                  <Input id="edit-rebate" type="number" value={editData.rebate || ''} onChange={(e) => setEditData({ ...editData, rebate: rebate === 'rebate' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0 })} placeholder="Rabatt in Prozent" />
                </div>
                <div className="">
                  <Label htmlFor="edit-priceList">Preisliste</Label>
                  <Input id="edit-priceList" value={editData.priceList || ''} onChange={(e) => setEditData({ ...editData, priceList: e.target.value })} placeholder="Zugewiesene Preisliste" />
                </div>
                <div className="">
                  <Label htmlFor="edit-rebateList">Rabattliste</Label>
                  <Input id="edit-rebateList" value={editData.rebateList || ''} onChange={(e) => setEditData({ ...editData, rebateList: e.target.value })} placeholder="Zugewiesene Rabattliste" />
                </div>
              </div>
            </div>

            {/* Weitere Informationen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Weitere Informationen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-products">Produkte</Label>
                  <Textarea id="edit-products" value={editData.products || ''} onChange={(e) => setEditData({ ...editData, products: e.target.value })} placeholder="z.B. Software, Consulting" rows={3} className="resize-none" />
                </div>
                <div className="">
                  <Label htmlFor="edit-ownerName">Eigentümer</Label>
                  <Input id="edit-ownerName" value={editData.ownerName || ''} onChange={(e) => setEditData({ ...editData, ownerName: e.target.value })} placeholder="Name des Eigentümers" />
                </div>
                <div className="">
                  <Label htmlFor="edit-responsibleUserId">Verantwortlicher</Label>
                  <Input id="edit-responsibleUserId" value={editData.responsibleUserId || ''} onChange={(e) => setEditData({ ...editData, responsibleUserId: e.target.value })} placeholder="Verantwortlicher Benutzer" />
                </div>
                <div className="">
                  <Label htmlFor="edit-parent_company_id">Muttergesellschaft</Label>
                  <Input id="edit-parent_company_id" value={editData.parent_company_id || ''} onChange={(e) => setEditData({ ...editData, parent_company_id: e.target.value })} placeholder="ID der Muttergesellschaft" />
                </div>
                <div className="">
                  <Label htmlFor="edit-companyName2">Firmenname 2</Label>
                  <Input id="edit-companyName2" value={editData.companyName2 || ''} onChange={(e) => setEditData({ ...editData, companyName2: e.target.value })} placeholder="Alternativer Firmenname" />
                </div>
                <div className="">
                  <Label htmlFor="edit-name2">Name 2</Label>
                  <Input id="edit-name2" value={editData.name2 || ''} onChange={(e) => setEditData({ ...editData, name2: e.target.value })} placeholder="Weiterer Name" />
                </div>
                <div className="">
                  <Label htmlFor="edit-addressFormat">Adressformat</Label>
                  <Input id="edit-addressFormat" value={editData.addressFormat || ''} onChange={(e) => setEditData({ ...editData, addressFormat: e.target.value })} placeholder="Format der Adresse" />
                </div>
                <div className="">
                  <Label htmlFor="edit-externalAddressId">Externe Adress-ID</Label>
                  <Input id="edit-externalAddressId" value={editData.externalAddressId || ''} onChange={(e) => setEditData({ ...editData, externalAddressId: e.target.value })} placeholder="ID in externem System" />
                </div>
                <div className="">
                  <Label htmlFor="edit-gwAddressNumber">GW-Adressnummer</Label>
                  <Input id="edit-gwAddressNumber" value={editData.gwAddressNumber || ''} onChange={(e) => setEditData({ ...editData, gwAddressNumber: e.target.value })} placeholder="GenesisWorld Adressnummer" />
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <input type="checkbox" id="edit-deactivated" checked={editData.deactivated || false} onChange={(e) => setEditData({ ...editData, deactivated: e.target.checked })} className="h-4 w-4" />
                  <Label htmlFor="edit-deactivated">Deaktiviert</Label>
                </div>
              </div>
            </div>

            {/* Notizen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Notizen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-notes">Notizen</Label>
                  <Textarea id="edit-notes" value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} placeholder="Notizen zur Firma..." rows={3} className="resize-none" />
                </div>
              </div>
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

