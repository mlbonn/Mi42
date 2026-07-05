# 📅 Kalender-Integration für FRIDAY CRM

## Zusammenfassung

Integration eines **Team-Kalenders** im Notion-Design mit Anbindung an **SmarterMail Exchange-Server** via **CalDAV** oder **EWS** (Exchange Web Services).

---

## 🎯 1. Wo im Menü?

### **Empfohlene Position:**

```
📊 Dashboard

📊 CRM
  - Konzerne
  - Firmen
  - Kontakte
  - Pipeline
  
📅 KALENDER  ← NEU
  - Team-Kalender
  - Meine Termine
  - Meeting-Planer

🔍 AGENTS
  ...
```

**Alternative:** Als Widget auf dem Dashboard (kleinerer Kalender)

---

## 🎨 2. Design-Vorschlag (Notion-Style)

### **Layout:**

```
┌─────────────────────────────────────────────────────┐
│  📅 Team-Kalender                    [Heute] [Woche] │
│                                      [Monat] [Agenda]│
├─────────────────────────────────────────────────────┤
│                                                       │
│  Oktober 2025                                         │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐        │
│  │ Mo  │ Di  │ Mi  │ Do  │ Fr  │ Sa  │ So  │        │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤        │
│  │  27 │  28 │  29 │  30 │  31 │   1 │   2 │        │
│  │     │ 🟦  │ 🟩  │     │     │     │     │        │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤        │
│  │   3 │   4 │   5 │   6 │   7 │   8 │   9 │        │
│  │     │     │ 🟥  │     │     │     │     │        │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘        │
│                                                       │
│  Heute (28. Oktober)                                  │
│  ┌─────────────────────────────────────────┐         │
│  │ 🟦 10:00 - 11:00  Team Meeting          │         │
│  │    📍 Konferenzraum A                    │         │
│  │    👥 5 Teilnehmer                       │         │
│  ├─────────────────────────────────────────┤         │
│  │ 🟩 14:00 - 15:30  Client Call           │         │
│  │    📍 Online (Zoom)                      │         │
│  │    👥 3 Teilnehmer                       │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│  [+ Neuer Termin]                                     │
└─────────────────────────────────────────────────────┘
```

### **Features:**

- ✅ **Monat/Woche/Tag/Agenda-Ansicht**
- ✅ **Farbcodierung** (Meeting-Typ, Teilnehmer, Priorität)
- ✅ **Drag & Drop** zum Verschieben
- ✅ **Quick-Add** für neue Termine
- ✅ **Teilnehmer-Avatare**
- ✅ **Erinnerungen & Notifications**
- ✅ **Sync-Status-Anzeige** (🔄 Syncing, ✅ Synced)

---

## 🔌 3. Technische Anbindung an SmarterMail

### **Option A: CalDAV (Empfohlen)**

**Vorteile:**
- ✅ Standard-Protokoll (RFC 4791)
- ✅ Einfacher als EWS
- ✅ Gut dokumentiert
- ✅ Funktioniert mit SmarterMail

**CalDAV URL-Format:**
```
https://mail.example.com/Calendars/<username>/Calendar/
```

**Authentifizierung:**
- Basic Auth (Username + Password)
- OAuth 2.0 (falls SmarterMail unterstützt)

**Beispiel-Request (Get Events):**
```xml
REPORT /Calendars/user@example.com/Calendar/ HTTP/1.1
Host: mail.example.com
Content-Type: application/xml; charset=utf-8
Depth: 1

<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop xmlns:D="DAV:">
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="20251001T000000Z" end="20251031T235959Z"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>
```

---

### **Option B: EWS (Exchange Web Services)**

**Vorteile:**
- ✅ Mehr Features (Verfügbarkeit, Raumbuchung, etc.)
- ✅ Bessere Integration mit Exchange

**Nachteile:**
- ❌ Komplexer
- ❌ SOAP-basiert (XML)

**EWS URL-Format:**
```
https://mail.example.com/EWS/Exchange.asmx
```

**Beispiel-Request (Get Events):**
```xml
POST /EWS/Exchange.asmx HTTP/1.1
Content-Type: text/xml; charset=utf-8
SOAPAction: "http://schemas.microsoft.com/exchange/services/2006/messages/FindItem"

<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
      <ItemShape>
        <BaseShape>IdOnly</BaseShape>
      </ItemShape>
      <CalendarView StartDate="2025-10-01T00:00:00" EndDate="2025-10-31T23:59:59"/>
      <ParentFolderIds>
        <DistinguishedFolderId Id="calendar"/>
      </ParentFolderIds>
    </FindItem>
  </soap:Body>
</soap:Envelope>
```

---

## 🛠️ 4. Implementierungs-Schritte

### **Phase 1: Backend (CalDAV Integration)**

1. **NPM-Paket installieren:**
   ```bash
   pnpm add tsdav dayjs ical.js
   ```

