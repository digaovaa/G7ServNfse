# NFS-e Automated Download System

## Overview

This is a Brazilian fiscal document (NFS-e - Nota Fiscal de Serviço Eletrônica) automated download system for G7 Serv. The application allows users to search for and download electronic service invoices by CNPJ (Brazilian company registration number), with support for individual and batch downloads in PDF/XML formats.

The system is built as a full-stack TypeScript application with a React frontend and Express backend, using Replit authentication for user management and PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with tsx for development, esbuild for production)
- **API Pattern**: RESTful API endpoints under `/api/*` prefix
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Key Tables**:
  - `users`: User accounts with role-based access (admin/operador)
  - `nfse_metadata`: Invoice metadata (CNPJ, dates, values, file paths)
  - `download_logs`: Audit trail for downloads
  - `sessions`: Session storage for authentication

### File Storage
- **Object Storage**: Google Cloud Storage integration via `@google-cloud/storage`
- **ACL System**: Custom object access control layer in `server/objectAcl.ts`
- **Batch Downloads**: ZIP archive generation using the `archiver` package

### Key Design Decisions

1. **Monorepo Structure**: Client, server, and shared code in a single repository with path aliases (`@/`, `@shared/`)

2. **Shared Schema**: Drizzle schema definitions are shared between frontend and backend for type safety, with Zod schemas generated via `drizzle-zod`

3. **CNPJ Validation**: Client-side validation with proper Brazilian CNPJ algorithm implementation in `client/src/lib/authUtils.ts`

4. **Material Design Inspired**: UI follows design guidelines in `design_guidelines.md` - system-based approach for data-heavy fiscal operations

5. **Role-Based Access**: Users have roles (admin/operador) stored in database, though current implementation primarily uses operador role

## External Dependencies

### Authentication
- **Replit Auth**: OpenID Connect integration via Replit's OIDC provider
- **Session Secret**: Requires `SESSION_SECRET` environment variable

### Database
- **PostgreSQL**: Requires `DATABASE_URL` environment variable
- **Drizzle ORM**: Database migrations via `drizzle-kit push`

### Cloud Storage
- **Google Cloud Storage**: Used for storing PDF/XML invoice files
- **Replit Sidecar**: Token management via local endpoint at `http://127.0.0.1:1106`

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tools
- `@tanstack/react-query`: Server state management
- `archiver`: ZIP file generation for batch downloads
- `date-fns`: Date formatting and manipulation
- `zod`: Runtime type validation
- `soap`: SOAP client for NFS-e Municipal API (Recife)
- `xml2js`: XML parsing for SOAP responses
- `node-forge`: Digital certificate A1 handling
- `axios`: HTTP client for NFS-e Nacional REST API

## Government Portal Integration

### NFS-e Nacional (REST API)
- **Endpoint**: `https://www.nfse.gov.br/emissornacionalfrontend/api/`
- **Authentication**: mTLS with digital certificate A1 (.pfx/.p12)
- **Features**: Query invoices, download DANFS-e PDF
- **Service file**: `server/nfseNacional.ts`

### NFS-e Municipal Recife (SOAP API)
- **Endpoint**: `https://nfse.recife.pe.gov.br/nfse.svc`
- **Standard**: ABRASF 2.02
- **Authentication**: mTLS with digital certificate A1
- **Features**: Query invoices by period, by tomador
- **Service file**: `server/nfseRecife.ts`

### Email Service
- **Providers**: SendGrid and Resend support
- **Feature**: Send NFS-e PDFs to clients
- **Service file**: `server/emailService.ts`

### Migration Timeline (Recife)
- Nov 2025: Simple societies migrate to National
- Dec 2025: Simples Nacional companies migrate
- Jan 2026: General regime companies migrate

## Configuration Requirements
- **Digital Certificate A1**: Required for government API authentication
- **Email API Key**: SendGrid or Resend for email sending
- **Environment Variables**:
  - `SESSION_SECRET`: Session encryption key
  - `DATABASE_URL`: PostgreSQL connection string