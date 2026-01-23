# FRIDAY CRM - Outlook Add-In Deployment (Outlook 2019/2024)

**Version:** 1.0  
**Datum:** 29.10.2025  
**Zielumgebung:** Outlook 2019 & Outlook 2024 (Desktop, kein Microsoft 365)

---

## 1. Wichtige Unterschiede zu Microsoft 365

### ❌ NICHT verfügbar in Outlook 2019/2024

- **Microsoft 365 Admin Center** (zentrale Verwaltung)
- **Automatische Verteilung** an alle User
- **AppSource Store** (öffentlicher Add-In-Store)

### ✅ VERFÜGBAR in Outlook 2019/2024

- **Office Add-Ins Platform** (gleiche Technologie)
- **Manifest-basierte Installation**
- **Netzwerkfreigabe-Installation** (zentral via IT)
- **Manuelle Installation** (pro User)

---

## 2. Deployment-Optionen

### Option A: Zentrale Installation via Netzwerkfreigabe (empfohlen)

**Vorteile:**
- ✅ Einmalige Konfiguration durch IT-Admin
- ✅ Add-In erscheint automatisch bei allen Usern
- ✅ Updates zentral verwaltet
- ✅ Keine User-Interaktion nötig

**Voraussetzungen:**
- Windows-Netzwerkfreigabe (z.B. `\\server\friday-addin\`)
- Admin-Rechte für Registry-Änderung (einmalig)
- Oder: Group Policy (GPO)

---

### Option B: Manuelle Installation (pro User)

**Vorteile:**
- ✅ Keine Admin-Rechte nötig
- ✅ User kann selbst installieren

**Nachteile:**
- ⚠️ Jeder User muss manuell installieren
- ⚠️ Updates manuell durchführen

---

## 3. Option A: Zentrale Installation (Schritt-für-Schritt)

### Schritt 1: Netzwerkfreigabe einrichten

**Auf Windows-Server (oder Hetzner mit Samba):**

```bash
# Ordner erstellen
mkdir -p /srv/samba/friday-addin

# Manifest hochladen
cp manifest.xml /srv/samba/friday-addin/

# Samba-Freigabe konfigurieren
nano /etc/samba/smb.conf
```

**Samba-Konfiguration:**

```ini
[friday-addin]
   path = /srv/samba/friday-addin
   browseable = yes
   read only = yes
   guest ok = yes
   create mask = 0644
   directory mask = 0755
```

**Samba neu starten:**

```bash
systemctl restart smbd
```

**Ergebnis:** Manifest erreichbar unter `\\hetzner-server\friday-addin\manifest.xml`

---

### Schritt 2: Registry-Eintrag erstellen (Admin)

**Auf jedem Client-PC (einmalig):**

**Für Outlook 2019:**

```reg
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Addins\FridayCRM]
"Manifest"="\\\\hetzner-server\\friday-addin\\manifest.xml"
```

**Für Outlook 2024:**

```reg
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Microsoft\Office\17.0\Outlook\Addins\FridayCRM]
"Manifest"="\\\\hetzner-server\\friday-addin\\manifest.xml"
```

**Registry-Datei erstellen:**

Speichere als `friday-addin-install.reg`:

```reg
Windows Registry Editor Version 5.00

; Outlook 2019
[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Addins\FridayCRM]
"Manifest"="\\\\hetzner-server\\friday-addin\\manifest.xml"

