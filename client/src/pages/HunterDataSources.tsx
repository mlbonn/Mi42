/**
 * FRIDAY CRM - Hunter Data Sources
 * API configuration and status for contact discovery
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Zap
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  type: "apollo" | "hunter" | "linkedin";
  status: "active" | "inactive" | "error";
  apiKeyConfigured: boolean;
  lastSync: Date | null;
  creditsUsed: number;
  creditsTotal: number;
  contactsFound: number;
  emailsVerified: number;
  linkedinProfiles: number;
  errorMessage: string | null;
}

const DATA_SOURCE_INFO = {
  apollo: {
    name: "Apollo.io",
    description: "B2B contact database with 275M+ contacts and email enrichment",
    website: "https://www.apollo.io",
    icon: "🚀",
    features: ["Email Enrichment", "Job Titles", "Company Data", "LinkedIn URLs"],
  },
  hunter: {
    name: "Hunter.io",
    description: "Email finder and verification service",
    website: "https://hunter.io",
    icon: "🎯",
    features: ["Email Finder", "Email Verification", "Domain Search", "Author Finder"],
  },
  linkedin: {
    name: "LinkedIn Sales Navigator",
    description: "Professional network with 900M+ members",
    website: "https://www.linkedin.com/sales",
    icon: "💼",
    features: ["Advanced Search", "InMail", "Lead Recommendations", "CRM Integration"],
  },
};

export default function HunterDataSources() {
  const queryClient = useQueryClient();

  // Fetch data sources
  const { data: sources = [], isLoading } = useQuery<DataSource[]>({
    queryKey: ["/api/hunter/data-sources"],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await fetch(`/api/hunter/data-sources/${sourceId}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunter/data-sources"] });
    },
  });

  // Sync data mutation
  const syncDataMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await fetch(`/api/hunter/data-sources/${sourceId}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunter/data-sources"] });
    },
  });

  // Get status badge
  const getStatusBadge = (source: DataSource) => {
    if (!source.apiKeyConfigured) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Configured
        </Badge>
      );
    }

    if (source.status === "active") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }

    if (source.status === "error") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Inactive
        </Badge>
    );
  };

  // Get credits badge
  const getCreditsBadge = (source: DataSource) => {
    if (!source.apiKeyConfigured) return null;

    const percentage = (source.creditsUsed / source.creditsTotal) * 100;
    let variant: "default" | "secondary" | "destructive" = "default";
    
    if (percentage >= 90) variant = "destructive";
    else if (percentage >= 70) variant = "secondary";

    return (
      <Badge variant={variant} className="text-xs">
        {source.creditsUsed.toLocaleString()} / {source.creditsTotal.toLocaleString()} Credits
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
        <h1 className="text-2xl font-bold text-gray-900">Datenquellen</h1>
        <p className="text-sm text-gray-600">
          Konfiguration und Status der Contact Discovery APIs
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Wie funktionieren Datenquellen?</p>
              <p>
                Hunter Agent nutzt verschiedene APIs, um Kontakte zu finden und zu verifizieren.
                Jede Datenquelle hat eigene Stärken: <strong>Apollo</strong> für B2B-Kontakte,
                <strong>Hunter.io</strong> für Email-Verifizierung, <strong>LinkedIn</strong> für
                Professional Network.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <div className="grid gap-4">
        {Object.entries(DATA_SOURCE_INFO).map(([type, info]) => {
          const source = sources.find(s => s.type === type);

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{info.icon}</div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {info.name}
                        <a
                          href={info.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {info.description}
                      </CardDescription>
                    </div>
                  </div>
                  {source && getStatusBadge(source)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Features */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {info.features.map(feature => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Statistics */}
                  {source?.apiKeyConfigured && (
                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-xs text-gray-600">Contacts Found</div>
                        <div className="text-lg font-bold">{source.contactsFound.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Emails Verified</div>
                        <div className="text-lg font-bold">{source.emailsVerified.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">LinkedIn Profiles</div>
                        <div className="text-lg font-bold">{source.linkedinProfiles.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Credits</div>
                        <div className="mt-1">{getCreditsBadge(source)}</div>
                      </div>
                    </div>
                  )}

                  {/* Last Sync */}
                  {source?.lastSync && (
                    <div className="text-xs text-gray-500">
                      Last sync: {new Date(source.lastSync).toLocaleString("de-DE")}
                    </div>
                  )}

                  {/* Error Message */}
                  {source?.errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-700">{source.errorMessage}</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {source?.apiKeyConfigured ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(source.id)}
                          disabled={testConnectionMutation.isPending}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncDataMutation.mutate(source.id)}
                          disabled={syncDataMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Data
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        API Key not configured. Add <code className="px-1 py-0.5 bg-gray-100 rounded">
                          {type.toUpperCase()}_API_KEY
                        </code> to environment variables.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.href = "/hunter"}>
          Zurück zu Hunter Dashboard
        </Button>
      </div>
    </div>
  );
}

