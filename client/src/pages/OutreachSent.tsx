import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function OutreachSent() {
  const { data: sentEmails, isLoading } = trpc.outreach.getSentEmails.useQuery();
  const [filter, setFilter] = useState<"all" | "de" | "en" | "fr">("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-6">Lade...</div>;
  }

  const filteredEmails =
    sentEmails?.filter((email) => {
      if (filter === "all") return true;
      return email.language === filter;
    }) || [];

  return (
    <main className="p-6">
      {/* Filter */}
      <div className="bg-white p-4 mb-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div>
            <label className="text-sm font-medium mr-2">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border rounded"
            >
              <option value="all">Alle ({sentEmails?.length || 0})</option>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Gesamt versendet: {sentEmails?.length || 0} E-Mails
        </div>
      </div>

      {/* Sent Emails Table */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Versendet am</th>
                <th className="px-4 py-2 text-left">Betreff</th>
                <th className="px-4 py-2 text-left">Kontakt</th>
                <th className="px-4 py-2 text-left">Sprache</th>
                <th className="px-4 py-2 text-left">Versendet von</th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Noch keine E-Mails versendet
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email) => (
                  <>
                    <tr
                      key={email.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setExpandedEmail(expandedEmail === email.id ? null : email.id)
                      }
                    >
                      <td className="px-4 py-3">
                        {email.sentAt
                          ? new Date(email.sentAt).toLocaleString("de-DE")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">{email.subject}</td>
                      <td className="px-4 py-3">{email.contactId?.substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs uppercase">
                          {email.language}
                        </span>
                      </td>
                      <td className="px-4 py-3">{email.sentBy?.substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <button className="text-blue-600 hover:underline text-xs">
                          {expandedEmail === email.id ? "Einklappen" : "Anzeigen"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Email Content */}
                    {expandedEmail === email.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="bg-white p-4 rounded">
                            <div className="mb-3">
                              <div className="text-xs text-gray-500 mb-1">Betreff:</div>
                              <div className="font-semibold">{email.subject}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Nachricht:</div>
                              <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap font-mono">
                                {email.body}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <strong>Kampagne:</strong> {email.campaignId?.substring(0, 8)}...
                                </div>
                                <div>
                                  <strong>Kontakt:</strong> {email.contactId?.substring(0, 8)}...
                                </div>
                                <div>
                                  <strong>Konzern:</strong> {email.corporationId?.substring(0, 8)}
                                  ...
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 text-sm text-gray-600">
        <div className="font-semibold mb-2">Versendete E-Mails</div>
        <p className="mb-2">
          Übersicht aller versendeten E-Mails. Klicken Sie auf eine Zeile, um den vollständigen 
          E-Mail-Inhalt anzuzeigen.
        </p>
        <p>
          <strong>Tracking:</strong> In der Produktionsversion werden hier auch Öffnungsraten, 
          Klicks und Antworten angezeigt.
        </p>
      </div>
    </main>
  );
}

