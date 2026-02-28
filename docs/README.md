# UDS-HR Documentation

## What is UDS-HR?

UDS-HR is a mobile-first Progressive Web App (PWA) for managing field workforce HR operations. It provides punch in/out attendance tracking with GPS verification, leave management, live team tracking on maps, employee onboarding, and analytics — all accessible from a phone browser with offline support.

**Target audience:** Organizations with field employees who need to track attendance, location, and leave from mobile devices without installing native apps.

**Live application:** https://uds-hr.vercel.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes (serverless on Vercel) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Maps | Leaflet (react-leaflet v4), Google Roads API |
| Hosting | Vercel (auto-deploy from `main` branch) |
| PWA | Custom service worker, offline sync queue |
| Icons | lucide-react |
| Dates | date-fns |

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- A Supabase project with the required tables (see [DATABASE.md](DATABASE.md))

### Setup

```bash
# Clone the repository
git clone https://github.com/srksourabh/uds-hr.git
cd uds-hr

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Supabase and API keys (see Environment Variables below)

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

### Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

## Documentation Index

| Document | Description |
|----------|------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, directory layout, key patterns, data flows, deployment |
| [DATABASE.md](DATABASE.md) | All tables, columns, RLS policies, functions, storage buckets |
| [API_REFERENCE.md](API_REFERENCE.md) | Every API route with methods, auth, request/response shapes |
| [FUNCTIONS.md](FUNCTIONS.md) | All exported functions and hooks with signatures and descriptions |
| [USER_GUIDE.md](USER_GUIDE.md) | End-user guide organized by role (Employee, Manager, Admin, Super Admin) |
| [SECURITY.md](SECURITY.md) | Authentication, authorization, RLS, security headers, data protection |

## Current Stats

- **Pages:** 28 routes (3 public, 25 authenticated)
- **API Routes:** 21 route handlers
- **Database Tables:** 12 (plus 1 reference table)
- **Active Users:** 131
- **Roles:** Employee, Manager, Admin, Super Admin
