# FRIDAY CRM Outlook Add-In - Installationsanleitung

## 📋 Voraussetzungen

- Outlook Desktop (Windows oder Mac)
- ODER Outlook Web App (Office 365)
- Administratorrechte (für Desktop-Installation)

---

## 🚀 Installation - Methode 1: Outlook Desktop (Windows/Mac)

### Schritt 1: Manifest-Datei herunterladen

1. Lade die Datei `manifest.xml` herunter
2. Speichere sie an einem sicheren Ort (z.B. `C:\OutlookAddIns\FRIDAY-CRM\manifest.xml`)

### Schritt 2: Add-In in Outlook installieren

#### **Windows:**

1. **Outlook öffnen**
2. **Datei** → **Optionen** → **Add-Ins**
3. Klicke auf **Add-Ins verwalten** (oder **Manage Add-ins**)
4. Klicke auf **Meine Add-Ins** (linke Seite)
5. Scrolle nach unten und klicke auf **+ Benutzerdefiniertes Add-In hinzufügen**
6. Wähle **Aus Datei hinzufügen...**
7. Navigiere zu deiner `manifest.xml` Datei
8. Klicke **Öffnen**
9. Bestätige die Warnung mit **Installieren**

#### **Mac:**

1. **Outlook öffnen**
2. **Tools** → **Add-Ins abrufen**
3. Klicke auf **Meine Add-Ins** (linke Seite)
4. Scrolle nach unten und klicke auf **+ Benutzerdefiniertes Add-In hinzufügen**
5. Wähle **Aus Datei hinzufügen...**
6. Navigiere zu deiner `manifest.xml` Datei
7. Klicke **Öffnen**
8. Bestätige die Installation

---

## 🌐 Installation - Methode 2: Outlook Web App (Office 365)

### Schritt 1: Manifest-Datei hochladen

1. Gehe zu https://outlook.office.com
2. Klicke auf **Einstellungen** (Zahnrad-Symbol oben rechts)
3. Klicke auf **Alle Outlook-Einstellungen anzeigen**
4. Navigiere zu **Allgemein** → **Add-Ins verwalten**
5. Klicke auf **+ Meine Add-Ins**
6. Scrolle nach unten und klicke auf **+ Benutzerdefiniertes Add-In hinzufügen**
7. Wähle **Aus Datei hinzufügen**
8. Lade die `manifest.xml` Datei hoch
9. Klicke **Installieren**

---

## 🔧 Installation - Methode 3: Netzwerkfreigabe (für Unternehmen)

### Schritt 1: Netzwerkfreigabe erstellen

1. Erstelle einen Netzwerkordner (z.B. `\\server\OutlookAddIns\`)
2. Kopiere die `manifest.xml` in diesen Ordner
3. Stelle sicher, dass alle Benutzer Lesezugriff haben

### Schritt 2: Outlook konfigurieren

1. **Outlook öffnen**
2. **Datei** → **Optionen** → **Sicherheitscenter** → **Einstellungen für das Sicherheitscenter**
3. Klicke auf **Vertrauenswürdige Add-In-Kataloge**
4. Gib die URL ein: `\\server\OutlookAddIns\`
5. Aktiviere **Im Menü anzeigen**
6. Klicke **OK**
7. Starte Outlook neu

---

## ✅ Add-In verwenden

### Schritt 1: Email öffnen

1. Öffne eine beliebige Email in Outlook
2. Du solltest jetzt einen neuen Button **"FRIDAY CRM"** im Ribbon sehen

### Schritt 2: Kontakt extrahieren

1. Klicke auf den **"Kontakt extrahieren"** Button
2. Das Add-In öffnet sich im Seitenbereich
3. Klicke auf **"🔍 Kontakt extrahieren"**
4. Das Add-In analysiert die Email-Signatur automatisch

### Schritt 3: In CRM speichern

1. Überprüfe die extrahierten Kontaktdaten
2. Klicke auf **"💾 In CRM speichern"**
3. Der Kontakt wird in FRIDAY CRM gespeichert

---

## 🐛 Troubleshooting

### Problem: Add-In erscheint nicht im Ribbon

**Lösung:**
1. Starte Outlook neu
2. Prüfe ob das Add-In in **Datei** → **Optionen** → **Add-Ins** aufgelistet ist
3. Stelle sicher, dass es **aktiviert** ist

### Problem: "Manifest kann nicht geladen werden"

**Lösung:**
1. Prüfe ob die `manifest.xml` Datei korrekt formatiert ist
2. Stelle sicher, dass die URLs in der Manifest-Datei erreichbar sind
3. Prüfe ob HTTPS korrekt konfiguriert ist

### Problem: SSL-Zertifikat-Fehler

**Lösung:**
1. Das selbst-signierte Zertifikat muss im Browser akzeptiert werden
2. Öffne https://46.224.13.250/ im Browser
3. Akzeptiere die Sicherheitswarnung
4. Starte Outlook neu

### Problem: Add-In lädt nicht

**Lösung:**
1. Prüfe die Internetverbindung
2. Stelle sicher, dass https://46.224.13.250/ erreichbar ist
3. Öffne die Browser-Konsole (F12) im Add-In und prüfe auf Fehler

---

## 📝 Hinweise

### HTTPS-Anforderung

- Outlook Add-Ins **müssen** über HTTPS geladen werden
- Das aktuelle Setup verwendet ein selbst-signiertes Zertifikat
- Für Produktiv-Umgebungen sollte ein gültiges SSL-Zertifikat verwendet werden

### Berechtigungen

Das Add-In benötigt folgende Berechtigungen:
- **ReadWriteMailbox**: Lesen und Schreiben von Email-Daten
- Wird benötigt um Email-Body und Absender-Informationen zu lesen

### Datenschutz

- Das Add-In sendet nur extrahierte Kontaktdaten an den FRIDAY CRM Server
- Keine vollständigen Emails werden übertragen
- Alle Daten bleiben auf deinem Server (46.224.13.250)

---

## 🔄 Deinstallation

### Desktop:

1. **Datei** → **Optionen** → **Add-Ins**
2. Wähle das **FRIDAY CRM** Add-In
3. Klicke auf **Entfernen**

### Web App:

1. **Einstellungen** → **Alle Outlook-Einstellungen anzeigen**
2. **Allgemein** → **Add-Ins verwalten**
3. Wähle das **FRIDAY CRM** Add-In
4. Klicke auf **Entfernen**

---

## 📞 Support

Bei Problemen oder Fragen:
- Prüfe die Server-Logs: `ssh manus02@46.224.13.250` → `tail -f ~/friday-crm/server.log`
- Prüfe die Browser-Konsole im Add-In (F12)
- Kontaktiere den Administrator

---

## 🎯 Nächste Schritte

Nach erfolgreicher Installation:
1. ✅ Teste das Add-In mit verschiedenen Emails
2. 🔧 Passe die Signatur-Erkennung an (falls nötig)
3. 📊 Prüfe die gespeicherten Kontakte in FRIDAY CRM
4. 🚀 Rolle das Add-In für alle Benutzer aus

