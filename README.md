# Zaldo CRM - Multi-Tenant Accounting Management System

A comprehensive Norwegian multi-tenant CRM system for accounting firms with strict licensing, role-based authentication, and tenant isolation.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod
- **Backend**: NestJS (TypeScript) with REST API
- **Database**: PostgreSQL with Prisma ORM
- **Jobs/Queues**: BullMQ + Redis
- **Authentication**: JWT with MFA (TOTP), SSO stubs (AzureAD/Google), BankID stub
- **Security**: Helmet/CSP, rate limiting, bcrypt, HIBP stub, tenant guard on all queries

### User Roles & Isolation
- **Vendor**: System administrator, manages all licenses
- **LicenseAdmin**: Company administrator, manages employees within license
- **Employee**: Standard user, works with clients and tasks

### Core Modules
- **Licensing**: License creation, employee limits, auto-admin creation
- **Users**: Employee management with license limits
- **Clients**: Two-step creation with Brønnøysund lookup and AML status
- **Tasks**: Auto-generated standard tasks + special deadline tasks
- **Time Tracking**: Forced modal on logout, comprehensive reporting
- **AML/KYC**: Status tracking, verification workflow, automated reminders
- **Dashboards**: Role-specific widgets and analytics
- **Audit**: Comprehensive audit logging for all actions
- **Notifications**: Automated task and AML reminders
- **Feature Flags**: Per-tenant feature management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Redis server

### Environment Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd zaldo-crm
npm run setup
```

2. **Set up environment variables**:
```bash
# Server environment
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Web environment  
cp web/.env.example web/.env.local
# Edit web/.env.local with your API URL
```

3. **Database setup**:
```bash
# Run migrations and seed demo data
npm run db:migrate
npm run db:seed
```

### Running the Application

```bash
# Start both server and web in development mode
npm run dev

# Or run individually
npm run dev:server  # NestJS backend on port 5000
npm run dev:web     # Next.js frontend on port 3000
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

### Demo Credentials

After running the seed command, you can log in with:

- **Vendor**: vendor@zaldo.no / vendor123
- **License Admin**: admin@demobyraa.no / admin123  
- **Employee 1**: ansatt1@demobyraa.no / emp123
- **Employee 2**: ansatt2@demobyraa.no / emp456

## 🧪 Testing

### Backend Tests (Jest)
```bash
cd server
npm test                # Unit tests
npm run test:e2e       # Integration tests
```

### Frontend Tests (Playwright)
```bash
cd web
npm run e2e            # E2E tests headless
npm run e2e:ui         # E2E tests with UI
```

### Test Coverage Areas
- **RBAC Matrix**: Role × endpoint permissions
- **Tenant Isolation**: Cross-tenant IDOR prevention (403 responses)
- **License Limits**: Employee limit enforcement (422 responses)
- **Task Generation**: Standard tasks + special deadline tasks
- **AML Workflow**: Verification sets dates, reminder scheduling
- **Time Modal**: Forced registration on client switch/logout
- **Dashboards**: Correct widget content per role, Vendor sees no tenant data

## 📁 Project Structure

```
/
├── server/                 # NestJS Backend
│   ├── src/
│   │   ├── modules/       # Feature modules (auth, licensing, etc.)
│   │   ├── common/        # Shared services, guards, decorators
│   │   └── main.ts        # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Demo data seeding
│   └── tests/             # Jest tests
├── web/                   # Next.js Frontend  
│   ├── app/               # App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (vendor)/      # Vendor-only pages
│   │   └── (tenant)/      # Tenant pages
│   ├── components/        # Reusable UI components
│   ├── lib/               # API client, providers, utilities
│   └── e2e/               # Playwright tests
└── docker-compose.yml     # Development services
```

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Multi-factor authentication (TOTP)
- Role-based access control (RBAC)
- Tenant isolation guards on all data operations

### Data Protection
- bcrypt password hashing (12 rounds)
- HIBP integration for compromised password detection
- Helmet security headers with CSP
- Rate limiting on authentication endpoints

### Audit & Compliance
- Comprehensive audit logging for all actions
- Append-only audit trail with metadata
- License isolation enforcement
- Feature flags for gradual rollouts

## 🏢 Business Logic

### License Management
- Vendor creates licenses with employee limits
- Auto-creation of LicenseAdmin user
- Employee limit enforcement
- License expiration tracking

