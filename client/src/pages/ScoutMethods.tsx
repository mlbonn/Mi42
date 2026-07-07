/**
 * FRIDAY CRM - Scout Discovery Methods Page
 * Konfiguration der Discovery-Methoden mit LLM-Integration
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Building2, 
  Newspaper, 
  Users, 
  Package,
  Loader2, 
  Plus,
  Trash2,
  Settings2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wand2,
  Globe,
  Tag
} from "lucide-react";
import { toast } from "sonner";

// Icons für verschiedene Discovery-Methoden
const methodIcons: Record<string, React.ReactNode> = {
  "Competitor Search": <Search className="h-5 w-5" />,
  "Association Crawl": <Building2 className="h-5 w-5" />,
  "Product Catalog Comparison": <Package className="h-5 w-5" />,
  "Shared Customer Analysis": <Users className="h-5 w-5" />,
  "Press Monitoring": <Newspaper className="h-5 w-5" />,
};

// Beschreibungen für Discovery-Methoden
const methodDescriptions: Record<string, string> = {
  "Competitor Search": "Sucht nach Wettbewerbern über Google, LinkedIn und Crunchbase basierend auf Branche und Produkten.",
  "Association Crawl": "Durchsucht Branchenverbände und Fachorganisationen nach Mitgliedsunternehmen.",
  "Product Catalog Comparison": "Vergleicht Produktkataloge um Unternehmen mit ähnlichem Sortiment zu finden.",
  "Shared Customer Analysis": "Analysiert gemeinsame Kunden um potenzielle Wettbewerber zu identifizieren.",
  "Press Monitoring": "Überwacht Branchennachrichten auf Expansionen, Übernahmen und neue Marktteilnehmer.",
};

export default function ScoutMethods() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [keywordInput, setKeywordInput] = useState({
    companyName: "",
    industry: "",
    products: "",
  });
  const [generatedKeywords, setGeneratedKeywords] = useState<any>(null);
  const [associationInput, setAssociationInput] = useState({
    industry: "",
    country: "Deutschland",
  });
  const [suggestedAssociations, setSuggestedAssociations] = useState<any[]>([]);

  // Queries
  const { data: methods, isLoading, refetch } = trpc.scout.getDiscoveryMethods.useQuery();

  // Mutations
  const seedMethods = trpc.scout.seedDiscoveryMethods.useMutation({
    onSuccess: () => {
      toast.success("Discovery Methods initialisiert", { description: "Die Standard-Methoden wurden erstellt." });
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const updateMethod = trpc.scout.updateDiscoveryMethod.useMutation({
    onSuccess: () => {
      toast.success("Methode aktualisiert");
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const createMethod = trpc.scout.createDiscoveryMethod.useMutation({
    onSuccess: () => {
      toast.success("Methode erstellt");
      setIsAddDialogOpen(false);
      setNewMethodName("");
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const deleteMethod = trpc.scout.deleteDiscoveryMethod.useMutation({
    onSuccess: () => {
      toast.success("Methode gelöscht");
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler", { description: error.message });
    },
  });

  const generateKeywords = trpc.scout.generateKeywords.useMutation({
    onSuccess: (data) => {
      setGeneratedKeywords(data);
      toast.success("Keywords generiert", { description: "Die KI hat Suchbegriffe erstellt." });
    },
    onError: (error) => {
      toast.error("Fehler bei Keyword-Generierung", { description: error.message });
    },
  });

  const suggestAssociations = trpc.scout.suggestAssociations.useMutation({
    onSuccess: (data) => {
      setSuggestedAssociations(data);
      toast.success("Verbände vorgeschlagen", { description: `${data.length} Verbände gefunden.` });
    },
    onError: (error) => {
      toast.error("Fehler bei Verbandssuche", { description: error.message });
    },
  });

  const handleToggleMethod = (id: string, enabled: boolean) => {
    updateMethod.mutate({ id, enabled });
  };

  const handleUpdatePriority = (id: string, priority: number) => {
    updateMethod.mutate({ id, priority });
  };

  const handleGenerateKeywords = () => {
    if (!keywordInput.companyName) {
      toast.error("Bitte Firmennamen eingeben");
      return;
    }
    generateKeywords.mutate({
      companyName: keywordInput.companyName,
      industry: keywordInput.industry || undefined,
      products: keywordInput.products ? keywordInput.products.split(",").map(p => p.trim()) : undefined,
    });
  };

  const handleSuggestAssociations = () => {
    if (!associationInput.industry) {
      toast.error("Bitte Branche eingeben");
      return;
    }
    suggestAssociations.mutate({
      industry: associationInput.industry,
      country: associationInput.country,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discovery Methods</h1>
          <p className="text-muted-foreground">
            Konfiguration der Discovery-Methoden (Wettbewerber, Verbände, Sortiment, Kunden, Presse)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          {(!methods || methods.length === 0) && (
            <Button onClick={() => seedMethods.mutate()} disabled={seedMethods.isPending}>
              {seedMethods.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Standard-Methoden erstellen
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Methode
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Discovery-Methode</DialogTitle>
                <DialogDescription>
                  Erstellen Sie eine neue Methode zur Wettbewerbersuche.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="methodName">Name der Methode</Label>
                  <Input
                    id="methodName"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="z.B. LinkedIn Company Search"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={() => createMethod.mutate({ name: newMethodName })}
                  disabled={!newMethodName || createMethod.isPending}
                >
                  {createMethod.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="methods">
            <Settings2 className="h-4 w-4 mr-2" />
            Methoden
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Wand2 className="h-4 w-4 mr-2" />
            KI Keyword-Generator
          </TabsTrigger>
          <TabsTrigger value="associations">
            <Globe className="h-4 w-4 mr-2" />
            KI Verbandssuche
          </TabsTrigger>
        </TabsList>

        {/* Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : methods && methods.length > 0 ? (
            <div className="grid gap-4">
              {methods.map((method) => (
                <Card key={method.id} className={!method.enabled ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {methodIcons[method.name] || <Search className="h-5 w-5" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{method.name}</CardTitle>
                          <CardDescription>
                            {methodDescriptions[method.name] || "Benutzerdefinierte Discovery-Methode"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-gray-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {method.successCount || 0}
                          </Badge>
                          <Badge variant="outline" className="text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            {method.failureCount || 0}
                          </Badge>
                        </div>
                        <Switch
                          checked={method.enabled ?? true}
                          onCheckedChange={(checked) => handleToggleMethod(method.id, checked)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="config" className="border-none">
                        <AccordionTrigger className="py-2 text-sm">
                          Konfiguration anzeigen
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Priorität (1-10)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={method.priority || 5}
                                  onChange={(e) => handleUpdatePriority(method.id, parseInt(e.target.value))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Letzter Lauf</Label>
                                <Input
                                  value={method.lastRunAt ? new Date(method.lastRunAt).toLocaleString("de-DE") : "Noch nie"}
                                  disabled
                                />
                              </div>
                            </div>
                            {(method.config as any) && (
                              <div className="space-y-2">
                                <Label>Konfiguration (JSON)</Label>
                                <Textarea
                                  value={String(typeof (method.config as any) === "string" ? (method.config as string) : JSON.stringify((method.config as any) ?? {}, null, 2))}
                                  className="font-mono text-sm"
                                  rows={5}
                                  onChange={(e) => {
                                    try {
                                      const config = JSON.parse(e.target.value);
                                      updateMethod.mutate({ id: method.id, config });
                                    } catch {
                                      // Invalid JSON, ignore
                                    }
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex justify-end">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Methode löschen
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Methode löschen?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Möchten Sie die Methode "{method.name}" wirklich löschen?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMethod.mutate({ id: method.id })}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Löschen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Keine Discovery-Methoden konfiguriert</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Erstellen Sie Standard-Methoden oder fügen Sie eigene hinzu.
                </p>
                <Button onClick={() => seedMethods.mutate()} disabled={seedMethods.isPending}>
                  {seedMethods.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Standard-Methoden erstellen
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Keyword Generator Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                KI Keyword-Generator
              </CardTitle>
              <CardDescription>
                Lassen Sie die KI relevante Suchbegriffe für die Wettbewerbersuche generieren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Firmenname *</Label>
                  <Input
                    id="companyName"
                    value={keywordInput.companyName}
                    onChange={(e) => setKeywordInput({ ...keywordInput, companyName: e.target.value })}
                    placeholder="z.B. Bauder GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Branche</Label>
                  <Input
                    id="industry"
                    value={keywordInput.industry}
                    onChange={(e) => setKeywordInput({ ...keywordInput, industry: e.target.value })}
                    placeholder="z.B. Dachbaustoffe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="products">Produkte (kommagetrennt)</Label>
                  <Input
                    id="products"
                    value={keywordInput.products}
                    onChange={(e) => setKeywordInput({ ...keywordInput, products: e.target.value })}
                    placeholder="z.B. Bitumenbahnen, Dämmstoffe"
                  />
                </div>
              </div>
              <Button
                onClick={handleGenerateKeywords}
                disabled={generateKeywords.isPending || !keywordInput.companyName}
              >
                {generateKeywords.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Keywords generieren
              </Button>

              {generatedKeywords && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Generierte Keywords
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Suchbegriffe</Label>
                      <div className="flex flex-wrap gap-1">
                        {generatedKeywords.searchKeywords?.map((kw: string, i: number) => (
                          <Badge key={i} variant="secondary">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Branchenbegriffe</Label>
                      <div className="flex flex-wrap gap-1">
                        {generatedKeywords.industryTerms?.map((kw: string, i: number) => (
                          <Badge key={i} variant="outline">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Produktbegriffe</Label>
                      <div className="flex flex-wrap gap-1">
                        {generatedKeywords.productKeywords?.map((kw: string, i: number) => (
                          <Badge key={i} variant="outline">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Wettbewerbermuster</Label>
                      <div className="flex flex-wrap gap-1">
                        {generatedKeywords.competitorPatterns?.map((kw: string, i: number) => (
                          <Badge key={i} variant="outline">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">News-Keywords</Label>
                      <div className="flex flex-wrap gap-1">
                        {generatedKeywords.newsKeywords?.map((kw: string, i: number) => (
                          <Badge key={i} className="bg-gray-100 text-gray-800">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Association Finder Tab */}
        <TabsContent value="associations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                KI Verbandssuche
              </CardTitle>
              <CardDescription>
                Lassen Sie die KI relevante Branchenverbände für die Mitgliedersuche vorschlagen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assocIndustry">Branche *</Label>
                  <Input
                    id="assocIndustry"
                    value={associationInput.industry}
                    onChange={(e) => setAssociationInput({ ...associationInput, industry: e.target.value })}
                    placeholder="z.B. Dachbaustoffe, Bauchemie"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assocCountry">Land</Label>
                  <Input
                    id="assocCountry"
                    value={associationInput.country}
                    onChange={(e) => setAssociationInput({ ...associationInput, country: e.target.value })}
                    placeholder="z.B. Deutschland"
                  />
                </div>
              </div>
              <Button
                onClick={handleSuggestAssociations}
                disabled={suggestAssociations.isPending || !associationInput.industry}
              >
                {suggestAssociations.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Verbände suchen
              </Button>

              {suggestedAssociations.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Vorgeschlagene Verbände ({suggestedAssociations.length})
                  </h4>
                  <div className="grid gap-3">
                    {suggestedAssociations.map((assoc, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{assoc.name}</span>
                              <Badge
                                variant={
                                  assoc.relevance === "high"
                                    ? "default"
                                    : assoc.relevance === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {assoc.relevance === "high" ? "Hoch" : assoc.relevance === "medium" ? "Mittel" : "Niedrig"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{assoc.reason}</p>
                            {assoc.url && (
                              <a
                                href={assoc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#E48F00] hover:underline"
                              >
                                {assoc.url}
                              </a>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Hinzufügen
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
