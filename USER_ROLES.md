# FRIDAY CRM: User Roles & Permissions

## Rollen-Hierarchie

### 1. Admin (Intern)
- **Wer:** Geschäftsführung, internes Team
- **Zugriff:** Vollzugriff auf alle Funktionen
- **Rechte:**
  - Alle Konzerne, Firmen, Kontakte sehen und bearbeiten
  - Deals erstellen, bearbeiten, löschen
  - Aktivitäten aller Nutzer sehen
  - Partner-Management (McKinsey, BCG, etc.)
  - User-Management (externe Sales-Mitarbeiter anlegen/deaktivieren)
  - Produkt-Usage-Daten einsehen
  - AI Agent konfigurieren
  - Import/Export

### 2. Sales Manager (Intern)
- **Wer:** Interner Sales-Profi für Enterprise-Closing
- **Zugriff:** Alle Sales-relevanten Funktionen
- **Rechte:**
  - Alle Konzerne, Firmen, Kontakte sehen und bearbeiten
  - Deals erstellen, bearbeiten, eigene Deals löschen
  - Aktivitäten aller Nutzer sehen
  - Produkt-Usage-Daten einsehen
  - **Kein** User-Management
  - **Kein** Partner-Management

### 3. External Sales (Upwork)
- **Wer:** Externe Sales-Mitarbeiter über Upwork
- **Zugriff:** Eingeschränkt auf zugewiesene Accounts
- **Rechte:**
  - **Nur** zugewiesene Konzerne/Firmen sehen
  - Kontakte in zugewiesenen Accounts sehen und bearbeiten
  - Deals in zugewiesenen Accounts erstellen und bearbeiten
  - Eigene Aktivitäten loggen
  - **Kein** Zugriff auf:
    - Andere Accounts
    - Partner-Daten
    - Produkt-Usage-Daten
    - User-Management
    - AI Agent Konfiguration
  - **Provision-Tracking:** Sehen eigene Deals und Provision

### 4. Partner (Beratungen)
- **Wer:** McKinsey, BCG, Roland Berger Mitarbeiter
- **Zugriff:** Nur eigene Partner-Deals
- **Rechte:**
  - Eigene Partner-Deals sehen
  - Neue Deals anlegen (werden automatisch Partner zugeordnet)
  - **Kein** Zugriff auf:
    - Andere Partner-Deals
    - Gesamte Account-Datenbank
    - Produkt-Usage-Daten

## Datenbank-Erweiterung

### Tabelle: users (erweitert)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'external_sales', -- admin, sales_manager, external_sales, partner
    status VARCHAR(50) DEFAULT 'active', -- active, inactive
    partner_id UUID REFERENCES partners(id), -- Nur für role=partner
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Tabelle: user_account_assignments

```sql
CREATE TABLE user_account_assignments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    corporation_id UUID REFERENCES corporations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id), -- Wer hat zugewiesen?
    UNIQUE(user_id, corporation_id)
);
```

### Tabelle: commissions (Provisionen für External Sales)

```sql
CREATE TABLE commissions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    deal_id UUID REFERENCES deals(id),
    commission_percent DECIMAL(5,2), -- z.B. 10.00 für 10%
    commission_amount DECIMAL(10,2),
    paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Permission-Logik (Backend)

### tRPC Context erweitern

```typescript
// server/_core/context.ts
export const createContext = async ({ req, res }: CreateContextOptions) => {
  const user = await getUserFromSession(req);
  
  return {
    req,
    res,
    user,
    // Permission helpers
    canAccessCorporation: async (corporationId: string) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'sales_manager') return true;
      
      if (user.role === 'external_sales') {
        // Check if user has assignment
        const assignment = await db.query.user_account_assignments.findFirst({
          where: and(
            eq(user_account_assignments.user_id, user.id),
            eq(user_account_assignments.corporation_id, corporationId)
          )
        });
        return !!assignment;
      }
      
      return false;
    }
  };
};
```

### Protected Procedures

```typescript
// server/routers.ts
const externalSalesProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'sales_manager', 'external_sales'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

## Frontend: Role-based UI

### useAuth Hook erweitern