### Client Workflow
1. **Brønnøysund Lookup**: Auto-fill company data by org number
2. **AML Status Assignment**: Set initial compliance status
3. **Standard Task Generation**: Automatic creation of default tasks
4. **Special Deadline Tasks**: Aksjonærregister (Dec 1), Skattemelding (May 31), Årsoppgjør (July 31)

### Time Tracking
- Forced modal on client switch or logout if time not registered
- Comprehensive reporting by employee, client, and period
- CSV export functionality
- Weekly/monthly capacity analytics

### AML/KYC Compliance
- Status progression: NotStarted → InProgress → Verified → Expired
- "Go to Verified" integration stub
- Automatic next due date calculation (+12 months)
- Reminder notifications at 30/7/1 days before expiry

## 📊 Dashboard Features

### Vendor Dashboard
- License overview with usage statistics
- System-wide metrics (no tenant data access)
- License expiration monitoring
- User and client count aggregations

### License Admin Dashboard  
- Client count and task overview
- AML warning notifications
- Team MFA coverage statistics
- Capacity analytics (time tracking)

### Employee Dashboard
- Personal client and task assignments
- Time tracking summaries (this/last week)
- Upcoming deadline alerts
- AI-powered suggestions

## 🚀 Deployment

### Production Build
```bash
npm run build          # Build both server and web
npm run start          # Start production server
```

### Docker Deployment
```bash
docker-compose up -d   # Start all services
```

### Environment Variables

**Server (.env)**:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/zaldo_crm"
JWT_SECRET="your-super-secret-jwt-key"
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="https://your-domain.com"
```

**Web (.env.local)**:
```bash
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
```

## 🔧 Development Commands

```bash
# Install all dependencies
npm run setup

# Development
npm run dev            # Start both server and web
npm run dev:server     # Start only backend
npm run dev:web        # Start only frontend

# Database
npm run db:migrate     # Run Prisma migrations
npm run db:seed        # Seed demo data
npm run db:push        # Push schema changes

# Testing
npm test               # Run backend tests
npm run e2e            # Run frontend E2E tests

# Building
npm run build          # Build for production
npm run build:server   # Build backend only
npm run build:web      # Build frontend only
```

## 📋 Features Checklist

### ✅ Authentication & Security
- [x] Email + password login with MFA
- [x] JWT access/refresh with rotation
- [x] Role-based access control (RBAC)
- [x] Tenant isolation guards
- [x] Rate limiting and security headers

### ✅ License Management
- [x] License creation with employee limits
- [x] Auto LicenseAdmin creation
- [x] Employee limit enforcement
- [x] License expiration tracking

### ✅ User Management
- [x] Employee creation within license limits
- [x] Role assignment and permissions
- [x] MFA setup and enforcement
- [x] User deactivation

### ✅ Client Management
- [x] Two-step client creation
- [x] Brønnøysund integration stub
- [x] AML status tracking
- [x] Accounting system integration
- [x] Client responsibles management

### ✅ Task Management
- [x] Auto-generated standard tasks
- [x] Special deadline tasks with fixed dates
- [x] Custom task creation
- [x] Task assignment and status tracking
- [x] Checklist requirements before completion

### ✅ Time Tracking
- [x] Forced time entry modal
- [x] Client and task-based time logging
- [x] Comprehensive reporting
- [x] CSV export functionality

### ✅ AML/KYC Compliance
- [x] Status progression workflow
- [x] Verified integration stub
- [x] Automatic reminder scheduling
- [x] Next due date calculation

### ✅ Dashboards & Analytics
- [x] Role-specific dashboard widgets
- [x] Vendor system overview
- [x] License admin management view
- [x] Employee personal dashboard
- [x] AI suggestion stubs

### ✅ Audit & Compliance
- [x] Comprehensive audit logging
- [x] Action tracking across all modules
- [x] Append-only audit trail
- [x] Feature flag management

### ✅ Notifications
- [x] Automated task reminders (7/1 days)
- [x] AML expiration warnings (30/7/1 days)
- [x] System notifications
- [x] Email integration ready

## 📞 Support

For issues or questions about the Zaldo CRM system:

1. Check the existing documentation
2. Review the test cases for expected behavior
3. Check the audit logs for system events
4. Verify environment configuration

## 📄 License

This project is proprietary software for accounting firm management. All rights reserved.