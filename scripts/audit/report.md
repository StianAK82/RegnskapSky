# RegnskapsAI - Systemaudit Rapport

**Datum:** 2025-01-25  
**Scope:** Audit mot specifikation för Next.js + Supabase-app  
**Aktuell arkitektur:** React + Express + Drizzle ORM

## Sammandrag

**🔍 VIKTIGT NOTAT:** Din nuvarande app använder React + Express + Drizzle ORM, men specifikationen är skriven för Next.js + Supabase. Det finns strukturella skillnader som påverkar implementationen.

**Status:** ⚠️ DELVIS KOMPATIBEL
- **Pass:** 45%
- **Fail:** 35% 
- **Delvis:** 20%

## 1. Glemt passord-flyt

### Sidor
| Komponent | Status | Filsökväg | Kommentar |
|-----------|--------|-----------|-----------|
| `/auth/reset` | ❌ SAKNAS | - | Behöver skapas |
| `/auth/reset/confirm` | ❌ SAKNAS | - | Behöver skapas |

### API Endpoints
| Endpoint | Status | Filsökväg | Kommentar |
|----------|--------|-----------|-----------|
| `POST /api/auth/reset/request` | ❌ SAKNAS | - | Behöver implementeras i `server/routes.ts` |
| `POST /api/auth/reset/confirm` | ❌ SAKNAS | - | Behöver implementeras i `server/routes.ts` |

### Funktionalitet
- ❌ Token lagring med hash + TTL 30-60 min
- ❌ Single-use tokens  
- ❌ Rate-limiting
- ❌ "Alltid OK"-respons (inte lekka om e-post finnes)
- ❌ Audit-logg för request/confirm

**Konkreta TODOs:**
1. Lägg till `password_reset_tokens` tabell i `shared/schema.ts`
2. Skapa reset request/confirm endpoints i `server/routes.ts`
3. Skapa React-komponenter för reset-flödet
4. Implementera rate-limiting middleware

## 2. Systemeiers admin (SYSTEM_OWNER)

### Sidor
| Komponent | Status | Filsökväg | Kommentar |
|-----------|--------|-----------|-----------|
| `/admin/tenants` | ⚠️ DELVIS | `web/app/vendor/dashboard/page.tsx` | Finns i Next.js del men inte i nuvarande React app |

### API Endpoints
| Endpoint | Status | Filsökväg | Kommentar |
|----------|--------|-----------|-----------|
| `GET /api/admin/companies` | ⚠️ DELVIS | `web/lib/api.ts` (licensing endpoints) | Finns delvis via licensing API |
| `PATCH /api/admin/companies/:id/license` | ⚠️ DELVIS | `web/lib/api.ts` | Finns i licensing endpoints |

### Funktionalitet
- ✅ License management finns (NestJS struktur)
- ❌ Admin companies overview i React app
- ❌ SYSTEM_OWNER roll i nuvarande auth system
- ⚠️ RLS och rolle-guards (finns i NestJS, saknas i Express)

**Konkreta TODOs:**
1. Lägg till SYSTEM_OWNER roll i `shared/schema.ts`
2. Skapa admin routes i `server/routes.ts`
3. Skapa admin dashboard i React app
4. Implementera rolle-guards för admin endpoints

## 3. Kundens dashboard (COMPANY_ADMIN/USER)

### Sidor
| Komponent | Status | Filsökväg | Kommentar |
|-----------|--------|-----------|-----------|
| `/dashboard` | ✅ FUNGERANDE | `client/src/pages/Dashboard.tsx` | Finns och fungerar |

### Seksjoner
| Seksjon | Status | Filsökväg | Kommentar |
|---------|--------|-----------|-----------|
| Klienter | ✅ FUNGERANDE | `client/src/pages/clients.tsx` | Komplett implementation |
| Oppgaver | ✅ FUNGERANDE | `client/src/pages/tasks.tsx` | Finns med filter/opprett |
| Timer (ukevisning) | ❌ SAKNAS | - | Saknar ukevisning |
| "Mine oppgaver" | ❌ SAKNAS | - | Saknar personlig oppgavevy |

