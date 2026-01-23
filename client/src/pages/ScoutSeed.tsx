/**
 * FRIDAY CRM - Scout Agent Seed Form
 * Manuelle Eingabe von Seed-Firmen
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ScoutSeed() {
  const [, setLocation] = useLocation();
  const [seedType, setSeedType] = useState<"manual" | "linkedin" | "press">("manual");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [pressUrl, setPressUrl] = useState("");

  const addToQueue = trpc.scout.addToQueue.useMutation({
    onSuccess: () => {
      toast.success("Seed-Firma zur Queue hinzugefügt");
      setLocation("/scout");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let seedData: any = {};
    
    if (seedType === "manual") {
      if (!name || !website) {
        toast.error("Name und Website sind erforderlich");
        return;
      }
      // Auto-add https:// if missing
      let normalizedWebsite = website.trim();
      if (!normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
        normalizedWebsite = 'https://' + normalizedWebsite;
      }
      seedData = { name, website: normalizedWebsite };
    } else if (seedType === "linkedin") {
      if (!linkedinUrl) {
        toast.error("LinkedIn-URL ist erforderlich");
        return;
      }
      seedData = { linkedinUrl };
    } else if (seedType === "press") {
      if (!pressUrl) {
        toast.error("Pressemeldung-URL ist erforderlich");
        return;
      }
      seedData = { pressUrl };
    }

    addToQueue.mutate({
      seedType,
      seedData,
      priority: 1, // High priority for manual seeds
      generation: 0,
    });
  };

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seed hinzufügen</h1>
        <p className="text-gray-600">
          Neue Firma manuell zur Scout Queue hinzufügen
        </p>
      </div>

      {/* Seed Type Selection */}
      <div className="mb-8 max-w-2xl">
        <label className="block text-sm font-bold mb-4">Seed-Typ</label>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setSeedType("manual")}
            className={`p-4 border ${
              seedType === "manual" ? "border-blue-600 bg-blue-50" : "border-gray-300"
            }`}
          >
            <div className="font-bold mb-2">✏️ Manuell</div>
            <div className="text-xs text-gray-600">Name + Website eingeben</div>
          </button>

          <button
            type="button"
            onClick={() => setSeedType("linkedin")}
            className={`p-4 border ${
              seedType === "linkedin" ? "border-blue-600 bg-blue-50" : "border-gray-300"
            }`}
          >
            <div className="font-bold mb-2">🔗 LinkedIn</div>
            <div className="text-xs text-gray-600">LinkedIn-Profil-URL</div>
          </button>

          <button
            type="button"
            onClick={() => setSeedType("press")}
            className={`p-4 border ${
              seedType === "press" ? "border-blue-600 bg-blue-50" : "border-gray-300"
            }`}
          >
            <div className="font-bold mb-2">📰 Presse</div>
            <div className="text-xs text-gray-600">Pressemeldung-URL</div>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {seedType === "manual" && (
          <>
            <div>
              <label className="block text-sm font-bold mb-2">Firmenname *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Knauf Gips KG"
                className="w-full p-3 border"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Website *</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.knauf.com oder https://www.knauf.com"
                className="w-full p-3 border"
                required
              />
              <p className="text-xs text-gray-600 mt-2">
                https:// wird automatisch hinzugefügt, falls nicht angegeben
              </p>
            </div>
          </>
        )}

        {seedType === "linkedin" && (
          <div>
            <label className="block text-sm font-bold mb-2">LinkedIn-Profil-URL *</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/company/knauf/"
              className="w-full p-3 border"
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              Scout Agent extrahiert Firmenname und Website automatisch
            </p>
          </div>
        )}

        {seedType === "press" && (
          <div>
            <label className="block text-sm font-bold mb-2">Pressemeldung-URL *</label>
            <input
              type="url"
              value={pressUrl}
              onChange={(e) => setPressUrl(e.target.value)}
              placeholder="https://www.construction-news.com/article/..."
              className="w-full p-3 border"
              required
            />
            <p className="text-xs text-gray-600 mt-2">
              Scout Agent analysiert Artikel und extrahiert Firmeninformationen
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 p-6 border-l-4 border-blue-600">
          <h3 className="font-bold mb-2">Was passiert nach dem Hinzufügen?</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Firma wird zur Scout Queue hinzugefügt (Generation 0 - Seed)</li>
            <li>Scout Worker analysiert Website und extrahiert Produkte, Märkte, Länder</li>
            <li>Wettbewerber-Suche in Top-15-Märkten startet</li>
            <li>Gefundene Wettbewerber landen in Review Queue</li>
            <li>Nach Approval werden Wettbewerber zu Seeds für Generation 1</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={addToQueue.isPending}
            className="flex-1"
          >
            {addToQueue.isPending ? "Wird hinzugefügt..." : "Zur Queue hinzufügen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/scout")}
          >
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  );
}