; Outlook 2024
[HKEY_CURRENT_USER\Software\Microsoft\Office\17.0\Outlook\Addins\FridayCRM]
"Manifest"="\\\\hetzner-server\\friday-addin\\manifest.xml"
```

**Installation:**

1. Datei auf Netzwerkfreigabe legen
2. User führt Doppelklick aus
3. "Ja" klicken bei Sicherheitswarnung
4. Outlook neu starten

**Ergebnis:** Add-In erscheint automatisch in Outlook!

---

### Schritt 3: Group Policy (GPO) - Optional

**Für zentrale Verteilung ohne User-Interaktion:**

**Auf Domain Controller:**

1. **Group Policy Management** öffnen
2. Neue GPO erstellen: "FRIDAY CRM Add-In"
3. **Computer Configuration → Preferences → Windows Settings → Registry**
4. Neuer Registry-Eintrag:
   - **Hive:** `HKEY_CURRENT_USER`
   - **Key Path:** `Software\Microsoft\Office\16.0\Outlook\Addins\FridayCRM`
   - **Value Name:** `Manifest`
   - **Value Type:** `REG_SZ`
   - **Value Data:** `\\hetzner-server\friday-addin\manifest.xml`
5. GPO auf OU anwenden (z.B. "Alle Mitarbeiter")
6. `gpupdate /force` auf Clients

**Ergebnis:** Add-In wird automatisch bei nächstem Login installiert!

---

## 4. Option B: Manuelle Installation (Schritt-für-Schritt)

### Schritt 1: Manifest herunterladen

**User lädt Datei herunter:**

```
https://friday-crm.yourdomain.com/outlook-addin/manifest.xml
```

**Speichern unter:** `C:\Users\<Username>\Documents\FRIDAY-Addin\manifest.xml`

---

### Schritt 2: In Outlook installieren

**Outlook 2019/2024:**

1. Outlook öffnen
2. **Datei → Optionen → Add-Ins**
3. Unten: **Verwalten:** "COM-Add-Ins" → **Los...**
4. **Hinzufügen...** klicken
5. **Durchsuchen...** → `manifest.xml` auswählen
6. **OK** klicken
7. Outlook neu starten

**Ergebnis:** Add-In erscheint in Outlook-Ribbon!

---

## 5. Manifest-Anpassungen für Outlook 2019/2024

### Wichtige Änderungen

**Manifest muss kompatibel sein:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  
  <Id>a1b2c3d4-e5f6-7890-abcd-ef1234567890</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>FRIDAY CRM</ProviderName>
  <DefaultLocale>de-DE</DefaultLocale>
  <DisplayName DefaultValue="FRIDAY CRM"/>
  <Description DefaultValue="CRM-Integration für Outlook"/>
  
  <!-- WICHTIG: Absolute URLs (HTTPS erforderlich!) -->
  <IconUrl DefaultValue="https://friday-crm.yourdomain.com/assets/icon-64.png"/>
  <HighResolutionIconUrl DefaultValue="https://friday-crm.yourdomain.com/assets/icon-128.png"/>
  
  <SupportUrl DefaultValue="https://friday-crm.yourdomain.com/support"/>
  
  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>
  
  <Requirements>
    <Sets>
      <!-- Outlook 2019 unterstützt Mailbox 1.1 - 1.8 -->
      <!-- Outlook 2024 unterstützt Mailbox 1.1 - 1.13 -->
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>
  
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <!-- HTTPS erforderlich! -->
        <SourceLocation DefaultValue="https://friday-crm.yourdomain.com/outlook-addin/taskpane.html"/>
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>
  
  <Permissions>ReadWriteMailbox</Permissions>
  
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit"/>
  </Rule>
  
</OfficeApp>
```

**Wichtig:**
- ✅ Alle URLs müssen **HTTPS** sein (kein HTTP!)
- ✅ `MinVersion="1.1"` für Kompatibilität mit Outlook 2019
- ✅ Keine Microsoft 365-spezifischen Features verwenden

---

## 6. SSL-Zertifikat (erforderlich!)

### Outlook 2019/2024 erfordert HTTPS

**Auf Hetzner-Server:**

```bash
# Let's Encrypt installieren (falls nicht vorhanden)
apt install certbot python3-certbot-nginx

# Zertifikat erstellen
certbot --nginx -d friday-crm.yourdomain.com

# Auto-Renewal aktivieren
systemctl enable certbot.timer
```

**Nginx-Konfiguration:**

```nginx
server {
    listen 443 ssl http2;
    server_name friday-crm.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/friday-crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/friday-crm.yourdomain.com/privkey.pem;

    # Outlook Add-In
    location /outlook-addin/ {
        root /var/www/friday-crm;
        index taskpane.html;
        
        # CORS für Outlook
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }

    # Manifest
    location /outlook-addin/manifest.xml {
        root /var/www/friday-crm;
        add_header Content-Type application/xml;
        add_header Access-Control-Allow-Origin *;
    }
}
```

