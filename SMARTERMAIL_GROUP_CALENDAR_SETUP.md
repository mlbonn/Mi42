# 📅 SmarterMail: Gruppen-Kalender erstellen & CalDAV URL finden

## Schritt-für-Schritt Anleitung

---

## **Option 1: Shared Calendar (Empfohlen für Teams)**

### **Schritt 1: Shared Calendar erstellen**

1. **Als Admin einloggen:**
   - Gehe zu: `https://mail.example.com`
   - Login mit Admin-Account

2. **Neuen User für Kalender erstellen:**
   - Klicke auf **"Manage"** (Domain-Verwaltung)
   - **"Users"** → **"New User"**
   - Username: z.B. `teamcalendar` oder `calendar`
   - Email: `teamcalendar@example.com`
   - Passwort setzen
   - **Speichern**

3. **Als Kalender-User einloggen:**
   - Logout vom Admin-Account
   - Login als `teamcalendar@example.com`

4. **Kalender freigeben:**
   - Gehe zu **"Calendar"** (Kalender-Ansicht)
   - **Rechtsklick** auf "Calendar" (Standard-Kalender)
   - Wähle **"Share Folder"**
   
   **Oder:**
   - Klicke auf das **Ordner-Icon** unten links
   - Wähle **"Share Folder"**

5. **Berechtigungen setzen:**
   - **"Add User"** klicken
   - User hinzufügen (z.B. `user1@example.com`, `user2@example.com`)
   - **Berechtigungen wählen:**
     - **"View"** = Nur lesen
     - **"Edit"** = Lesen + Bearbeiten
     - **"Manage"** = Volle Kontrolle (inkl. Sharing)
   - **"Save"** klicken

---

### **Schritt 2: CalDAV URL finden**

#### **Methode A: Über SmarterMail Webmail**

1. **Als Kalender-User einloggen** (`teamcalendar@example.com`)

2. **Gehe zu Settings:**
   - Klicke auf **"Settings"** (Zahnrad-Icon oben rechts)
   - Wähle **"Connectivity"**
   - Wähle **"CalDAV"**

3. **CalDAV URL kopieren:**
   ```
   https://mail.example.com/Calendars/teamcalendar@example.com/Calendar/
   ```

#### **Methode B: URL manuell konstruieren**

**Standard-Format:**
```
https://[SERVER]/Calendars/[EMAIL]/[CALENDAR-NAME]/
```

**Beispiele:**
```
https://mail.example.com/Calendars/teamcalendar@example.com/Calendar/
https://mail.example.com/Calendars/user@example.com/Work/
https://mail.example.com/Calendars/user@example.com/Personal/
```

**Komponenten:**
- `[SERVER]` = Deine SmarterMail Domain (z.B. `mail.example.com`)
- `[EMAIL]` = Email-Adresse des Kalender-Besitzers
- `[CALENDAR-NAME]` = Name des Kalenders (Standard: `Calendar`)

---

### **Schritt 3: CalDAV URL testen**

**Mit curl testen:**
```bash
curl -u "teamcalendar@example.com:password" \
  -X PROPFIND \
  -H "Depth: 1" \
  -H "Content-Type: application/xml" \
  https://mail.example.com/Calendars/teamcalendar@example.com/Calendar/
```

**Erwartete Antwort:**
```xml
<?xml version="1.0"?>
<multistatus xmlns="DAV:">
  <response>
    <href>/Calendars/teamcalendar@example.com/Calendar/</href>
    <propstat>
      <status>HTTP/1.1 200 OK</status>
      ...
    </propstat>
  </response>
</multistatus>
```

---

## **Option 2: Resource Calendar (für Meeting-Räume)**

### **Schritt 1: Resource erstellen**

1. **Als Domain-Admin:**
   - **"Manage"** → **"Resources"**
   - **"New Resource"** klicken

2. **Resource konfigurieren:**
   - Name: z.B. `Konferenzraum A`
   - Email: `raum-a@example.com`
   - Type: **"Room"**
   - **Speichern**

3. **CalDAV URL:**
   ```
   https://mail.example.com/Calendars/raum-a@example.com/Calendar/
   ```

