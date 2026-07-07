import React from "react";

/**
 * Placeholder components for features not yet implemented
 */

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-6">
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">
            This section is not yet available.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ScoutStatsPage() {
  return (
    <PlaceholderPage
      title="Scout Statistics"
      description="Aggregated statistics for scout jobs, discovery methods, and found companies."
    />
  );
}

export function HunterSourcesPage() {
  return (
    <PlaceholderPage
      title="Hunter Data Sources"
      description="Configuration and status of data sources used by the Hunter Agent."
    />
  );
}

export function HunterStatsPage() {
  return (
    <PlaceholderPage
      title="Hunter Statistics"
      description="Aggregated statistics for hunter jobs and enrichment results."
    />
  );
}

export function OutreachStatsPage() {
  return (
    <PlaceholderPage
      title="Outreach Statistics"
      description="Aggregated statistics for outreach campaigns, sent emails, and responses."
    />
  );
}

export function AnalyticsFunnelPage() {
  return (
    <PlaceholderPage
      title="Funnel Analytics"
      description="Visual funnel from target companies to closed deals."
    />
  );
}

export function AnalyticsAgentsPage() {
  return (
    <PlaceholderPage
      title="Agent Analytics"
      description="Performance metrics for Scout, Hunter, and Outreach agents."
    />
  );
}

export function AnalyticsROIPage() {
  return (
    <PlaceholderPage
      title="ROI Analytics"
      description="Return on investment analysis for outreach campaigns."
    />
  );
}

export function SettingsPartnersPage() {
  return (
    <PlaceholderPage
      title="Partner Settings"
      description="Configuration for partner integrations and data sharing."
    />
  );
}

export function SettingsIntegrationsPage() {
  return (
    <PlaceholderPage
      title="Integrations"
      description="Third-party integrations and API connections."
    />
  );
}
