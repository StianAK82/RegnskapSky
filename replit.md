# Zaldo CRM - Multi-Tenant Accounting Management System

## Overview
Zaldo CRM is a comprehensive Norwegian multi-tenant accounting and client management system designed to streamline financial and client operations. It features strict licensing, robust role-based authentication, and tenant isolation. Key capabilities include automated task generation, AML compliance tracking, forced time registration, comprehensive auditing, and role-specific dashboards. The project aims to provide a complete, secure, and efficient solution for accounting and client management needs, built from scratch with a strong focus on compliance and user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite.
- **UI Library**: Shadcn/ui (Radix UI primitives).
- **Styling**: Tailwind CSS with CSS variables.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **Authentication**: Context-based auth provider with JWT token management.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM.
- **Authentication**: JWT-based with bcrypt for password hashing and 2FA.
- **Access Control**: Middleware-based Role-Based Access Control (RBAC).
- **API Structure**: RESTful API.

### Database Design
- **Database**: PostgreSQL with Neon serverless driver.
- **Schema Management**: Drizzle ORM with migrations.
- **Multi-tenancy**: Tenant-based data isolation using tenant IDs.
- **Core Entities**: Users, Tenants, Clients, Tasks, Time Entries, Documents, Notifications, Integrations.
- **User Roles**: admin, oppdragsansvarlig, regnskapsfører, intern, lisensadmin.

### Authentication & Authorization
- **JWT Tokens**: 7-day expiration with user, tenant, and role information.
- **Password Security**: bcrypt (12 salt rounds).
- **Route Protection**: Middleware for authentication and RBAC.
- **Multi-tenant Security**: Automatic tenant isolation for data access.
- **2FA**: Implemented with QR code generation and backup codes.

### AI Integration
- **Provider**: OpenAI GPT-4o for AI-powered features.
- **Capabilities**: Automated document categorization, accounting assistance, and report generation via natural language queries.
- **Language Support**: Specialized prompts for Norwegian accounting standards.

### Feature Specifications
- **Automated Task Generation**: Standard tasks (Bokføring, MVA, Lønn) and special deadline tasks (Aksjonærregister, Skattemelding, Årsoppgjør).
- **AML/KYC Workflow**: Status progression with 12-month renewal and reminders.
- **Time Tracking System**: Forced modal on logout, comprehensive reporting, CSV export.
- **Audit Logging**: Append-only trail for user actions.
- **Feature Flags**: Per-tenant configuration management.
- **Report Generator**: AI-powered with natural language processing, predefined templates, advanced data grouping, real-time CSV download, and SQL pseudocode generation.
- **Task Management UI**: Filtered active tasks, editable assignee dropdowns, hover tooltips, and task execution buttons.
- **Dashboard Design**: Professional, neutral design with improved responsive layout.

## External Dependencies

-   **Payment Processing**: Stripe (client-side: `@stripe/stripe-js`, `@stripe/react-stripe-js`; server-side: Stripe SDK).
-   **Email Services**: SendGrid.
-   **Database & Infrastructure**: Neon Database (PostgreSQL).
-   **AI Services**: OpenAI (GPT-4o).
-   **Compliance Integration**: Verified.eu (for AML/KYC).
-   **UI & Styling**: Radix UI, Tailwind CSS, Font Awesome, Google Fonts (Inter).
-   **Validation**: Zod, React Hook Form, Drizzle Zod.
-   **Development Tools**: Vite, TypeScript, ESBuild, Replit Integration.