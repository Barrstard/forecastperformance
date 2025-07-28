# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Development
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database Operations
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma migrate dev # Create and apply migrations
npx prisma studio    # Open Prisma Studio (database GUI)

# Database Connection Check
node scripts/check-db.js  # Verify database connection
```

## Architecture Overview

This is a Next.js 14+ App Router application for comparing sales forecast accuracy across multiple ML models. It handles massive datasets (2.8+ billion data points) with real-time BigQuery integration and UKG Dimensions orchestration.

### Tech Stack
- **Framework**: Next.js 14+ with App Router (TypeScript only)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui components with Tailwind CSS only
- **State**: Zustand for global state, React Query for server state
- **Data Sources**: Google BigQuery, UKG Dimensions API
- **Icons**: Lucide React only
- **Charts**: Recharts only

### Key Architecture Patterns

#### Dynamic BigQuery Configuration
- Project IDs are extracted from uploaded JSON credentials (never hardcoded)
- BigQuery service pattern: `lib/bigquery.ts` handles dynamic connection setup

#### Database Schema Design
- Handles massive datasets with proper indexing
- Models map directly to BigQuery table structures
- Support for 25 organization hierarchy levels (orgBreak1-25)
- All BigQuery data includes `syncedAt` timestamps

#### Component Structure
- V0 design components in root are DESIGN REFERENCE ONLY
- Build functional components using shadcn/ui that match V0 aesthetics
- All forms use React Hook Form + Zod validation
- No inline styles - Tailwind classes only

### Core Services

#### BigQueryService (`lib/bigquery.ts`)
- Handles dynamic project ID extraction from credentials
- Tests connections and validates table availability
- Executes queries with proper date/organization filtering

#### Environment Management
- Secure credential storage with encryption
- Multi-environment support with global state management
- Environment switching via header component

#### Forecast Pipeline
1. Trigger forecast in UKG Dimensions (metadata only)
2. Extract results from BigQuery (data source)
3. Transform/load into PostgreSQL
4. Generate accuracy comparisons

### Database Models (Key Tables)

#### Core Management
- `Environment`: Multi-tenant environment configuration
- `ForecastComparisonModel`: Hierarchical comparison structure
- `ForecastDataset`/`ActualsDataset`: Dataset management

#### BigQuery Data Models (Exact Mapping)
- `VVolumeForecast`: Forecast data with business structure JOIN
- `VActualVolume`: Actual performance data with business structure JOIN
- `VBusinessStructure`: 25-level organization hierarchy
- `VCalendarDate`/`VFiscalCalendar`: Date dimension tables

### Required BigQuery Tables
All queries target these specific tables in `superretailgroup_detail` dataset:
- `vVolumeForecast` - Main forecast data
- `vActualVolume` - Actual performance data  
- `vBusinessStructure` - Organization hierarchy
- `vCalendarDate` - Standard calendar
- `vFiscalCalendar` - Fiscal calendar

### State Management

#### Zustand Stores
- `environment-store.ts`: Environment selection and management
- `forecast-store.ts`: Forecast run state management
- Stores persist relevant data to localStorage

### API Patterns

All API routes follow RESTful conventions:
- `/api/environments` - Environment CRUD
- `/api/bigquery/connect` - Connection testing
- `/api/bigquery/extract` - Data extraction
- `/api/forecast-comparison-models` - Comparison management

### Key Rules & Constraints

#### NEVER DO
- Hardcode BigQuery project IDs (always extract from credentials)
- Use UI libraries other than shadcn/ui
- Create inline CSS or styled-components (Tailwind only)
- Skip TypeScript types (100% TypeScript coverage required)
- Store credentials unencrypted

#### Database Performance
- Use connection pooling (Prisma handles this)
- Include proper indexes for massive dataset queries
- Filter by date ranges and orgId for performance
- Use composite indexes for complex queries

#### BigQuery Integration
- Always validate credentials before queries
- Use parameterized queries with date/org filtering
- Handle connection timeouts gracefully
- Extract project_id from credentials dynamically

### Current Implementation Status

The application has solid foundation (~60% complete):
- ✅ Core infrastructure and services
- ✅ Database schema and API routes  
- ✅ Environment management system
- ✅ Basic UI components and layouts
- ⏳ Dashboard visualizations and charts
- ⏳ Complete forecast comparison pipeline

When working on this codebase, prioritize performance, security, and reliability over flashy features. The V0 design components provide visual direction but must be rebuilt as fully functional components with proper error handling and data management.