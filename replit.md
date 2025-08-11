# RegnskapsAI - Norwegian Accounting System

## Overview

RegnskapsAI is a comprehensive Norwegian multi-tenant accounting and client management system built with modern web technologies. The application provides AI-assisted document categorization, accounting suggestions, role-based access control (RBAC), and integrations with third-party services like Stripe for payments and SendGrid for email communications. The system supports multiple user roles including administrators, project managers, accountants, and internal staff, with specialized features for each role type.

### Recent Updates (January 2025)
- ✅ **Fixed 401 Authentication Errors**: Implemented proper Bearer token headers in all API requests
- ✅ **Complete Time Tracking Module**: Modal interface, client-specific entries, filtering, and Excel/PDF export
- ✅ **Enhanced Client Management**: Accounting system selection (Fiken, Tripletex, Unimicro, PowerOffice, Conta) with direct URLs
- ✅ **Client Tasks & Responsibles**: Standard task types, custom tasks, assignment system for project management
- ✅ **Brønnøysund Integration**: Automatic company data lookup by organization number
- ✅ **AML/KYC Module**: Document upload, provider management, comprehensive check results
- ✅ **Regnskap Norge Checklists**: Standard monthly/quarterly/annual templates with auto-fill capabilities
- ✅ **Plugin Architecture**: Extensible system for third-party integrations and custom features
- ✅ **Advanced Reporting**: Time reports with filters, export capabilities, and dashboard metrics
- ✅ **Database Schema**: Extended with client_tasks, client_responsibles, aml_checks, accounting_integrations tables

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas
- **Authentication**: Context-based auth provider with JWT token management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL as the database
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Role-Based Access Control**: Middleware-based RBAC system supporting multiple user roles
- **API Structure**: RESTful API with organized route handlers and middleware

### Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle ORM with migrations stored in `/migrations`
- **Multi-tenancy**: Tenant-based data isolation with tenant IDs
- **Core Entities**: Users, Tenants, Clients, Tasks, Time Entries, Documents, Notifications, Integrations
- **User Roles**: admin, oppdragsansvarlig, regnskapsfører, intern, lisensadmin

### Authentication & Authorization
- **JWT Tokens**: 7-day expiration with user, tenant, and role information
- **Password Security**: bcrypt with salt rounds of 12
- **Route Protection**: Middleware for authentication and role-based authorization
- **Multi-tenant Security**: Automatic tenant isolation for data access

### AI Integration
- **Provider**: OpenAI GPT-4o for AI-powered features
- **Document Processing**: Automated document categorization and account suggestions
- **Accounting Assistant**: AI-powered accounting question answering
- **Norwegian Language**: Specialized prompts for Norwegian accounting standards and language

## External Dependencies

### Payment Processing
- **Stripe**: Integrated for subscription management and payment processing
- **Client-side**: @stripe/stripe-js and @stripe/react-stripe-js for payment forms
- **Server-side**: Stripe SDK for webhook handling and subscription management

### Email Services
- **SendGrid**: Email delivery service for notifications and communications
- **Use Cases**: Task notifications, welcome emails, subscription notifications, and system alerts

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: For real-time database connections

### Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Production bundling for server-side code
- **Replit Integration**: Development environment plugins and tooling

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Inter font family for typography

### Validation & Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation
- **Drizzle Zod**: Integration between Drizzle ORM and Zod schemas