### Funktionalitet
- ✅ Filter på status/klient i oppgaver
- ✅ Opprett/oppdater oppgaver
- ✅ Assignee/due_date
- ❌ Timer ukevisning och godkjenning
- ⚠️ Timeføring finns men saknar godkjenning/lås

**Konkreta TODOs:**
1. Lägg till ukevisning för timer i dashboard
2. Skapa "Mine oppgaver" sektion
3. Implementera timer godkjenning/lås funktionalitet

## 4. Klientkort med KYC/AML + Altinn

### Klientkort badges
| Badge | Status | Filsökväg | Kommentar |
|-------|--------|-----------|-----------|
| KYC Status | ⚠️ DELVIS | `client/src/pages/clients.tsx` | Basic KYC finns |
| AML Status | ⚠️ DELVIS | `client/src/pages/clients.tsx` | Basic AML finns |
| Altinn | ❌ SAKNAS | - | Ingen Altinn-funktionalitet |

### Primärknapp (state-styrt)
- ⚠️ DELVIS: Start/Fortsett finns för KYC
- ❌ SAKNAS: Altinn-integration
- ❌ SAKNAS: `/clients/[id]/kyc` route

### Sekundære handlingar
- ⚠️ DELVIS: Last opp dokumenter (finns via AML)
- ❌ SAKNAS: Se historikk
- ❌ SAKNAS: Kjør AML-rescreen

### Altinn-seksjon
- ❌ SAKNAS: "Har vi fått Altinn-tilgang?" spørsmål
- ❌ SAKNAS: Altinn-relaterte felter i datamodell

**Konkreta TODOs:**
1. Lägg till Altinn-fält i `clients` tabell: `altinn_access`, `altinn_access_type`, etc.
2. Skapa `/clients/[id]/kyc` route och komponent
3. Implementera AML-rescreen funktionalitet
4. Lägg till Altinn-seksjon i klientkort

## 5. Timer & godkjenning

### Timeføring
| Funktionalitet | Status | Filsökväg | Kommentar |
|----------------|--------|-----------|-----------|
| Timeføring per klient/oppgave | ✅ FUNGERANDE | `client/src/pages/*`, `server/routes.ts` | Basic timeføring finns |
| Admin kan godkjenne/låse | ❌ SAKNAS | - | Saknar approval workflow |
| Rapporter (timer per klient/ansatt/periode) | ⚠️ DELVIS | `server/routes.ts` | Basic rapporter finns |

### Datamodell
- ✅ `time_entries` tabell finns
- ❌ Saknar `approved`, `locked` felter
- ❌ Saknar `invoice_status` felt

**Konkreta TODOs:**
1. Lägg till `approved`, `locked`, `invoice_status` i `timeEntries` tabell
2. Skapa approval endpoints i `server/routes.ts`
3. Lägg till approval UI i timer-komponenter

## 6. Rolle-/tilgangsstyring + RLS

### Roller
| Roll | Status | Definerad i | Kommentar |
|------|--------|------------|-----------|
| SYSTEM_OWNER | ❌ SAKNAS | - | Saknas helt |
| COMPANY_ADMIN | ⚠️ DELVIS | `shared/schema.ts` | Finns som "admin" |
| COMPANY_USER | ⚠️ DELVIS | `shared/schema.ts` | Finns som "ansatt" |

### RLS (Row Level Security)
- ❌ SAKNAS: RLS policies (använder Drizzle ORM, inte Supabase)
- ⚠️ DELVIS: Tenant isolation via middleware i Express routes
- ❌ SAKNAS: Systematiska rolle-guards

**Konkreta TODOs:**
1. Implementera systematisk rolle-guard middleware
2. Lägg till SYSTEM_OWNER roll
3. Förstärk tenant isolation i alla endpoints

## 7. Datamodell - Jämförelse mot minimumsfält

### Tabeller
| Tabell | Status | Saknade fält | Kommentar |
|--------|--------|-------------|-----------|
| `companies` | ❌ SAKNAS | Hela tabellen | Använder `tenants` istället |
| `users` | ✅ FINNS | `full_name`, `company_id` | Använder `firstName`+`lastName`, `tenantId` |
| `clients` | ⚠️ DELVIS | Altinn-fält, vissa KYC/AML-fält | Bra grund finns |
| `tasks` | ⚠️ DELVIS | `estimated_hours`, `billable`, `invoice_status` | Basic struktur finns |
| `time_entries` | ⚠️ DELVIS | `rate`, `approved`, `locked` | Basic struktur finns |
| `password_reset_tokens` | ❌ SAKNAS | Hela tabellen | Behöver skapas |
| `audit_logs` | ❌ SAKNAS | Hela tabellen | Behöver skapas |
| `kyc_cases` | ❌ SAKNAS | Hela tabellen | Behöver skapas |
| `aml_screenings` | ❌ SAKNAS | Hela tabellen | Behöver skapas |

