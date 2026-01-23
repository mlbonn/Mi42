# SmarterMail mit Outlook 2019/2024 verbinden (Exchange/EWS)

## ✅ Voraussetzungen

- Outlook 2019 oder 2024 (Desktop)
- SmarterMail-Zugangsdaten:
  - E-Mail-Adresse (z.B. agent32@bl2020.com)
  - Passwort
  - Server: mail.bl2020.com (oder deine SmarterMail-Domain)

---

## 📋 Schritt-für-Schritt-Anleitung

### 1. Outlook öffnen und Account hinzufügen

1. **Outlook öffnen**
2. **Datei** → **Konto hinzufügen**
3. **E-Mail-Adresse eingeben**: `agent32@bl2020.com`
4. **Weiter** klicken

---

### 2. **Exchange** auswählen

⚠️ **WICHTIG:** Outlook zeigt möglicherweise "Office 365" oder "Microsoft 365" an.

**Du MUSST "Exchange" auswählen!**

- Wenn ein Dialog "Erweiterte Einrichtung" erscheint:
  - **Exchange** auswählen (NICHT Office 365!)

![Exchange auswählen](https://portal.smartertools.com/AvatarHandler.ashx?kbattchid=36)

---

### 3. Server-Einstellungen (falls manuell erforderlich)

Falls Autodiscover nicht funktioniert, gib manuell ein:

**Server:** `mail.bl2020.com` (oder deine SmarterMail-Domain)

**Benutzername:** `agent32@bl2020.com` (vollständige E-Mail-Adresse)

**Passwort:** (dein SmarterMail-Passwort)

---

### 4. Zertifikat akzeptieren

- **Zertifikatswarnung** erscheint (falls self-signed SSL)
- **Ja** klicken, um Zertifikat zu akzeptieren

---

### 5. Anmeldedaten eingeben

- **Windows-Sicherheit-Dialog** erscheint
- **Passwort eingeben**
- ✅ **"Anmeldedaten speichern"** aktivieren

![Passwort eingeben](https://portal.smartertools.com/AvatarHandler.ashx?kbattchid=37)

---

### 6. Synchronisierungs-Einstellungen

- **Wie weit zurück synchronisieren?**
  - Standard: **1 Jahr**
  - Bei großen Postfächern (>5GB): **6 Monate**

![Sync-Einstellungen](https://portal.smartertools.com/AvatarHandler.ashx?kbattchid=39)

- **Weiter** klicken

---

### 7. Fertig!

- **"Konto erfolgreich hinzugefügt"** erscheint
- **Fertig** klicken

![Erfolgreich](https://portal.smartertools.com/AvatarHandler.ashx?kbattchid=38)

- Outlook startet und synchronisiert E-Mails, Kalender, Kontakte

---

## 🐛 Troubleshooting

### Problem 1: "Microsoft Office Login" statt "Windows-Sicherheit"

**Ursache:** Microsoft hat deine Domain in Office365-Cache gespeichert.

**Lösung:**
1. **X klicken** im Office365-Login-Fenster
2. Outlook versucht dann normale Autodiscover-Suche
3. Falls das nicht funktioniert: **Manuell einrichten** (siehe Schritt 3)

---

### Problem 2: "Verbindung fehlgeschlagen"

**Prüfe:**
- ✅ E-Mail-Adresse korrekt? (vollständige Adresse!)
- ✅ Passwort korrekt?
- ✅ Server erreichbar? (ping mail.bl2020.com)
- ✅ EWS aktiviert in SmarterMail? (Admin-Einstellung)

---

### Problem 3: "Autodiscover funktioniert nicht"

**Lösung: Manuell einrichten**

1. **Datei** → **Kontoeinstellungen** → **Kontoeinstellungen...**
2. **Neu...** → **Manuelle Konfiguration**
3. **Exchange** auswählen
4. Server: `mail.bl2020.com`
5. Benutzername: `agent32@bl2020.com`
6. Passwort eingeben

---

## 🔧 EWS-URL (falls benötigt)

Falls Outlook nach der **EWS-URL** fragt:

```
https://mail.bl2020.com/EWS/Exchange.asmx
```

(Ersetze `mail.bl2020.com` mit deiner SmarterMail-Domain)

---

## ✅ Nach erfolgreicher Einrichtung

**Jetzt kannst du das FRIDAY Add-In installieren!**

**Datei** → **Optionen** → **Add-Ins** → **Verwalten: COM-Add-Ins** → **Los...**

→ **Meine Add-Ins** → **Benutzerdefiniertes Add-In hinzufügen** → **Aus URL...**

**URL:** `https://46.224.13.250/outlook-addin/manifest.xml`

---

## 📞 Support

Falls Probleme auftreten:
- Prüfe SmarterMail Admin-Panel: **EWS aktiviert?**
- Prüfe Firewall: **Port 443 offen?**
- Prüfe SSL-Zertifikat: **Gültig?**