2. **CalDAV Client erstellen:**
   ```typescript
   // server/caldav.ts
   import { createDAVClient } from 'tsdav';
   
   export async function connectCalDAV() {
     const client = await createDAVClient({
       serverUrl: process.env.CALDAV_SERVER_URL!,
       credentials: {
         username: process.env.CALDAV_USERNAME!,
         password: process.env.CALDAV_PASSWORD!,
       },
       authMethod: 'Basic',
       defaultAccountType: 'caldav',
     });
     return client;
   }
   ```

3. **Kalender-Events abrufen:**
   ```typescript
   export async function getCalendarEvents(start: Date, end: Date) {
     const client = await connectCalDAV();
     const calendars = await client.fetchCalendars();
     const events = await client.fetchCalendarObjects({
       calendar: calendars[0],
       timeRange: {
         start: start.toISOString(),
         end: end.toISOString(),
       },
     });
     return events;
   }
   ```

4. **tRPC Router erstellen:**
   ```typescript
   // server/calendarRouter.ts
   export const calendarRouter = router({
     getEvents: publicProcedure
       .input(z.object({
         start: z.string(),
         end: z.string(),
       }))
       .query(async ({ input }) => {
         const events = await getCalendarEvents(
           new Date(input.start),
           new Date(input.end)
         );
         return events;
       }),
   });
   ```

---

### **Phase 2: Frontend (Notion-Style UI)**

1. **React Calendar Library:**
   ```bash
   pnpm add react-big-calendar date-fns
   ```

2. **Kalender-Komponente:**
   ```typescript
   // client/src/pages/TeamCalendar.tsx
   import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
   import { format, parse, startOfWeek, getDay } from 'date-fns';
   import { de } from 'date-fns/locale';
   
   const locales = { de };
   const localizer = dateFnsLocalizer({
     format,
     parse,
     startOfWeek,
     getDay,
     locales,
   });
   
   export default function TeamCalendar() {
     const { data: events } = trpc.calendar.getEvents.useQuery({
       start: startOfMonth(new Date()).toISOString(),
       end: endOfMonth(new Date()).toISOString(),
     });
     
     return (
       <div className="p-6">
         <h1 className="text-2xl font-bold mb-4">📅 Team-Kalender</h1>
         <Calendar
           localizer={localizer}
           events={events || []}
           startAccessor="start"
           endAccessor="end"
           style={{ height: 600 }}
           views={['month', 'week', 'day', 'agenda']}
         />
       </div>
     );
   }
   ```

---

### **Phase 3: Sync & Caching**

1. **Polling alle 5 Minuten:**
   ```typescript
   useQuery(['calendar-events'], fetchEvents, {
     refetchInterval: 5 * 60 * 1000, // 5 min
   });
   ```

2. **Webhook (falls SmarterMail unterstützt):**
   ```typescript
   // server/webhooks/calendar.ts
   app.post('/webhooks/calendar', async (req, res) => {
     const event = req.body;
     // Update cache
     await updateCalendarCache(event);
     res.sendStatus(200);
   });
   ```

---

## 📋 5. Benötigte Umgebungsvariablen

```env
# SmarterMail CalDAV
CALDAV_SERVER_URL=https://mail.example.com
CALDAV_USERNAME=teamcalendar@example.com
CALDAV_PASSWORD=your-password

# Optional: EWS
EWS_SERVER_URL=https://mail.example.com/EWS/Exchange.asmx
EWS_USERNAME=teamcalendar@example.com
EWS_PASSWORD=your-password
```

---

## 🔐 6. Sicherheit

- ✅ **Credentials in .env** (nicht im Code)
- ✅ **HTTPS** für CalDAV/EWS
- ✅ **Rate Limiting** (max 60 requests/min)
- ✅ **RBAC** (nur Admin+ kann Kalender-Settings ändern)
- ✅ **Read-Only für Staff** (nur Admin+ kann Termine erstellen/ändern)

---

## 📊 7. Zeitaufwand

| Phase | Aufgabe | Zeit |
|-------|---------|------|
| 1 | CalDAV Backend-Integration | 3-4h |
| 2 | Frontend Kalender-UI | 4-5h |
| 3 | Sync & Caching | 2-3h |
| 4 | Testing & Bugfixes | 2-3h |
| **Total** | | **11-15h** |

---

## 🎯 8. Empfehlung

**Start mit CalDAV** (einfacher, schneller) und später optional auf EWS upgraden falls mehr Features benötigt werden.

**Nächste Schritte:**
1. SmarterMail CalDAV URL + Credentials bereitstellen
2. Ich implementiere Backend-Integration
3. Frontend Kalender-UI bauen
4. Testing & Deployment

---

## 📚 9. Ressourcen

- **SmarterMail CalDAV Docs:** https://help.smartertools.com/smartermail/current/topics/user/syncsmartermail
- **tsdav Library:** https://github.com/natelindev/tsdav
- **React Big Calendar:** https://jquense.github.io/react-big-calendar/
- **CalDAV RFC:** https://datatracker.ietf.org/doc/html/rfc4791

---

**Fragen?** Soll ich mit der Implementierung starten?

