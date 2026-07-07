import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";

export default function CorporationDetailNew() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  
  // State für Dialoge
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  
  // Edit-Daten für Konzern
  const [editData, setEditData] = useState({
    name: '',
    industry: '',
    headquartersCountry: '',
    totalRevenueEur: 0,
    employeeCount: 0,
    website: '',
    linkedinUrl: '',
    status: 'Target',
    priority: 'Medium',
    stage: '',
    companySize: '',
    notes: ''
  });
  
  // Neue Firma Daten
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    legalForm: '',
    country: '',
    city: '',
    address: '',
    revenueEur: 0,
    website: '',
    products: '',
    notes: ''
  });
  
  // Neuer Kontakt Daten
  const [newContactData, setNewContactData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    phone: '',
    mobile: '',
    contactStatus: 'Cold',
    decisionMaker: false,
    linkedinUrl: '',
    notes: ''
  });
  
  // Neuer Deal Daten
  const [newDealData, setNewDealData] = useState({
    name: '',
    value: 0,
    stage: 'Lead',
    description: ''
  });

  // Queries
  const { data: corporation, isLoading } = trpc.corporations.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );
  
  const { data: companies } = trpc.companies.getByCorporation.useQuery(
    { corporationId: id! },
    { enabled: !!id }
  );
  
  const { data: deals } = (trpc as any).deals.getByCorporation.useQuery(
    { corporationId: id! },
    { enabled: !!id }
  );

  // Mutations
  const utils = trpc.useUtils();
  
  const updateCorporationMutation = (trpc.corporations.update as any).useMutation({
    onSuccess: () => {
      (utils.corporations as any).getById ? (utils.corporations as any).getById.invalidate({ id: id! }) : utils.corporations.list.invalidate();
      setIsEditOpen(false);
    }
  });
  
  const createCompanyMutation = (trpc.companies.create as any).useMutation({
    onSuccess: () => {
      utils.companies.getByCorporation.invalidate({ corporationId: id! });
      setShowAddCompany(false);
      resetCompanyForm();
    }
  });
  
  const createContactMutation = ((trpc as any).contacts.create as any).useMutation({
    onSuccess: () => {
      setShowAddContact(false);
      resetContactForm();
    }
  });
  
  const createDealMutation = ((trpc as any).deals.create as any).useMutation({
    onSuccess: () => {
      (utils as any).deals.getByCorporation.invalidate({ corporationId: id! });
      setShowAddDeal(false);
      resetDealForm();
    }
  });

  // Reset-Funktionen
  const resetCompanyForm = () => {
    setNewCompanyData({ name: '', legalForm: '', country: '', city: '', address: '', revenueEur: 0, website: '', products: '', notes: '' });
  };
  
  const resetContactForm = () => {
    setNewContactData({ firstName: '', lastName: '', jobTitle: '', email: '', phone: '', mobile: '', contactStatus: 'Cold', decisionMaker: false, linkedinUrl: '', notes: '' });
  };
  
  const resetDealForm = () => {
    setNewDealData({ name: '', value: 0, stage: 'Lead', description: '' });
  };

  // Effect: Edit-Daten laden wenn Dialog öffnet
  useEffect(() => {
    if (isEditOpen && corporation) {
      setEditData({
        name: corporation.name || '',
        industry: corporation.industry || '',
        headquartersCountry: corporation.headquartersCountry || '',
        totalRevenueEur: corporation.totalRevenueEur || 0,
        employeeCount: corporation.employeeCount || 0,
        website: corporation.website || '',
        linkedinUrl: corporation.linkedinUrl || '',
        status: corporation.status || 'Target',
        priority: corporation.priority || 'Medium',
        stage: corporation.stage || '',
        companySize: corporation.companySize || '',
        notes: corporation.notes || ''
      });
    }
  }, [isEditOpen, corporation]);

  // Handler
  const handleSave = () => {
    updateCorporationMutation.mutate({
      id: id!,
      ...editData
    });
  };
  
  const handleAddCompany = () => {
    createCompanyMutation.mutate({
      ...newCompanyData,
      corporationId: id!
    });
  };
  
  const handleAddContact = () => {
    createContactMutation.mutate({
      ...newContactData
    });
  };
  
  const handleAddDeal = () => {
    const firstCompany = companies?.[0];
    if (firstCompany) {
      createDealMutation.mutate({
        ...newDealData,
        companyId: firstCompany.id
      });
    }
  };

  // Statistiken berechnen
  const totalDeals = deals?.length || 0;
  const totalValue = deals?.reduce((sum: any, d: any) => sum + (d.value || 0), 0) || 0;
  const dealStats = {
    won: { count: deals?.filter((d: any) => d.stage === 'Won').length || 0, value: deals?.filter((d: any) => d.stage === 'Won').reduce((s: any, d: any) => s + (d.value || 0), 0) || 0 },
    lost: { count: deals?.filter((d: any) => d.stage === 'Lost').length || 0, value: deals?.filter((d: any) => d.stage === 'Lost').reduce((s: any, d: any) => s + (d.value || 0), 0) || 0 },
    open: { count: deals?.filter((d: any) => d.stage !== 'Won' && d.stage !== 'Lost').length || 0, value: deals?.filter((d: any) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s: any, d: any) => s + (d.value || 0), 0) || 0 }
  };

  // Helper-Funktionen
  const getStatusClass = (status: string) => {
    if (status === "Customer") return "status-customer";
    if (status === "Contacted") return "status-contacted";
    if (status === "Lost") return "status-lost";
    return "status-target";
  };
  
  const getPriorityClass = (priority: string) => {
    if (priority === "High") return "priority-high";
    if (priority === "Medium") return "priority-medium";
    return "priority-low";
  };
  
  const getPriorityStars = (priority: string) => {
    if (priority === "High") return "★★★";
    if (priority === "Medium") return "★★☆";
    return "★☆☆";
  };

  if (isLoading) {
    return <div className="p-8">Laden...</div>;
  }

  if (!corporation) {
    return <div className="p-8">Konzern nicht gefunden</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/corporations" className="text-sm text-muted-foreground hover:underline mb-2 block">
            ← Zurück zur Konzernliste
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{corporation.name}</h1>
        </div>
        <Button onClick={() => setIsEditOpen(true)}>Bearbeiten</Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Corporation Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {corporation.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">{corporation.name}</h2>
                  <div className={`text-sm font-medium mb-4 ${getPriorityClass(corporation.priority || "Medium")}`}>
                    {getPriorityStars(corporation.priority || "Medium")} {corporation.priority || "Medium"} Priority
                  </div>
                  <div className={`status-badge ${getStatusClass(corporation.status || "Target")} mb-6`}>
                    {corporation.status || "Target"}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {corporation.industry && (
                      <div>
                        <span className="text-muted-foreground">Branche</span>
                        <div className="font-medium">{corporation.industry}</div>
                      </div>
                    )}
                    {corporation.headquartersCountry && (
                      <div>
                        <span className="text-muted-foreground">Land</span>
                        <div className="font-medium">{corporation.headquartersCountry}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Deals</span>
                      <span className="font-medium ml-2">{totalDeals}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-medium ml-2">€{(totalValue / 1000).toFixed(0)}k</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Companies</span>
                      <span className="font-medium ml-2">{companies?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contacts</span>
                      <span className="font-medium ml-2">0</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Companies Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Companies ({companies?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => setShowAddCompany(true)}>+ Add</Button>
            </CardHeader>
            <CardContent>
              {companies && companies.length > 0 ? (
                <div className="space-y-2">
                  {companies.map((company) => (
                    <Link key={company.id} href={`/companies/${company.id}`}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.city && `${company.city}, `}{company.country}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Keine Firmen vorhanden</p>
              )}
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts (0)</CardTitle>
              <Button size="sm" onClick={() => setShowAddContact(true)}>+ Add</Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Keine Kontakte vorhanden</p>
            </CardContent>
          </Card>

          {/* Deals Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Deals ({totalDeals})</CardTitle>
              <Button size="sm" onClick={() => setShowAddDeal(true)}>+ Add</Button>
            </CardHeader>
            <CardContent>
              {deals && deals.length > 0 ? (
                <div className="space-y-2">
                  {deals.map((deal: any) => (
                    <div key={deal.id} className="p-3 rounded-lg border">
                      <div className="flex justify-between">
                        <span className="font-medium">{deal.name}</span>
                        <span className="text-sm">€{((deal.value || 0) / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{deal.stage}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Keine Deals vorhanden</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{corporation.notes || "Keine Notizen vorhanden"}</p>
            </CardContent>
          </Card>

          {/* Links */}
          {(corporation.website || corporation.linkedinUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {corporation.website && (
                  <a href={corporation.website} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline text-sm">
                    🌐 Website
                  </a>
                )}
                {corporation.linkedinUrl && (
                  <a href={corporation.linkedinUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline text-sm">
                    💼 LinkedIn
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deal Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Statistiken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Won: {dealStats.won.count}</span>
                <span>€{(dealStats.won.value / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lost: {dealStats.lost.count}</span>
                <span>€{(dealStats.lost.value / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#E48F00]">Open: {dealStats.open.count}</span>
                <span>€{(dealStats.open.value / 1000).toFixed(0)}k</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* EDIT CORPORATION DIALOG - Verbessert mit allen Feldern */}
      {/* ============================================================================ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Konzern bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Grunddaten */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Grunddaten</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={editData.name} onChange={(e: any) => setEditData({ ...editData, name: e.target.value })} placeholder="Konzernname" />
                </div>
                <div>
                  <Label htmlFor="industry">Branche</Label>
                  <Input id="industry" value={editData.industry} onChange={(e: any) => setEditData({ ...editData, industry: e.target.value })} placeholder="z.B. Technologie & Software" />
                </div>
                <div>
                  <Label htmlFor="country">Land</Label>
                  <Input id="country" value={editData.headquartersCountry} onChange={(e: any) => setEditData({ ...editData, headquartersCountry: e.target.value })} placeholder="z.B. DE" />
                </div>
                <div>
                  <Label htmlFor="revenue">Umsatz (EUR)</Label>
                  <Input id="revenue" type="number" value={editData.totalRevenueEur || ''} onChange={(e: any) => setEditData({ ...editData, totalRevenueEur: parseInt(e.target.value) || 0 })} placeholder="z.B. 2500000000" />
                </div>
                <div>
                  <Label htmlFor="employeeCount">Mitarbeiter</Label>
                  <Input id="employeeCount" type="number" value={editData.employeeCount || ''} onChange={(e: any) => setEditData({ ...editData, employeeCount: parseInt(e.target.value) || 0 })} placeholder="z.B. 5000" />
                </div>
              </div>
            </div>
            
            {/* Online-Präsenz */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Online-Präsenz</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={editData.website} onChange={(e: any) => setEditData({ ...editData, website: e.target.value })} placeholder="https://www.beispiel.de" />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input id="linkedin" value={editData.linkedinUrl} onChange={(e: any) => setEditData({ ...editData, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/company/..." />
                </div>
              </div>
            </div>
            
            {/* Status & Priorität */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Status & Priorität</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select id="status" value={editData.status} onChange={(e: any) => setEditData({ ...editData, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="Target">Target</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Customer">Customer</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <select id="priority" value={editData.priority} onChange={(e: any) => setEditData({ ...editData, priority: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Input id="stage" value={editData.stage || ''} onChange={(e: any) => setEditData({ ...editData, stage: e.target.value })} placeholder="z.B. Producer, Distributor" />
                </div>
                <div>
                  <Label htmlFor="companySize">Unternehmensgröße</Label>
                  <Input id="companySize" value={editData.companySize || ''} onChange={(e: any) => setEditData({ ...editData, companySize: e.target.value })} placeholder="z.B. Enterprise, SMB" />
                </div>
              </div>
            </div>
            
            {/* Notizen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">Notizen</h3>
              <Textarea id="notes" value={editData.notes} onChange={(e: any) => setEditData({ ...editData, notes: e.target.value })} placeholder="Notizen zum Konzern..." rows={4} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!editData.name || updateCorporationMutation.isPending}>
              {updateCorporationMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* ADD COMPANY DIALOG - Verbessert mit allen Feldern */}
      {/* ============================================================================ */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Neue Firma hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="companyName">Firmenname *</Label>
                <Input id="companyName" value={newCompanyData.name} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, name: e.target.value })} placeholder="z.B. TechVision GmbH" />
              </div>
              <div>
                <Label htmlFor="companyLegalForm">Rechtsform</Label>
                <Input id="companyLegalForm" value={newCompanyData.legalForm} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, legalForm: e.target.value })} placeholder="z.B. GmbH, AG" />
              </div>
              <div>
                <Label htmlFor="companyCountry">Land</Label>
                <Input id="companyCountry" value={newCompanyData.country} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, country: e.target.value })} placeholder="z.B. DE" />
              </div>
              <div>
                <Label htmlFor="companyCity">Stadt</Label>
                <Input id="companyCity" value={newCompanyData.city} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, city: e.target.value })} placeholder="z.B. Berlin" />
              </div>
              <div>
                <Label htmlFor="companyRevenue">Umsatz (EUR)</Label>
                <Input id="companyRevenue" type="number" value={newCompanyData.revenueEur || ''} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, revenueEur: parseInt(e.target.value) || 0 })} placeholder="z.B. 100000000" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="companyAddress">Adresse</Label>
                <Input id="companyAddress" value={newCompanyData.address} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, address: e.target.value })} placeholder="Straße, PLZ, Stadt" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input id="companyWebsite" value={newCompanyData.website} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, website: e.target.value })} placeholder="https://www.beispiel.de" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="companyProducts">Produkte</Label>
                <Input id="companyProducts" value={newCompanyData.products} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, products: e.target.value })} placeholder="z.B. Software, Consulting" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="companyNotes">Notizen</Label>
                <Textarea id="companyNotes" value={newCompanyData.notes} onChange={(e: any) => setNewCompanyData({ ...newCompanyData, notes: e.target.value })} placeholder="Notizen zur Firma..." rows={2} className="resize-none" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setShowAddCompany(false); resetCompanyForm(); }}>Abbrechen</Button>
            <Button onClick={handleAddCompany} disabled={!newCompanyData.name || createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* ADD CONTACT DIALOG - Verbessert mit allen Feldern */}
      {/* ============================================================================ */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Neuen Kontakt hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactFirstName">Vorname *</Label>
                <Input id="contactFirstName" value={newContactData.firstName} onChange={(e: any) => setNewContactData({ ...newContactData, firstName: e.target.value })} placeholder="Vorname" />
              </div>
              <div>
                <Label htmlFor="contactLastName">Nachname *</Label>
                <Input id="contactLastName" value={newContactData.lastName} onChange={(e: any) => setNewContactData({ ...newContactData, lastName: e.target.value })} placeholder="Nachname" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contactJobTitle">Position</Label>
                <Input id="contactJobTitle" value={newContactData.jobTitle} onChange={(e: any) => setNewContactData({ ...newContactData, jobTitle: e.target.value })} placeholder="z.B. Geschäftsführer" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contactEmail">E-Mail</Label>
                <Input id="contactEmail" type="email" value={newContactData.email} onChange={(e: any) => setNewContactData({ ...newContactData, email: e.target.value })} placeholder="email@beispiel.de" />
              </div>
              <div>
                <Label htmlFor="contactPhone">Telefon</Label>
                <Input id="contactPhone" value={newContactData.phone} onChange={(e: any) => setNewContactData({ ...newContactData, phone: e.target.value })} placeholder="+49 123 456789" />
              </div>
              <div>
                <Label htmlFor="contactMobile">Mobil</Label>
                <Input id="contactMobile" value={newContactData.mobile} onChange={(e: any) => setNewContactData({ ...newContactData, mobile: e.target.value })} placeholder="+49 170 1234567" />
              </div>
              <div>
                <Label htmlFor="contactStatus">Status</Label>
                <select id="contactStatus" value={newContactData.contactStatus} onChange={(e: any) => setNewContactData({ ...newContactData, contactStatus: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="contactDecisionMaker" checked={newContactData.decisionMaker} onChange={(e: any) => setNewContactData({ ...newContactData, decisionMaker: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="contactDecisionMaker" className="cursor-pointer">Entscheidungsträger</Label>
              </div>
              <div className="col-span-2">
                <Label htmlFor="contactLinkedIn">LinkedIn URL</Label>
                <Input id="contactLinkedIn" value={newContactData.linkedinUrl} onChange={(e: any) => setNewContactData({ ...newContactData, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contactNotes">Notizen</Label>
                <Textarea id="contactNotes" value={newContactData.notes} onChange={(e: any) => setNewContactData({ ...newContactData, notes: e.target.value })} placeholder="Notizen zum Kontakt..." rows={2} className="resize-none" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setShowAddContact(false); resetContactForm(); }}>Abbrechen</Button>
            <Button onClick={handleAddContact} disabled={!newContactData.firstName || !newContactData.lastName || createContactMutation.isPending}>
              {createContactMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================================ */}
      {/* ADD DEAL DIALOG - Verbessert mit allen Feldern */}
      {/* ============================================================================ */}
      <Dialog open={showAddDeal} onOpenChange={setShowAddDeal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Neuen Deal hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="dealName">Deal-Name *</Label>
                <Input id="dealName" value={newDealData.name} onChange={(e: any) => setNewDealData({ ...newDealData, name: e.target.value })} placeholder="z.B. Enterprise License 2024" />
              </div>
              <div>
                <Label htmlFor="dealValue">Wert (EUR)</Label>
                <Input id="dealValue" type="number" value={newDealData.value || ''} onChange={(e: any) => setNewDealData({ ...newDealData, value: parseInt(e.target.value) || 0 })} placeholder="z.B. 50000" />
              </div>
              <div>
                <Label htmlFor="dealStage">Stage</Label>
                <select id="dealStage" value={newDealData.stage} onChange={(e: any) => setNewDealData({ ...newDealData, stage: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="Lead">Lead</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="dealDescription">Beschreibung</Label>
                <Textarea id="dealDescription" value={newDealData.description} onChange={(e: any) => setNewDealData({ ...newDealData, description: e.target.value })} placeholder="Beschreibung des Deals..." rows={3} className="resize-none" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setShowAddDeal(false); resetDealForm(); }}>Abbrechen</Button>
            <Button onClick={handleAddDeal} disabled={!newDealData.name || createDealMutation.isPending}>
              {createDealMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