```typescript
// client/src/hooks/useAuth.ts
export function useAuth() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  
  return {
    user,
    loading: isLoading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSalesManager: user?.role === 'sales_manager',
    isExternalSales: user?.role === 'external_sales',
    isPartner: user?.role === 'partner',
    canManageUsers: user?.role === 'admin',
    canSeeAllAccounts: user?.role === 'admin' || user?.role === 'sales_manager',
  };
}
```

### Navigation basierend auf Rolle

```typescript
// client/src/App.tsx
function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/corporations" component={Corporations} />
      <Route path="/deals" component={Deals} />
      
      {/* Admin only */}
      {user?.role === 'admin' && (
        <>
          <Route path="/users" component={UserManagement} />
          <Route path="/partners" component={PartnerManagement} />
        </>
      )}
      
      {/* External Sales: Nur eigene Deals */}
      {user?.role === 'external_sales' && (
        <Route path="/my-deals" component={MyDeals} />
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}
```

## Provision-Berechnung für External Sales

### Automatische Commission-Erstellung

```typescript
// server/routers/deals.ts
export const dealsRouter = router({
  create: externalSalesProcedure
    .input(z.object({
      corporationId: z.string(),
      dealValue: z.number(),
      // ...
    }))
    .mutation(async ({ ctx, input }) => {
      // Create deal
      const deal = await db.insert(deals).values({
        ...input,
        created_by: ctx.user.id
      }).returning();
      
      // If created by external sales, create commission
      if (ctx.user.role === 'external_sales') {
        const commissionPercent = 10; // 10% Provision
        const commissionAmount = input.dealValue * (commissionPercent / 100);
        
        await db.insert(commissions).values({
          user_id: ctx.user.id,
          deal_id: deal[0].id,
          commission_percent: commissionPercent,
          commission_amount: commissionAmount,
          paid: false
        });
      }
      
      return deal[0];
    })
});
```

## Onboarding External Sales (Upwork)

### 1. Admin erstellt User

```typescript
// Admin Panel: User anlegen
const newUser = await trpc.users.create.mutate({
  name: "John Doe",
  email: "john@upwork.com",
  role: "external_sales"
});
```

### 2. Admin weist Accounts zu

```typescript
// Admin Panel: Accounts zuweisen
await trpc.users.assignAccounts.mutate({
  userId: newUser.id,
  corporationIds: ["uuid-1", "uuid-2", "uuid-3"] // 10-20 Accounts
});
```

### 3. External Sales erhält Login-Link

- E-Mail mit Manus OAuth Login-Link
- Nach Login: Sieht nur zugewiesene Accounts
- Kann Deals anlegen und Provision tracken

## Dashboard für External Sales

### My Deals View

```typescript
// client/src/pages/MyDeals.tsx
export default function MyDeals() {
  const { data: deals } = trpc.deals.myDeals.useQuery();
  const { data: commissions } = trpc.commissions.myCommissions.useQuery();
  
  const totalCommission = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
  const paidCommission = commissions?.filter(c => c.paid).reduce((sum, c) => sum + c.commission_amount, 0) || 0;
  
  return (
    <div>
      <h1>My Deals</h1>
      
      <div className="stats">
        <div>Total Deals: {deals?.length}</div>
        <div>Total Commission: €{totalCommission.toFixed(2)}</div>
        <div>Paid: €{paidCommission.toFixed(2)}</div>
        <div>Pending: €{(totalCommission - paidCommission).toFixed(2)}</div>
      </div>
      
      <table>
        {/* Deals table */}
      </table>
    </div>
  );
}
```

## Zusammenfassung

**Rollen:**
1. Admin (voller Zugriff)
2. Sales Manager (Sales-Funktionen, kein User-Management)
3. External Sales (nur zugewiesene Accounts, Provision-Tracking)
4. Partner (nur eigene Partner-Deals)

**Externe Sales-Mitarbeiter (Upwork):**
- Erhalten 10-20 zugewiesene Accounts
- Können nur diese Accounts sehen und bearbeiten
- Erhalten 10% Provision auf geschlossene Deals
- Tracken eigene Provision im Dashboard
- Kein Zugriff auf andere Accounts oder Admin-Funktionen

**Implementierung:**
- User-Tabelle mit `role` Feld
- `user_account_assignments` für Account-Zuordnung
- `commissions` für Provisions-Tracking
- Permission-Checks in tRPC Context
- Role-based UI Rendering