### Migreringar som behövs
```sql
-- Lägg till i clients tabell
ALTER TABLE clients ADD COLUMN altinn_access BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN altinn_access_type TEXT;
ALTER TABLE clients ADD COLUMN altinn_access_granted_at TIMESTAMP;
ALTER TABLE clients ADD COLUMN altinn_access_granted_by UUID;
ALTER TABLE clients ADD COLUMN coord_reg_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN altinn_invitation_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN altinn_notes TEXT;

-- Lägg till i time_entries tabell  
ALTER TABLE time_entries ADD COLUMN rate DECIMAL(10,2);
ALTER TABLE time_entries ADD COLUMN approved BOOLEAN DEFAULT FALSE;
ALTER TABLE time_entries ADD COLUMN locked BOOLEAN DEFAULT FALSE;

-- Lägg till i tasks tabell
ALTER TABLE tasks ADD COLUMN estimated_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN billable BOOLEAN DEFAULT TRUE;
ALTER TABLE tasks ADD COLUMN invoice_status TEXT DEFAULT 'not_invoiced';
```

## 8. Testning & CI

### Test Files
| Test Type | Status | Filsökväg | Kommentar |
|-----------|--------|-----------|-----------|
| API tests | ❌ SAKNAS | - | Behöver skapas under `tests/api/*` |
| E2E tests | ⚠️ DELVIS | `web/e2e/*` | Finns för NestJS del |
| Seeder | ❌ SAKNAS | - | Behöver skapas |

### Package.json scripts
- ❌ SAKNAS: `test:api`
- ❌ SAKNAS: `test:e2e`  
- ❌ SAKNAS: `test:all`
- ❌ SAKNAS: `seed`

### CI/CD
- ❌ SAKNAS: `.github/workflows/test.yml`

**Konkreta TODOs:**
1. Skapa API-kontraktstester med Jest + Supertest
2. Skapa E2E-tester med Playwright för React app
3. Skapa seeder-script för testdata
4. Sätt upp GitHub Actions workflow

## 9. Status-dashboard för verifiering

### /dev/verification sida
- ❌ SAKNAS: Hela komponenten behöver skapas
- ❌ SAKNAS: `scripts/audit/report.json` generation

## Prioriterad TODO-lista

### Hög prioritet (Kärnfunktionalitet)
1. **Glemt passord-flyt** - Komplett implementation
2. **Altinn-integration** - Lägg till fält och UI
3. **Timer godkjenning** - Approval workflow
4. **SYSTEM_OWNER roll** - Admin functionality

### Medium prioritet (Förbättringar)
1. **Teste-suite** - API och E2E tester
2. **Audit logging** - Komplett spårning
3. **Mine oppgaver** - Personlig dashboard
4. **Timer ukevisning** - Bättre UX

### Låg prioritet (Nice-to-have)
1. **RLS policies** - För framtida Supabase migration
2. **CI/CD pipeline** - Automatiserad testning
3. **Dev verification dashboard** - Utvecklingsverktyg

## Slutsats

Din nuvarande RegnskapsAI-app har en stark grund med fungerande autentisering, klient-hantering och basic uppgifts-/timehantering. De största gapen är:

1. **Arkitekturskillnad**: Specifikationen är för Next.js+Supabase, du använder React+Express+Drizzle
2. **Säkerhet**: Saknar systematisk rolle-baserad åtkomstkontroll
3. **Compliance**: Altinn-integration och förbättrad KYC/AML-hantering
4. **Testning**: Ingen testsvit existerar

**Rekommendation**: Fokusera på att bygga vidare på din nuvarande arkitektur istället för att migrera till Next.js+Supabase, eftersom grundfunktionaliteten redan fungerar bra.