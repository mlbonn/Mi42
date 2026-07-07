/**
 * FRIDAY CRM - Scout Discovery Methods Configuration
 * Enable/disable and configure discovery methods
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  Package, 
  UserCheck, 
  Newspaper,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

interface DiscoveryMethod {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  description: string;
  icon: any;
  config: any;
  lastRunAt: Date | null;
  successCount: number;
  failureCount: number;
}

const METHOD_CONFIGS = [
  {
    name: "competitors",
    label: "Wettbewerber-Analyse",
    description: "Findet Wettbewerber basierend auf Produkten, Märkten und Industrie",
    icon: Users,
  },
  {
    name: "associations",
    label: "Verbände & Organisationen",
    description: "Durchsucht Branchenverbände und Mitgliederlisten",
    icon: Building2,
  },
  {
    name: "product_range",
    label: "Sortiment-Analyse",
    description: "Findet Unternehmen mit ähnlichem Produktportfolio",
    icon: Package,
  },
  {
    name: "customers",
    label: "Kunden-Netzwerk",
    description: "Analysiert Kundenlisten und Referenzen",
    icon: UserCheck,
  },
  {
    name: "press",
    label: "Presse & News",
    description: "Durchsucht Pressemitteilungen und Branchen-News",
    icon: Newspaper,
  },
];

export default function ScoutDiscoveryMethods() {
  const queryClient = useQueryClient();

  // Fetch methods
  const { data: methods = [], isLoading } = useQuery<DiscoveryMethod[]>({
    queryKey: ["/api/scout/discovery-methods"],
  });

  // Update method mutation
  const updateMethodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DiscoveryMethod> }) => {
      const res = await fetch(`/api/scout/discovery-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout/discovery-methods"] });
    },
  });

  // Get method by name
  const getMethod = (name: string) => {
    return methods.find((m: DiscoveryMethod) => m.name === name);
  };

  // Toggle enabled
  const toggleEnabled = (id: string, enabled: boolean) => {
    updateMethodMutation.mutate({ id, data: { enabled } });
  };

  // Update priority
  const updatePriority = (id: string, priority: number) => {
    updateMethodMutation.mutate({ id, data: { priority } });
  };

  // Get status badge
  const getStatusBadge = (method: DiscoveryMethod | undefined) => {
    if (!method) return null;
    
    if (!method.enabled) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Deaktiviert
        </Badge>
      );
    }

    const total = method.successCount + method.failureCount;
    if (total === 0) {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Nicht getestet
        </Badge>
      );
    }

    const successRate = (method.successCount / total) * 100;
    if (successRate >= 80) {
      return (
        <Badge variant="default" className="gap-1 bg-[#E48F00]">
          <CheckCircle className="h-3 w-3" />
          Aktiv ({successRate.toFixed(0)}% Erfolg)
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Aktiv ({successRate.toFixed(0)}% Erfolg)
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-6 bg-gray-50 min-h-screen">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discovery Methods</h1>
        <p className="text-sm text-gray-600">
          Konfigurieren Sie die Discovery-Methoden für den Scout Agent
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#E48F00] mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Wie funktionieren Discovery Methods?</p>
              <p>
                Jede Methode durchsucht verschiedene Quellen, um neue Unternehmen zu finden.
                Die <strong>Priorität</strong> bestimmt die Reihenfolge (1 = höchste Priorität).
                Deaktivierte Methoden werden übersprungen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methods Grid */}
      <div className="grid gap-4">
        {METHOD_CONFIGS.map((config) => {
          const method = getMethod(config.name);
          const Icon = config.icon;

          return (
            <Card key={config.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Icon className="h-5 w-5 text-[#E48F00]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      <CardDescription className="mt-1">
                        {config.description}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(method)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${config.name}-enabled`} className="text-sm font-medium">
                      Aktiviert
                    </Label>
                    <Switch
                      id={`${config.name}-enabled`}
                      checked={method?.enabled ?? false}
                      onCheckedChange={(checked) => {
                        if (method) toggleEnabled(method.id, checked);
                      }}
                      disabled={!method}
                    />
                  </div>

                  {/* Priority Slider */}
                  {method?.enabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Priorität
                        </Label>
                        <span className="text-sm text-gray-600">
                          {method.priority} / 10
                        </span>
                      </div>
                      <Slider
                        value={[method.priority]}
                        onValueChange={([value]) => updatePriority(method.id, value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        1 = Niedrigste Priorität, 10 = Höchste Priorität
                      </p>
                    </div>
                  )}

                  {/* Statistics */}
                  {method && (method.successCount > 0 || method.failureCount > 0) && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Erfolge</div>
                          <div className="font-medium text-gray-700">
                            {method.successCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Fehler</div>
                          <div className="font-medium text-gray-600">
                            {method.failureCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Letzter Lauf</div>
                          <div className="font-medium">
                            {method.lastRunAt
                              ? new Date(method.lastRunAt).toLocaleDateString("de-DE")
                              : "Nie"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.href = "/scout"}>
          Zurück zu Scout Dashboard
        </Button>
      </div>
    </div>
  );
}

