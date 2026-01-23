/**
 * Seed Outreach Agent Data
 */

import { createCampaign, createEmailDraft } from "./outreachDb";

export async function seedOutreachData() {
  console.log("[SeedOutreach] Starting Outreach Agent seed...");

  // Campaign 1: German Market - Building Materials Suppliers
  const campaign1Id = await createCampaign({
    name: "Q1 2025 - DACH Market Outreach",
    description: "Target building materials suppliers in Germany, Austria, Switzerland",
    status: "active",
    targetSegment: "VP Sales, Market Research Manager",
    language: "de",
    createdBy: "admin",
    startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  // Campaign 2: French Market
  const campaign2Id = await createCampaign({
    name: "Q1 2025 - France Market Outreach",
    description: "Target French building materials corporations",
    status: "active",
    targetSegment: "C-Level, VP Sales",
    language: "fr",
    createdBy: "admin",
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });

  // Campaign 3: Nordic Market (Draft)
  const campaign3Id = await createCampaign({
    name: "Q2 2025 - Nordic Market Outreach",
    description: "Target building materials suppliers in Denmark, Sweden, Norway, Finland",
    status: "draft",
    targetSegment: "VP Sales, Director Market Intelligence",
    language: "en",
    createdBy: "admin",
  });

  console.log(`[SeedOutreach] Created 3 campaigns`);

  // ============================================================================
  // EMAIL DRAFTS - Campaign 1 (German)
  // ============================================================================

  await createEmailDraft({
    campaignId: campaign1Id,
    contactId: "contact-1",
    corporationId: "corp-1",
    subject: "Exklusive Einladung: Webinar zu Marktintelligenz für Knauf Group",
    body: `Sehr geehrte Frau Schmidt,

ich habe mit großem Interesse die jüngsten Erfolge der Knauf Group verfolgt, insbesondere die Expansion in osteuropäische Märkte.

Als Director Market Intelligence wissen Sie, wie wichtig fundierte Marktdaten für strategische Entscheidungen sind. Unser Global Building Monitor bietet Ihnen Zugang zu weltweiten Bauprojektdaten in Echtzeit – eine Ressource, die führende Unternehmen wie Ihre Wettbewerber bereits nutzen.

Ich möchte Sie zu einem exklusiven 30-minütigen Webinar einladen, in dem wir Ihnen zeigen:
• Wie Sie neue Absatzmärkte identifizieren
• Welche Wettbewerber in Ihren Zielmärkten aktiv sind
• Wie Sie Vertriebschancen frühzeitig erkennen

Hätten Sie nächste Woche Zeit für ein kurzes Gespräch?

Mit freundlichen Grüßen
Martin Langen
Global Building Monitor`,
    language: "de",
    personalizationData: {
      news: [
        {
          title: "Knauf Group announces expansion into Eastern European markets",
          snippet: "New production facilities in Poland and Czech Republic...",
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ],
      linkedinPosts: [],
    },
    reviewStatus: "pending",
  });

  await createEmailDraft({
    campaignId: campaign1Id,
    contactId: "contact-2",
    corporationId: "corp-1",
    subject: "Whitepaper: Digitale Transformation im Baustoffhandel",
    body: `Sehr geehrter Herr Müller,

die digitale Transformation verändert die Baubranche grundlegend. Als VP Sales bei Knauf Group stehen Sie vor der Herausforderung, neue Vertriebskanäle zu erschließen und gleichzeitig traditionelle Kundenbeziehungen zu pflegen.

Unser neues Whitepaper "Digitale Transformation im Baustoffhandel" analysiert:
• Wie führende Unternehmen Datenanalyse für Vertriebsoptimierung nutzen
• Best Practices für digitale Lead-Generierung
• ROI-Berechnungen für Marktintelligenz-Plattformen

Ich würde Ihnen das Whitepaper gerne zusenden und freue mich auf Ihr Feedback.

Beste Grüße
Martin Langen`,
    language: "de",
    personalizationData: {
      news: [],
      linkedinPosts: [
        {
          text: "Excited to announce our digital transformation initiative...",
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    reviewStatus: "approved",
  });

  // ============================================================================
  // EMAIL DRAFTS - Campaign 2 (French)
  // ============================================================================

  await createEmailDraft({
    campaignId: campaign2Id,
    contactId: "contact-3",
    corporationId: "corp-2",
    subject: "Invitation exclusive: Webinaire sur l'intelligence de marché pour Saint-Gobain",
    body: `Chère Madame Dubois,

J'ai suivi avec grand intérêt les récents succès de Saint-Gobain, notamment l'annonce des résultats du Q4 2024 avec une croissance de 12%.

En tant que VP Sales EMEA, vous savez combien des données de marché solides sont importantes pour les décisions stratégiques. Notre Global Building Monitor vous donne accès aux données de projets de construction en temps réel dans le monde entier – une ressource déjà utilisée par des entreprises leaders, y compris vos concurrents.

Je souhaite vous inviter à un webinaire exclusif de 30 minutes où nous vous montrerons:
• Comment identifier de nouveaux marchés de vente
• Quels concurrents sont actifs dans vos marchés cibles
• Comment repérer les opportunités de vente tôt

Auriez-vous du temps pour une brève conversation la semaine prochaine?

Cordialement
Martin Langen
Global Building Monitor`,
    language: "fr",
    personalizationData: {
      news: [
        {
          title: "Saint-Gobain announces Q4 2024 results with 12% growth",
          snippet: "Strong performance in European markets...",
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
      linkedinPosts: [],
    },
    reviewStatus: "pending",
  });

  await createEmailDraft({
    campaignId: campaign2Id,
    contactId: "contact-4",
    corporationId: "corp-2",
    subject: "Livre blanc: Transformation numérique dans l'industrie des matériaux de construction",
    body: `Cher Monsieur Martin,

La transformation numérique révolutionne l'industrie de la construction. En tant que Head of Market Research chez Saint-Gobain, vous comprenez l'importance des données pour anticiper les tendances du marché.

Notre nouveau livre blanc analyse:
• Comment les leaders du secteur utilisent l'analyse de données
• Meilleures pratiques pour la génération de leads numériques
• Calculs de ROI pour les plateformes d'intelligence de marché

Je serais ravi de vous envoyer ce livre blanc et d'échanger avec vous.

Cordialement
Martin Langen`,
    language: "fr",
    personalizationData: {
      news: [],
      linkedinPosts: [],
    },
    reviewStatus: "pending",
  });

  // ============================================================================
  // SENT EMAILS
  // ============================================================================

  await createEmailDraft({
    campaignId: campaign1Id,
    contactId: "contact-5",
    corporationId: "corp-3",
    subject: "Danke für Ihr Interesse - Global Building Monitor Demo",
    body: `Sehr geehrte Frau Weber,

vielen Dank für Ihr Interesse an unserem Global Building Monitor. Wie besprochen, sende ich Ihnen die Demo-Zugangsdaten.

Login: demo@gbm.com
Passwort: Demo2025!

Die Demo-Version enthält Daten aus 15 europäischen Ländern. Gerne zeige ich Ihnen in einem kurzen Call die wichtigsten Features.

Beste Grüße
Martin Langen`,
    language: "de",
    personalizationData: {},
    reviewStatus: "sent",
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    sentBy: "admin",
  });

  await createEmailDraft({
    campaignId: campaign2Id,
    contactId: "contact-6",
    corporationId: "corp-2",
    subject: "Merci pour votre intérêt - Démo Global Building Monitor",
    body: `Chère Madame Laurent,

Merci pour votre intérêt pour notre Global Building Monitor. Comme convenu, je vous envoie les identifiants de démonstration.

Login: demo@gbm.com
Mot de passe: Demo2025!

La version de démonstration contient des données de 15 pays européens. Je serais ravi de vous montrer les principales fonctionnalités lors d'un bref appel.

Cordialement
Martin Langen`,
    language: "fr",
    personalizationData: {},
    reviewStatus: "sent",
    sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    sentBy: "admin",
  });

  console.log(`[SeedOutreach] Created 6 email drafts (2 pending, 1 approved, 2 sent)`);
  console.log("[SeedOutreach] Outreach Agent seed completed");
}

// Run if called directly
seedOutreachData()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

