/**
 * FRIDAY CRM - Dokumentation
 * OnePager für IT und User über Prozesse und Hintergrundprozesse
 */

export default function Docs() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">FRIDAY CRM Dokumentation</h1>
      <p className="text-gray-600 mb-8">
        Technische Dokumentation für IT und User über Prozesse, Hintergrundprozesse und Datenstruktur
      </p>

      {/* Phase 1: Scout Agent Database */}
      <section className="mb-12 border-l-4 border-orange-600 pl-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-bl2020-orange text-white px-3 py-1 text-sm font-bold">PHASE 1</span>
          <span className="text-sm text-gray-600">Implementiert: {new Date().toLocaleDateString('de-DE')}</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Scout Agent - Datenbank-Struktur</h2>
        
        <div className="bg-gray-50 p-6 mb-6">
          <h3 className="font-bold mb-2">Was wurde implementiert?</h3>
          <p className="text-sm mb-4">
            Die Datenbank wurde um Scout Agent Funktionalität erweitert. Der Scout Agent ist ein 
            autonomer Prozess, der kontinuierlich neue Zielunternehmen (Target Companies) identifiziert 
            und zur Review-Liste hinzufügt.
          </p>
          
          <h4 className="font-semibold mb-2">Neue Datenbank-Tabellen:</h4>
          <ul className="list-disc list-inside text-sm space-y-2 mb-4">
            <li>
              <strong>scout_queue</strong> - Job-Queue für Scout Agent
              <ul className="list-circle list-inside ml-6 mt-1 text-gray-700">
                <li>Verwaltet alle zu scoutenden Firmen</li>
                <li>Priority-basierte Verarbeitung (1=höchste, 10=niedrigste Priorität)</li>
                <li>Tracking von Generation (Wettbewerber-Baum)</li>
                <li>Status: Pending → Processing → Completed/Failed</li>
              </ul>
            </li>
            <li>
              <strong>scout_discovery_methods</strong> - Konfiguration der Discovery-Methoden
              <ul className="list-circle list-inside ml-6 mt-1 text-gray-700">
                <li>5 Methoden: Competitor Search, Association Crawl, Product Catalog, Shared Customer, Press Monitoring</li>
                <li>Einzeln aktivierbar/deaktivierbar</li>
                <li>Success/Failure Tracking</li>
              </ul>
            </li>
          </ul>

          <h4 className="font-semibold mb-2">Erweiterte Tabelle: corporations</h4>
          <p className="text-sm mb-2">13 neue Felder für Scout Agent:</p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4 text-gray-700">
            <li><code className="bg-gray-200 px-1">products</code> - Hauptprodukte der Firma</li>
            <li><code className="bg-gray-200 px-1">targetMarkets</code> - Zielmärkte/Branchen</li>
            <li><code className="bg-gray-200 px-1">countries</code> - Länder mit Präsenz</li>
            <li><code className="bg-gray-200 px-1">referenceCustomers</code> - Referenzkunden</li>
            <li><code className="bg-gray-200 px-1">employeeCount</code> - Mitarbeiteranzahl</li>
            <li><code className="bg-gray-200 px-1">international</code> - International tätig?</li>
            <li><code className="bg-gray-200 px-1">profileAnalyzedAt</code> - Wann wurde Website analysiert?</li>
            <li><code className="bg-gray-200 px-1">scoutStatus</code> - Not Analyzed, Analyzing, Analyzed, Error</li>
            <li><code className="bg-gray-200 px-1">scoutGeneration</code> - Wettbewerber-Generation (0-5)</li>
            <li><code className="bg-gray-200 px-1">scoutParentId</code> - Von welcher Firma entdeckt?</li>
            <li><code className="bg-gray-200 px-1">discoveryMethod</code> - Wie wurde Firma entdeckt?</li>
            <li><code className="bg-gray-200 px-1">discoveredAt</code> - Wann entdeckt?</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-6 mb-6">
          <h3 className="font-bold mb-2">🔄 Hintergrundprozess: Kontinuierlicher Scout</h3>
          <p className="text-sm mb-4">
            Der Scout Agent läuft kontinuierlich im Hintergrund und arbeitet die Queue ab. 
            Es gibt zwei Modi:
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 border">
              <h4 className="font-semibold mb-2">Modus A: Seed Mode</h4>
              <p className="text-sm text-gray-700 mb-2">Manuell getriggert:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Manuelle Eingabe (Name, Website)</li>
                <li>CSV-Import</li>
                <li>LinkedIn-Profil-URL</li>
                <li>Pressemeldung-URL</li>
                <li>Verbandswebsite</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 border">
              <h4 className="font-semibold mb-2">Modus B: Expansion Mode</h4>
              <p className="text-sm text-gray-700 mb-2">Automatisch:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Wettbewerber von Wettbewerbern (rekursiv)</li>
                <li>Verbandswebsites (Mitgliederlisten)</li>
                <li>Sortimentsvergleich</li>
                <li>Kundenvergleich</li>
                <li>Pressemeldungen</li>
              </ul>
            </div>
          </div>

          <h4 className="font-semibold mb-2">Generationen-Baum:</h4>
          <pre className="bg-white p-4 text-xs overflow-x-auto border">
{`Generation 0 (Seed):
  └─ Knauf (Manual Import)
       │
       ├─ Generation 1 (Direct Competitors):
       │    ├─ USG Corporation (US)
       │    ├─ Yoshino Gypsum (JP)
       │    └─ Gyproc (UK)
       │         │
       │         └─ Generation 2 (Competitors of Competitors):
       │              ├─ British Gypsum (UK)
       │              ├─ Lafarge (FR)
       │              └─ Etex Group (BE)
       │                   │
       │                   └─ Generation 3...`}
          </pre>
        </div>

        <div className="bg-yellow-50 p-6 mb-6">
          <h3 className="font-bold mb-2">⚙️ Wie funktioniert der Scout Agent?</h3>
          <ol className="list-decimal list-inside text-sm space-y-3">
            <li>
              <strong>Job aus Queue holen</strong>
              <p className="ml-6 text-gray-700">Scout Worker holt nächsten Job (sortiert nach Priority, Generation, Scheduled Time)</p>
            </li>
            <li>
              <strong>Website analysieren</strong>
              <p className="ml-6 text-gray-700">Playwright crawlt Website, GPT-4 extrahiert Produkte, Märkte, Länder, Mitarbeiteranzahl</p>
            </li>
            <li>
              <strong>Wettbewerber suchen</strong>
              <p className="ml-6 text-gray-700">Für jeden Top-15-Markt: Google Search, LinkedIn, Crunchbase nach ähnlichen Firmen</p>
            </li>
            <li>
              <strong>Similarity Score berechnen</strong>
              <p className="ml-6 text-gray-700">Algorithmus vergleicht Produkte (40%), Märkte (25%), Geo (20%), Größe (15%)</p>
            </li>
            <li>
              <strong>Filtering</strong>
              <p className="ml-6 text-gray-700">Nur Firmen mit &gt;€100M Umsatz, international tätig, Similarity &gt;60</p>
            </li>
            <li>
              <strong>Als Suggestion speichern</strong>
              <p className="ml-6 text-gray-700">Wettbewerber landen in Review-Liste (Status: Pending)</p>
            </li>
            <li>
              <strong>Manuelle Review</strong>
              <p className="ml-6 text-gray-700">User approved/rejected Vorschläge im Frontend</p>
            </li>
            <li>
              <strong>Bei Approval: Nächste Generation</strong>
              <p className="ml-6 text-gray-700">Approved Firma wird zu Seed für Generation N+1, zurück zu Schritt 1</p>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 p-6">
          <h3 className="font-bold mb-2">📊 Erwartete Ergebnisse</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Generation</th>
                <th className="text-right py-2">Neue Firmen</th>
                <th className="text-right py-2">Kumulativ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">0 (Seed)</td>
                <td className="text-right">100</td>
                <td className="text-right font-bold">100</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">1 (Direct Competitors)</td>
                <td className="text-right">700</td>
                <td className="text-right font-bold">800</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">2 (Indirect)</td>
                <td className="text-right">3.430</td>
                <td className="text-right font-bold">4.230</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">3+</td>
                <td className="text-right">10.000+</td>
                <td className="text-right font-bold">14.230+</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-700 mt-4">
            <strong>Nach 6 Monaten:</strong> 10.000+ Target-Unternehmen weltweit in Datenbank
          </p>
        </div>
      </section>

      {/* Weitere Phasen werden hier hinzugefügt */}
      <section className="mb-12 border-l-4 border-gray-300 pl-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-gray-300 text-gray-700 px-3 py-1 text-sm font-bold">PHASE 2</span>
          <span className="text-sm text-gray-600">In Entwicklung</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Scout Agent - Backend APIs</h2>
        <p className="text-sm text-gray-600">
          tRPC Router mit Endpoints für Queue-Management, Seed-Hinzufügen, Statistics, etc.
        </p>
      </section>

      <section className="mb-12 border-l-4 border-gray-300 pl-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-gray-300 text-gray-700 px-3 py-1 text-sm font-bold">PHASE 3</span>
          <span className="text-sm text-gray-600">Geplant</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Scout Agent - Worker Service</h2>
        <p className="text-sm text-gray-600">
          Kontinuierlicher Background-Worker der Queue abarbeitet (Playwright, GPT-4, Discovery Methods)
        </p>
      </section>

      <section className="mb-12 border-l-4 border-gray-300 pl-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-gray-300 text-gray-700 px-3 py-1 text-sm font-bold">PHASE 4</span>
          <span className="text-sm text-gray-600">Geplant</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Scout Agent - Frontend UI</h2>
        <p className="text-sm text-gray-600">
          Dashboard, Review-Queue, Seed-Form, Statistics, Generation-Tree-Visualisierung
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t text-sm text-gray-600">
        <p>
          <strong>FRIDAY CRM</strong> - Fully Responsive Intelligence Driving Autonomous Yield
        </p>
        <p className="mt-2">
          Entwickelt für Global Building Monitor | Version: Phase 1 (Database) | 
          Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
        </p>
      </footer>
    </div>
  );
}

