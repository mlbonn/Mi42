# FRIDAY CRM - User Credentials

**Server:** http://46.224.13.250:3000  
**Erstellt:** 28. Oktober 2025

---

## 👥 Test-User (Alle Rollen)

Alle User haben das gleiche Passwort: **`admin123`**

| Email | Name | Role | Passwort | Beschreibung |
|-------|------|------|----------|--------------|
| `manus@friday-crm.com` | Manus Admin | **admin** | `admin123` | Haupt-Admin für Tests |
| `superadmin@friday-crm.com` | Super Admin | **super_admin** | `admin123` | Voller Zugriff (inkl. Billing, API Keys) |
| `admin@friday-crm.com` | Admin User | **admin** | `admin123` | Admin ohne Billing-Zugriff |
| `staff@friday-crm.com` | Staff User | **staff** | `admin123` | Kann alle CRM-Daten sehen |
| `staffplus@friday-crm.com` | Staff Plus User | **staff_plus** | `admin123` | Sieht nur zugewiesene Entities |

---

## 🔐 Passwort-Hash

**Passwort:** `admin123`  
**SHA-256 Hash:** `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`

---

## 🎭 Rollen-Übersicht

### 1. **Super Admin** (`super_admin`)
- ✅ Voller Zugriff auf alle Funktionen
- ✅ User-Management
- ✅ Billing & API Keys
- ✅ Owner-Funktionen

### 2. **Admin** (`admin`)
- ✅ User-Management
- ✅ Alle CRM-Funktionen
- ❌ Kein Billing-Zugriff
- ❌ Keine Owner-API-Keys

### 3. **Staff** (`staff`)
- ✅ Alle CRM-Daten sehen (Corporations, Companies, Contacts, Deals)
- ❌ Kein User-Management
- ❌ Keine Admin-Funktionen

### 4. **Staff Plus** (`staff_plus`)
- ✅ Nur zugewiesene Entities sehen
- ✅ Deals erstellen für zugewiesene Entities
- ❌ Kein User-Management
- ❌ Keine Admin-Funktionen

---

## 🔧 Datenbank-Zugriff

**Host:** 46.224.13.250  
**Port:** 3306  
**Database:** friday_crm  
**Username:** bluser  
**Password:** 1Ev3eZcJ8bO0o69O

---

## 📝 Notizen

- Alle User wurden am 28.10.2025 erstellt
- Alte User mit deprecated Rollen wurden gelöscht
- Logout-Funktion wurde gefixt (redirect zu Login-Seite)
- Role ENUM wurde aktualisiert auf: `super_admin`, `admin`, `staff`, `staff_plus`

