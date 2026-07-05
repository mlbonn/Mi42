# FRIDAY CRM TODO

## Critical Bugs
- [x] Remove all borders globally in @layer base CSS (set border: 0)
- [ ] Sidebar logo border still visible on Company detail page (fix didn't work)
- [ ] Header search bar border still visible on Company detail page
- [ ] Bearbeiten button not working on Company detail page (laptop + mobile)
- [ ] Bearbeiten button not working on Corporation detail page (mobile only)

## UI Polish
- [x] Remove border line between header and body content
- [x] Remove border line under FRIDAY CRM logo in sidebar (fixed with !important)
- [x] Redesign Companies list page to Notion-style (light gray bg, compact table, checkboxes, icons, pills)
- [x] Complete Companies table Notion-style rewrite (checkboxes, icons, compact rows, smaller fonts, pill tags)

## Completed Features
- [x] Corporation edit dialog implementation
- [x] Multi-company contact assignment
- [x] Contacts page
- [x] Corporation dropdown shows names instead of IDs
- [x] Database duplicate cleanup
- [x] Company edit functionality
- [x] Background worker daemon for Scout Queue



## Next UI Redesign Tasks
- [x] Apply Notion-style to Corporations list page
- [x] Apply Notion-style to Contacts list page
- [ ] Apply Notion-style to Corporation detail page
- [ ] Apply Notion-style to Company detail page
- [ ] Apply Notion-style to Contact detail page
- [ ] Apply Notion-style to Dashboard page
- [ ] Apply Notion-style to Deals pipeline page

## Technical Debt
- [ ] Fix Scout Worker MySQL permissions for Hetzner deployment
- [ ] Fix contact creation duplicates (React Strict Mode or mutation timing)
- [x] Fix TypeScript errors: All 47 errors reduced to 0 (RBAC implementation complete)
- [x] Fix old role references (external_sales → staff_plus, sales_manager → admin)
- [x] Fix getUserById/getUserByEmail return types (array vs single object)
- [x] Fix scoutWorkerCompanyFirst.ts corporation creation (missing fields)



## Urgent UI Fixes
- [x] Remove all remaining visible borders (sidebar logo, header search bar, input fields, buttons, table borders)
- [x] Apply global border: 0 to all elements



## Backup & Deployment
- [x] Create full project backup and store on Hetzner server (67MB in ~/backups/)



## Quick Wins (Option A - 3h)
- [x] Dashboard Redesign: Notion-Style Stats Cards & Recent Activities Table
- [ ] Deals Pipeline Notion-Style: Kanban-Board mit Checkboxes & Drag-Drop
- [ ] Mobile Button Fix: Touch Event Handler für Edit-Buttons (iPhone)
- [x] TypeScript Errors Fix: Settings.tsx index signature & seedUsersAndData.ts createdBy
- [ ] Contact Duplicate Fix: Debouncing für Create-Mutation



## Scout Agent - Phase 1: Worker Deployment
- [x] Configure MySQL remote access for Hetzner server
- [x] Start Scout Worker Daemon on Hetzner (port 3003) - needs rebuild
- [ ] Verify worker polling and logs
- [ ] Test job processing with dummy job



## Scout Agent - Phase 2: AI Integration Fixes
- [x] Fix JSON Parser: Remove Markdown backticks from GPT-4 response
- [x] Add User-Agent header to website scraping
- [x] Test with Bauder (www.bauder.de) as seed



## Scout Agent - Phase 3: Competitor Discovery
- [x] Implement GPT-4 Competitor Discovery with filters (Manufacturers only, >100M revenue or >500 employees)
- [x] Create Corporation suggestions with scoutStatus="Pending"
- [x] Test Bauder → Find competitors (e.g., Sika, BMI Group, Soprema) - ISO country code fix needed
- [x] Verify suggestions appear in Review Queue - 5 competitors created successfully



## Scout Agent - Settings UI
- [x] Create Scout Agent Settings page/section
- [x] Add filter controls: Minimum Revenue (EUR), Minimum Employees
- [x] Add company type filter (Manufacturer, Distributor, Service Provider, etc.)
- [x] Add target markets/countries multi-select (Top-15 + custom)
- [x] Store settings in database (new table: scout_settings)
- [x] Load settings in Scout Worker and apply to GPT-4 prompts
- [ ] Test with different filter combinations



## Scout Review Queue (2h)
- [x] Connect Scout Review Queue UI to backend API
- [x] Implement Approve/Reject buttons with API calls
- [x] Update Corporation scoutStatus (Pending → Approved/Rejected)
- [x] Add filter by status (Pending, Approved, Rejected)
- [x] Add sorting by date, generation, priority
- [x] Show corporation details (industries, products, markets, employees, revenue)
- [x] Auto-queue approved corporations to Hunter Queue

## Hunter Agent Implementation (4-6h)
- [ ] Create hunter_queue table in database
- [ ] Create Hunter Router with tRPC API endpoints
- [x] Implement Apollo.io API integration for contact search - implementing now
- [ ] Create Hunter Worker (processHunterJob function)
- [ ] GPT-4 Contact Enrichment (title, role, responsibilities)
- [ ] Create Hunter Worker Daemon (polling every 30s)
- [ ] Store contacts with hunterStatus="Pending"
- [ ] Deploy Hunter Worker on Hetzner




## Contact Type Feature (Roadmap)
- [ ] Add contactType field to contacts table (enum: Partner, Supplier, Customer, Staff, Staff+)
- [ ] Add contactType to Contact detail page (dropdown selector)
- [ ] Add contactType to Contact creation dialog
- [ ] Implement inheritance logic: Contact → Company → Corporation (bottom-up)
- [ ] Add contactType filter to Contacts list page
- [ ] Add contactType badge/pill to Contact cards
- [ ] Update database schema with migration
- [ ] Add contactType to Company detail (inherited from contacts)
- [ ] Add contactType to Corporation detail (inherited from companies)

## Scout Worker Bug Fix (CRITICAL) - FIXED ✅
- [x] Fix Scout Worker DB insert bug: Drizzle using `default` for NULL values
- [x] Change companies.corporationId to nullable in schema
- [x] Fix scoutWorkerCompanyFirst.ts: Use undefined instead of null for optional fields
- [x] Fix getAllCorporations function: Added new function without userId parameter
- [x] Fix createCorporation: Return created corporation object instead of insert result
- [x] Clear tsx cache: Delete node_modules/.tsx and node_modules/.cache
- [x] Test with Bauder seed company: Successfully created 5 companies (Sika AG, Knauf Gips KG, Rockwool International A/S, Carlisle Companies Inc., GAF Materials Corporation)
- [x] Verify companies in database: All 5 companies created with correct corporationId links
- [x] Verify auto-grouped corporations: 4 new corporations created (Sika, Rockwool, Carlisle, Standard Industries) with status=Approved, method=auto_grouped




## Menu Redesign (Apollo.io Style)
- [x] Implement collapsible menu sections with expand/collapse icons
- [x] CRM section: Default expanded (Konzerne, Firmen, Kontakte, Pipeline)
- [x] Scout Agent section: Default collapsed
- [x] Hunter Agent section: Default collapsed
- [x] Outreach Agent section: Default collapsed
- [x] Analytics section: Default collapsed
- [x] Settings section: Default collapsed
- [x] Scout Seed page: Fix body alignment (left-aligned like other pages, form max-width 2xl)




## User Management & Role-Based Access Control (RBAC)
- [x] Database schema: Add role field to users table (super_admin, admin, staff, staff_plus)
- [x] Database schema: Create user_assignments table (for Staff+ entity assignments)
- [x] Middleware: Implement requireRole(['super_admin', 'admin']) helper
- [x] Middleware: Implement requireStaffOrHigher() helper
- [x] Middleware: Implement checkEntityAccess(userId, entityType, entityId) for Staff+
- [x] Backend: Update all routers with role-based access checks
- [x] Backend: Implement assignment API (assign contacts/companies to Staff+)
- [x] Frontend: User Management page (only Super Admin & Admin)
- [x] Frontend: Create/Edit user dialog with role selector
- [x] Frontend: Assign entities to Staff+ (button on Contact/Company detail pages)
- [x] Frontend: Filter sidebar menu items based on user role
- [ ] Frontend: Hide/show features based on permissions (API Keys, Agent Config, etc.)
- [ ] Frontend: Staff+ view - only show assigned entities
- [ ] Test: Super Admin can do everything
- [ ] Test: Admin cannot access billing/owner API keys
- [ ] Test: Staff can see all CRM data but not manage users
- [ ] Test: Staff+ can only see assigned entities and create deals

### Role Permissions Matrix:
**Super Admin:** Full access (users, billing, API keys, agents, CRM, analytics)
**Admin:** User management (except Super Admin), team API keys, agents, CRM, analytics
**Staff:** CRM full access, own+team deals, outreach, analytics (own+team)
**Staff+:** Assigned entities only, create deals, cold calls, LinkedIn research, no analytics

### Staff+ Workflow:
1. Gets assigned contacts/companies by Staff/Admin
2. Performs cold calls / LinkedIn research
3. Qualifies leads
4. Creates deals for assigned entities
5. Manages own deals




## Sprint 1: Outreach Agent vervollständigen (6-8h)
- [x] Outreach Templates Page: CRUD für E-Mail-Vorlagen (Name, Subject, Body, Variables)
- [x] Outreach Drafts Page: Draft-Management vor dem Versand (Edit, Preview, Schedule)
- [x] Outreach Responses Page: Tracking von Antworten auf Outreach-Nachrichten
- [x] Backend: Templates Router mit CRUD endpoints
- [x] Backend: Drafts Router mit CRUD endpoints
- [x] Backend: Responses Router mit list/update endpoints
- [x] Database: email_templates and email_responses tables created




## Deployment Test Results (Hetzner Live Server)
- [x] Code deployed to server (tarball extracted)
- [x] Dependencies installed
- [x] Database tables created (email_templates, email_responses)
- [x] Server restarted successfully
- [ ] Login issue: Admin password mismatch on live server
- [ ] Need to test Outreach features after login fix




## Login System Debugging
- [ ] Investigate why login fails on Hetzner server
- [ ] Check getUserByEmail function behavior
- [ ] Verify password hash comparison logic
- [ ] Test database connection and queries
- [ ] Fix authentication system




## User Management & Logout Fix
- [x] Delete old users with deprecated roles (external_sales, partner, sales_manager)
- [x] Create new test users for all roles (super_admin, admin, staff, staff_plus)
- [x] Fix logout functionality (user cannot logout)
- [x] Update role ENUM in database to support new roles
- [x] Document all user credentials in USER_CREDENTIALS.md




## Hunter Agent - Found Contacts Page
- [x] Build Hunter Found Contacts page (/hunter/found-contacts)
- [x] Display all contacts found by Hunter Agent
- [x] Filter by status (all, pending, approved, rejected)
- [x] Show contact details (name, email, phone, company, source, title, seniority, department)
- [x] Actions: Approve, Reject, Add to CRM
- [x] Backend: hunterResultsRouter with CRUD endpoints
- [x] Database: hunterResults table functions in db.ts
- [x] Stats dashboard (Total, Pending, Approved, Rejected)




## Calendar Integration (Hybrid CalDAV)
- [x] Install dependencies (tsdav, react-big-calendar, date-fns, ical.js)
- [x] Create CalDAV client library (server/caldav.ts)
- [x] Implement calendar router with tRPC endpoints
- [x] Build frontend Calendar page with React Big Calendar
- [x] Add calendar route to App.tsx
- [x] Add calendar menu item to Sidebar (CRM section)
- [x] Implement event aggregation (team + 10 individual calendars)
- [x] Add color-coding per calendar (10 colors + black for team)
- [x] Implement calendar filter dialog (show/hide calendars)
- [x] Implement create event dialog
- [x] Implement edit event dialog
- [x] Implement delete event functionality
- [x] Fix TypeScript errors in caldav.ts
- [x] Create comprehensive documentation (CALENDAR_SETUP.md)
- [ ] Configure environment variables (CALDAV_SERVER_URL, CALDAV_TEAM_USER, etc.)
- [ ] Test CalDAV connection with SmarterMail server
- [ ] Test event creation and sync with Outlook/Apple Calendar
- [ ] Test event editing and bidirectional sync
- [ ] Test event deletion
- [ ] Test calendar filters
- [ ] Deploy to Hetzner production server
- [ ] Verify production deployment works

### Environment Variables Required:
```
CALDAV_SERVER_URL=https://mail.yourdomain.com/caldav
CALDAV_TEAM_USER=team@yourdomain.com
CALDAV_TEAM_PASSWORD=SecurePassword123
CALDAV_USERS=user1@yourdomain.com,user2@yourdomain.com,...,user10@yourdomain.com
CALDAV_USER_PASSWORD=SharedPassword123
```

### Features Implemented:
- Hybrid approach: 1 team calendar + 10 individual calendars
- Aggregated view with all events in one calendar
- Color-coding per person (10 colors + black for team)
- Filter to show/hide specific calendars
- Full CRUD operations (create, read, update, delete)
- Bidirectional sync with SmarterMail CalDAV
- German localization (de-DE)
- Month/Week/Day/Agenda views
- Event details (title, description, location, attendees)

### Technical Stack:
- **Backend:** tsdav (CalDAV client), ical.js (iCalendar parsing)
- **Frontend:** react-big-calendar (calendar UI), date-fns (date utilities)
- **Protocol:** CalDAV (RFC 4791)
- **Server:** SmarterMail email server




## Deployment Tasks
- [ ] Deploy calendar integration to Hetzner production server
- [ ] Copy built files to server
- [ ] Install new dependencies (tsdav, react-big-calendar, date-fns, ical.js)
- [ ] Restart PM2 process
- [ ] Verify calendar page loads correctly
- [ ] Test calendar functionality on production



## Calendar Configuration Updates
- [x] Make team calendar optional (only show if credentials exist)
- [x] Support 11+ user calendars (scalable to 20)
- [x] Extend color palette to 11 colors
- [x] Fix CalDAV server URL: https://176.0.1.191/caldav
- [ ] Configure environment variables on Hetzner
- [ ] Test CalDAV connection with agent32@bl2020.com
- [ ] Deploy to Hetzner production server



## CalDAV/WebDAV URL Fix
- [ ] Update CalDAV client to use SmarterMail WebDAV URL structure
- [ ] Change from /caldav to /webdav/principals/bl2020.com/[username]/
- [ ] Test with agent32@bl2020.com
- [ ] Update environment variables with correct URL pattern



## Calendar Integration Bugs
- [ ] Calendar filter list is empty (no calendars shown)
- [ ] Events not displayed even though CalDAV connection works
- [ ] Check if tRPC calendar router is properly registered
- [ ] Check if environment variables are loaded in production
- [ ] Verify getCalendars endpoint returns data



## Calendar Scaling (50 Users)
- [ ] Update calendarRouter to support 50 users
- [ ] Use single color for all users (simplify)
- [ ] Add user prefix to event titles (e.g., "RH: Meeting")
- [ ] Update color palette or remove it
- [ ] Test with multiple users
- [ ] Update documentation for 50 users



## Team View Feature
- [x] Add "Team" option to calendar filter list
- [x] When "Team" is selected, show all events from all users
- [x] Keep user prefixes for overlap visibility
- [x] Make "Team" combinable with individual user filters
- [ ] Test team view with multiple users



## CalDAV User Integration (Database-based)
- [x] Extend users table schema with caldavEmail and caldavPassword fields
- [x] Add encryption for caldavPassword storage
- [x] Create user settings page for CalDAV credentials (Frontend)
- [ ] Create admin interface for bulk CalDAV setup (Frontend) - TODO
- [x] Update calendarRouter to read from database instead of env
- [x] Migrate from env-based to DB-based calendar loading
- [ ] Test with multiple users

## Advanced Calendar Features
- [ ] Recurring events (daily, weekly, monthly)
- [ ] Event reminders/notifications
- [ ] Drag & drop to reschedule events
- [ ] Week view improvements
- [ ] Day view improvements
- [ ] Calendar export (iCal format)
- [ ] Event search functionality
- [ ] Color coding by event type



## Bugs
- [x] Login issue: User "Manus" cannot login after CalDAV migration (Fixed: DB columns added)



## Calendar Setup Instructions (UI)
- [x] Add help text/instructions below calendar view for users



## Deployment Issues
- [x] Client files not updating on Hetzner server (Fixed: cleaned and redeployed)



## Calendar Filter Bug
- [ ] agent32 not appearing in calendar filter after saving CalDAV credentials



## Unified User Management (FRIDAY = SmarterMail)
- [ ] Remove separate CalDAV settings dialog (Frontend - TODO)
- [x] Use FRIDAY user email as CalDAV email automatically
- [x] Use FRIDAY user password for CalDAV automatically (stored as hash|encrypted)
- [x] Auto-enable CalDAV when user is created
- [ ] Simplify user creation/edit form (Frontend - TODO)
- [x] Update calendar to use FRIDAY user credentials directly



## User Management Bugs
- [ ] User creation form missing password field



## UI Updates
- [x] Replace FRIDAY logo with new SVG logo



## Monochrome Design (Apollo/Notion Style)
- [x] Remove all colored icons in Sidebar (make monochrome gray)
- [x] Update calendar colors to monochrome
- [x] Remove blue accents from UI elements
- [x] Keep only logo colored
- [x] Apply Apollo/Notion minimalist style




## Outlook Add-In Integration

### Phase 1: Basis-Add-In (2-3 Wochen)
- [ ] Projekt-Setup (outlook-addin Ordner)
- [ ] Manifest.xml erstellen (Outlook 2019/2024 kompatibel)
- [ ] React + TypeScript Setup (Webpack)
- [ ] Task Pane UI (Sidebar Layout)
- [ ] FRIDAY API Client (tRPC Integration)
- [ ] Kontakt-Anzeige (automatisch beim E-Mail öffnen)
- [ ] E-Mail-Historie anzeigen
- [ ] HTTPS Deployment auf Hetzner
- [ ] SSL-Zertifikat (Let's Encrypt)
- [ ] Testing auf lokalem Outlook 2019/2024

### Phase 2: Signatur-Parser (1 Woche)
- [ ] Signatur-Parser implementieren (signatureParser.ts)
- [ ] E-Mail-Body parsen (Name, Telefon, Position, Firma)
- [ ] "Kontakt aus Signatur erstellen" Dialog
- [ ] Firma-Suche und Auto-Zuordnung
- [ ] Testing mit verschiedenen Signatur-Formaten

### Phase 3: Manuelle Archivierung (1 Woche)
- [ ] Archivierungs-Dialog (ArchiveDialog.tsx)
- [ ] Kontakt/Firma-Suche (mit Debouncing)
- [ ] E-Mail + Anhänge in FRIDAY speichern
- [ ] S3-Upload für Anhänge
- [ ] Erfolgsmeldungen in Outlook
- [ ] Testing mit verschiedenen E-Mail-Typen

### Phase 4: Notizen & Feinschliff (1 Woche)
- [ ] Notizen hinzufügen (ohne FRIDAY zu öffnen)
- [ ] Termin aus E-Mail erstellen
- [ ] Performance-Optimierung (Caching)
- [ ] Fehlerbehandlung & Logging
- [ ] User-Testing mit 2-3 Kollegen
- [ ] Installations-Anleitung erstellen
- [ ] Rollout an alle User

### Deployment
- [ ] Manifest auf Hetzner hochladen
- [ ] Add-In-Dateien auf Hetzner deployen
- [ ] Nginx CORS-Header konfigurieren
- [ ] Testing: Manuelle Installation auf 1 PC
- [ ] Dokumentation: Installations-Anleitung für User