---

## **Schritt 4: User zur Gruppe hinzufügen**

### **Variante A: Über Sharing (bereits oben erklärt)**

Siehe **Schritt 1, Punkt 5** - User einzeln hinzufügen

### **Variante B: Über Mailing List (für Benachrichtigungen)**

1. **Mailing List erstellen:**
   - **"Manage"** → **"Mailing Lists"**
   - **"New Mailing List"**
   - Name: `team@example.com`
   - Members: `user1@example.com`, `user2@example.com`, etc.

2. **Kalender-Einladungen an Liste senden:**
   - Events können an `team@example.com` gesendet werden
   - Alle Mitglieder bekommen Einladung

**Hinweis:** Mailing Lists sind NICHT das gleiche wie Shared Calendars!

---

## **📋 Zusammenfassung: Wichtige URLs**

### **CalDAV Server URL:**
```
https://mail.example.com
```

### **CalDAV Kalender URL (Team-Kalender):**
```
https://mail.example.com/Calendars/teamcalendar@example.com/Calendar/
```

### **CalDAV Principal URL (User Discovery):**
```
https://mail.example.com/Calendars/teamcalendar@example.com/
```

### **Authentifizierung:**
- **Username:** `teamcalendar@example.com` (volle Email-Adresse!)
- **Password:** Dein Passwort
- **Auth-Method:** Basic Auth

---

## **🔐 Berechtigungen im Detail**

| Berechtigung | Kann Events sehen | Kann Events erstellen | Kann Events bearbeiten | Kann Events löschen | Kann Sharing ändern |
|--------------|-------------------|----------------------|------------------------|---------------------|---------------------|
| **View** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Edit** | ✅ | ✅ | ✅ (eigene) | ✅ (eigene) | ❌ |
| **Manage** | ✅ | ✅ | ✅ (alle) | ✅ (alle) | ✅ |

---

## **🎯 Empfehlung für FRIDAY CRM**

### **Setup:**

1. **Kalender-User erstellen:**
   - Email: `friday-team@example.com`
   - Passwort: Sicheres Passwort

2. **Team-Mitglieder hinzufügen:**
   - Alle Sales-Mitarbeiter mit **"Edit"** Berechtigung
   - Manager mit **"Manage"** Berechtigung

3. **CalDAV URL für FRIDAY CRM:**
   ```
   https://mail.example.com/Calendars/friday-team@example.com/Calendar/
   ```

4. **Credentials in .env:**
   ```env
   CALDAV_SERVER_URL=https://mail.example.com
   CALDAV_USERNAME=friday-team@example.com
   CALDAV_PASSWORD=dein-sicheres-passwort
   ```

---

## **🐛 Troubleshooting**

### **Problem: CalDAV URL nicht gefunden (404)**

**Lösung:**
- Prüfe ob CalDAV aktiviert ist: **Settings** → **Connectivity** → **CalDAV** (muss "Enabled" sein)
- Prüfe URL-Format (muss `/Calendars/` enthalten, nicht `/Calendar/`)
- Prüfe ob Email-Adresse korrekt ist (inkl. Domain)

### **Problem: Authentifizierung fehlgeschlagen (401)**

**Lösung:**
- Verwende **volle Email-Adresse** als Username (nicht nur `teamcalendar`)
- Prüfe Passwort
- Prüfe ob User existiert

### **Problem: Shared Calendar nicht sichtbar**

**Lösung:**
- Prüfe Berechtigungen (muss mindestens "View" sein)
- User muss Sharing akzeptieren (Check Email-Posteingang)
- In Client: Shared Calendar muss manuell abonniert werden

---

## **📚 Weiterführende Links**

- **SmarterMail Sharing Docs:** https://help.smartertools.com/smartermail/current/topics/user/sharingoverview
- **CalDAV Setup:** https://help.smartertools.com/smartermail/current/topics/user/syncsmartermail
- **Video-Tutorial:** https://www.youtube.com/watch?v=a0potscox_g

---

**Fragen?** Gib mir deine SmarterMail Server-URL und ich helfe dir beim Setup!