**Nginx neu laden:**

```bash
nginx -t
systemctl reload nginx
```

---

## 7. Testing & Troubleshooting

### Add-In erscheint nicht in Outlook

**Checkliste:**

1. ✅ Outlook neu gestartet?
2. ✅ Registry-Eintrag korrekt?
   - Öffne `regedit`
   - Navigiere zu `HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Addins\FridayCRM`
   - Prüfe `Manifest` Wert
3. ✅ Manifest erreichbar?
   - Öffne `\\hetzner-server\friday-addin\manifest.xml` im Explorer
   - Oder: `https://friday-crm.yourdomain.com/outlook-addin/manifest.xml` im Browser
4. ✅ HTTPS-Zertifikat gültig?
   - Öffne `https://friday-crm.yourdomain.com` im Browser
   - Kein Zertifikatsfehler?

---

### Add-In lädt nicht (leere Sidebar)

**Checkliste:**

1. ✅ Browser-Konsole öffnen:
   - In Outlook: `Ctrl + Shift + I` (Developer Tools)
   - Prüfe Fehler in Konsole
2. ✅ CORS-Header korrekt?
   - Öffne Browser Developer Tools → Network Tab
   - Prüfe `Access-Control-Allow-Origin` Header
3. ✅ FRIDAY API erreichbar?
   - Teste: `https://friday-crm.yourdomain.com/api/trpc/contacts.search`

---

### Manifest-Validierung

**Online-Tool:**

https://www.officetoolvalidator.com/

**Hochladen:** `manifest.xml`

**Prüfen:**
- ✅ Keine Fehler
- ✅ Kompatibel mit Outlook 2019/2024

---

## 8. Update-Prozess

### Manifest-Update

**Wenn Manifest geändert wird:**

1. Neue `manifest.xml` auf Netzwerkfreigabe hochladen
2. User müssen Outlook neu starten
3. Add-In wird automatisch aktualisiert

**Keine User-Interaktion nötig!**

---

### Code-Update (taskpane.html, JS, CSS)

**Wenn Add-In-Code geändert wird:**

1. Neue Dateien auf Hetzner hochladen
2. User müssen nur **Add-In neu laden**:
   - Sidebar schließen
   - Sidebar wieder öffnen
3. Oder: Outlook neu starten

**Cache-Busting (empfohlen):**

```html
<script src="app.js?v=1.0.1"></script>
```

---

## 9. Zusammenfassung

### ✅ Empfohlene Deployment-Strategie

**Für kleine Teams (< 10 User):**
- **Manuelle Installation** (Option B)
- User installiert selbst via Outlook-Optionen

**Für größere Teams (> 10 User):**
- **Zentrale Installation via Netzwerkfreigabe** (Option A)
- IT-Admin erstellt Registry-Datei
- User führt einmalig Doppelklick aus

**Für Unternehmen mit Active Directory:**
- **Group Policy (GPO)**
- Automatische Installation bei Login
- Keine User-Interaktion

---

### 🔧 Technische Anforderungen

**Server (Hetzner):**
- ✅ HTTPS (Let's Encrypt)
- ✅ Nginx mit CORS-Headern
- ✅ Manifest + Add-In-Dateien öffentlich erreichbar

**Optional: Netzwerkfreigabe**
- ✅ Samba-Server (für Manifest-Hosting)
- ✅ Oder: Windows-Dateiserver

**Client (User-PCs):**
- ✅ Outlook 2019 oder 2024
- ✅ Windows 10/11
- ✅ Internetzugang (für HTTPS-Verbindung zu Hetzner)

---

### 📋 Nächste Schritte

1. **SSL-Zertifikat einrichten** (Let's Encrypt)
2. **Manifest erstellen** und auf Hetzner hochladen
3. **Testing:** Manuelle Installation auf 1 PC
4. **Rollout:** Registry-Datei an alle User verteilen

**Soll ich mit der Implementierung starten?**

