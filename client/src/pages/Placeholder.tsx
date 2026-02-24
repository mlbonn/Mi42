/**
 * FRIDAY CRM - Placeholder Page
 * Für noch nicht implementierte Features
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PlaceholderProps {
  title: string;
  description: string;
  backLink?: string;
  backLabel?: string;
}

export default function Placeholder({ title, description, backLink = "/", backLabel = "← Zurück zum Dashboard" }: PlaceholderProps) {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-8">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>
        
        <div className="bg-gray-50 p-6 border-l-4 border-orange-600 text-left mb-8">
          <h3 className="font-bold mb-2">Status: In Entwicklung</h3>
          <p className="text-sm text-gray-700">
            Diese Funktion ist Teil des FRIDAY CRM Roadmaps und wird in den nächsten Entwicklungszyklen implementiert.
          </p>
        </div>

        <Link href={backLink}>
          <Button>{backLabel}</Button>
        </Link>
      </div>
    </div>
  );
}

// Specific placeholder pages
export function ScoutQueuePage() {
  return <Placeholder 
    title="Scout Job Queue" 
    description="Übersicht über alle Scout Agent Jobs (Pending, Processing, Completed, Failed)"
    backLink="/scout"
    backLabel="← Zurück zu Scout Dashboard"
  />;
}

export function ScoutMethodsPage() {
  return <Placeholder 
    title="Discovery Methods" 
    description="Konfiguration der Discovery-Methoden (Wettbewerber, Verbände, Sortiment, Kunden, Presse)"
    backLink="/scout"
    backLabel="← Zurück zu Scout Dashboard"
  />;
}

export function ScoutStatsPage() {
  return <Placeholder 
    title="Scout Statistiken" 
    description="Detaillierte Statistiken und Analytics für Scout Agent Performance"
    backLink="/scout"
    backLabel="← Zurück zu Scout Dashboard"
  />;
}

export function HunterDashboardPage() {
  return <Placeholder 
    title="Hunter Agent Dashboard" 
    description="Übersicht über Hunter Agent Aktivitäten (Kontaktsuche, E-Mail-Verifizierung, LinkedIn-Scraping)"
    backLink="/"
  />;
}

export function HunterTargetsPage() {
  return <Placeholder 
    title="Target Companies" 
    description="Liste aller Target-Unternehmen für Kontaktsuche"
    backLink="/hunter"
    backLabel="← Zurück zu Hunter Dashboard"
  />;
}

export function HunterContactsPage() {
  return <Placeholder 
    title="Gefundene Kontakte" 
    description="Alle von Hunter Agent gefundenen Ansprechpartner mit E-Mail-Adressen und LinkedIn-Profilen"
    backLink="/hunter"
    backLabel="← Zurück zu Hunter Dashboard"
  />;
}

export function HunterReviewPage() {
  return <Placeholder 
    title="Hunter Review Queue" 
    description="Review und Approval von gefundenen Kontakten"
    backLink="/hunter"
    backLabel="← Zurück zu Hunter Dashboard"
  />;
}

export function HunterSourcesPage() {
  return <Placeholder 
    title="Datenquellen" 
    description="Konfiguration von Datenquellen (Apollo.io, Hunter.io, LinkedIn Sales Navigator)"
    backLink="/hunter"
    backLabel="← Zurück zu Hunter Dashboard"
  />;
}

export function HunterStatsPage() {
  return <Placeholder 
    title="Hunter Statistiken" 
    description="Detaillierte Statistiken über Kontaktfindung und Verifizierung"
    backLink="/hunter"
    backLabel="← Zurück zu Hunter Dashboard"
  />;
}

export function OutreachDashboardPage() {
  return <Placeholder 
    title="Outreach Agent Dashboard" 
    description="Übersicht über E-Mail-Kampagnen, Drafts und Responses"
    backLink="/"
  />;
}

export function OutreachCampaignsPage() {
  return <Placeholder 
    title="Kampagnen" 
    description="Verwaltung von E-Mail-Kampagnen und Follow-Up-Sequenzen"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachDraftsPage() {
  return <Placeholder 
    title="E-Mail Drafts" 
    description="Von GPT-4 generierte E-Mail-Drafts zur manuellen Review"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachReviewPage() {
  return <Placeholder 
    title="Outreach Review Queue" 
    description="Review und Approval von E-Mail-Drafts vor dem Versand"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachSentPage() {
  return <Placeholder 
    title="Versendete E-Mails" 
    description="Historie aller versendeten E-Mails mit Open- und Click-Tracking"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachResponsesPage() {
  return <Placeholder 
    title="Antworten" 
    description="Eingehende E-Mail-Antworten und Lead-Qualifizierung"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachTemplatesPage() {
  return <Placeholder 
    title="Templates" 
    description="E-Mail-Templates für verschiedene Branchen und Use Cases"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function OutreachStatsPage() {
  return <Placeholder 
    title="Outreach Statistiken" 
    description="Detaillierte Statistiken über E-Mail-Performance (Open Rate, Response Rate, Conversion Rate)"
    backLink="/outreach"
    backLabel="← Zurück zu Outreach Dashboard"
  />;
}

export function AnalyticsFunnelPage() {
  return <Placeholder 
    title="Sales Funnel" 
    description="Visualisierung des gesamten Sales Funnels von Lead-Generierung bis Deal Close"
    backLink="/"
  />;
}

export function AnalyticsAgentsPage() {
  return <Placeholder 
    title="Agent Performance" 
    description="Vergleich der Performance aller AI Agents (Scout, Hunter, Outreach)"
    backLink="/"
  />;
}

export function AnalyticsROIPage() {
  return <Placeholder 
    title="ROI Analysis" 
    description="Return on Investment Analyse für FRIDAY CRM und AI Agents"
    backLink="/"
  />;
}

export function SettingsUsersPage() {
  return <Placeholder 
    title="Benutzer" 
    description="Verwaltung von Benutzern und Rollen (Admin, Sales Manager, External Sales, Partner)"
    backLink="/"
  />;
}

export function SettingsPartnersPage() {
  return <Placeholder 
    title="Partner" 
    description="Verwaltung von Partnern und Provisionsmodellen"
    backLink="/"
  />;
}

export function SettingsAPIPage() {
  return <Placeholder 
    title="API Keys" 
    description="Verwaltung von API Keys für externe Integrationen (Apollo.io, Hunter.io, OpenAI, etc.)"
    backLink="/"
  />;
}

export function SettingsIntegrationsPage() {
  return <Placeholder 
    title="Integrationen" 
    description="Konfiguration von Integrationen (Zapier, Make, n8n, Power BI, Excel Add-In)"
    backLink="/"
  />;
}

