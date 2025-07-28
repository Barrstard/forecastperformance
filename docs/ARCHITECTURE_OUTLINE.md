# Sales Forecast Comparison App - Architecture Detail Outline

## 🏗️ System Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Database      │    │   BigQuery      │
│   (Zustand)     │    │   (PostgreSQL)  │    │   (Data Source) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Prisma ORM    │    │   UKG Dimensions│
│   (shadcn/ui)   │    │   (Connection   │    │   (Orchestration│
└─────────────────┘    │   Pooling)      │    │   & Metadata)   │
                       └─────────────────┘    └─────────────────┘
```

## 📁 Application Structure

### 1. Frontend Architecture (Next.js 14+ App Router)

#### Directory Structure
```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── bigquery/             # BigQuery integration
│   │   │   ├── connect/          # Connection testing
│   │   │   ├── extract/          # Data extraction
│   │   │   └── sync/             # Batch synchronization
│   │   ├── dimensions/           # UKG Dimensions API
│   │   │   └── connect/          # Dimensions connection
│   │   ├── environments/         # Environment management
│   │   │   ├── [id]/             # Individual environment
│   │   │   └── route.ts          # CRUD operations
│   │   ├── forecasts/            # Forecast management
│   │   │   └── runs/             # Forecast runs
│   │   └── ukg/                  # UKG Pro integration
│   │       └── batch-jobs/       # Job orchestration
│   ├── dashboard/                # Dashboard pages
│   │   └── page.tsx              # Main dashboard
│   ├── environments/             # Environment pages
│   │   ├── [id]/                 # Environment details
│   │   │   └── edit/             # Edit environment
│   │   ├── new/                  # Create environment
│   │   └── page.tsx              # Environment listing
│   ├── forecasts/                # Forecast pages
│   │   └── page.tsx              # Forecast management
│   ├── batch-jobs/               # Job monitoring
│   │   └── page.tsx              # Batch job status
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard widgets
│   ├── layout/                   # Layout components
│   ├── providers/                # Context providers
│   └── theme-provider.tsx        # Theme management
├── lib/                          # Utility libraries
│   ├── bigquery.ts               # BigQuery service
│   ├── dimensions-api.ts         # Dimensions API
│   ├── forecast-analysis.ts      # Analysis algorithms
│   ├── prisma.ts                 # Database client
│   └── utils.ts                  # Utility functions
├── stores/                       # State management
│   ├── environment-store.ts      # Environment state
│   └── forecast-store.ts         # Forecast state
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript definitions
└── styles/                       # Additional styles
```

## 🔧 Core Services Architecture

### 1. BigQuery Service (`lib/bigquery.ts`)

#### Architecture Pattern
```typescript
class BigQueryService {
  private client: BigQuery | null = null
  private projectId: string = ''
  private dataset: string = 'superretailgroup_detail'
  
  // Dynamic connection with credential validation
  async connectWithCredentials(credentials: BigQueryCredentials)
  
  // Connection testing and dataset detection
  async testConnection(): Promise<BigQueryConnectionResult>
  
  // Data extraction methods
  async queryVolumeForecast(runId: string, filters?: QueryFilters)
  async queryActualVolume(runId: string, filters?: QueryFilters)
  async queryBusinessStructure(orgIds?: number[])
  async queryCalendarDate(dateRange?: DateRange)
  async queryFiscalCalendar(dateRange?: DateRange)
}
```

#### Key Features
- **Dynamic Project ID**: Extracted from uploaded JSON credentials
- **Fixed Dataset**: Uses `superretailgroup_detail` dataset
- **Connection Validation**: Tests connectivity and table availability
- **Error Handling**: Comprehensive error messages and suggestions
- **Query Optimization**: Date range and organization filtering

### 2. Database Architecture (Prisma Schema)

#### Core Models
```sql
-- Environment Management
Environment {
  id: String (CUID)
  name: String (unique)
  bigqueryProjectId: String
  bigqueryDataset: String
  bigqueryCredentials: Json (encrypted)
  ukgProUrl: String?
  ukgProClientId: String?
  ukgProClientSecret: String?
  ukgProAppKey: String?
  ukgProUsername: String?
  ukgProPassword: String?
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}

-- Forecast Management
ForecastRun {
  id: String (CUID)
  environmentId: String (FK)
  modelId: String (FK)
  dimensionsJobId: String?
  bigqueryProjectId: String
  startTime: DateTime
  endTime: DateTime?
  status: RunStatus (PENDING|RUNNING|COMPLETED|FAILED|CANCELLED)
  dataPoints: Int?
  metadata: Json?
  createdAt: DateTime
}

-- BigQuery Data Models (exact mapping)
VVolumeForecast {
  id: String (CUID)
  runId: String (FK)
  orgId: Int
  partitionDate: DateTime
  volumeType: String
  volumeTypeId: Int
  currency: String
  currencyId: Int
  eventRatio: Float
  dailyAmount: Float
  volumeDriver: String
  volumeDriverId: Int
  updateDtm: DateTime
  linkedCategoryType: String
  includeSummarySwt: Boolean
  syncedAt: DateTime
}

VActualVolume {
  id: String (CUID)
  runId: String (FK)
  orgId: Int
  partitionDate: DateTime
  dailyAmount: Float
  volumeDriverId: Int
  posLabel: String
  posLabelId: Int
  updateDtm: DateTime
  linkedCategoryType: String
  includeSummarySwt: Boolean
  syncedAt: DateTime
}

VBusinessStructure {
  orgId: Int (PK)
  orgBreak1: String?  -- 25 organization break levels
  orgBreak2: String?
  ...
  orgBreak25: String?
  updateDtm: DateTime
  syncedAt: DateTime
}

VCalendarDate {
  id: String (CUID)
  calendarDate: DateTime (unique)
  calendarYear: Int
  calendarMonth: Int
  calendarDay: Int
  calendarWeek: Int
  calendarQuarter: Int
  dayOfWeek: Int
  dayOfYear: Int
  isWeekend: Boolean
  isHoliday: Boolean
  holidayName: String?
  syncedAt: DateTime
}

VFiscalCalendar {
  id: String (CUID)
  fiscalDate: DateTime (unique)
  fiscalYear: Int
  fiscalMonth: Int
  fiscalDay: Int
  fiscalWeek: Int
  fiscalQuarter: Int
  fiscalPeriod: Int
  syncedAt: DateTime
}
```

#### Performance Optimizations
- **Composite Indexes**: For large dataset queries
- **Date Range Indexing**: Optimized for time-based filtering
- **Organization Filtering**: Efficient org hierarchy queries
- **Connection Pooling**: Prisma connection management

### 3. State Management Architecture (Zustand)

#### Environment Store (`stores/environment-store.ts`)
```typescript
interface EnvironmentState {
  environments: Environment[]
  currentEnvironmentId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setEnvironments: (environments: Environment[]) => void
  addEnvironment: (environment: Environment) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  setCurrentEnvironment: (id: string | null) => void
  
  // Computed
  currentEnvironment: Environment | null
  activeEnvironments: Environment[]
}
```

#### Key Features
- **Persistence**: Local storage for environment preferences
- **Global State**: Accessible across all components
- **Type Safety**: Full TypeScript integration
- **Error Handling**: Centralized error management

### 4. API Architecture (Next.js API Routes)

#### RESTful Endpoints
```
GET    /api/environments          # List environments
POST   /api/environments          # Create environment
GET    /api/environments/[id]     # Get environment
PUT    /api/environments/[id]     # Update environment
DELETE /api/environments/[id]     # Delete environment

POST   /api/bigquery/connect      # Test BigQuery connection
POST   /api/bigquery/extract      # Extract data from BigQuery
POST   /api/bigquery/sync         # Sync data to PostgreSQL

POST   /api/dimensions/connect    # Test Dimensions connection
GET    /api/dimensions/models     # Get available models
POST   /api/dimensions/jobs       # Create forecast job

GET    /api/forecasts/runs        # List forecast runs
POST   /api/forecasts/runs        # Create forecast run
GET    /api/forecasts/runs/[id]   # Get forecast run details

GET    /api/ukg/batch-jobs        # List batch jobs
GET    /api/ukg/batch-jobs/[id]   # Get job status
GET    /api/ukg/batch-jobs/stats  # Get job statistics
```

#### API Patterns
- **Error Handling**: Consistent error responses
- **Validation**: Zod schema validation
- **Type Safety**: Full TypeScript integration
- **Authentication**: Future-ready for auth middleware

## 🎨 UI/UX Architecture

### 1. Component Architecture

#### Design System
- **shadcn/ui**: Primary component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon system
- **Framer Motion**: Animation library
- **Recharts**: Data visualization

#### Component Hierarchy
```
Layout Components
├── MainLayout
│   ├── AppSidebar (V0-based navigation)
│   ├── Header (environment switcher)
│   └── Content Area
│       ├── Dashboard Pages
│       │   ├── Executive Dashboard
│       │   ├── Operational Dashboard
│       │   └── Analytics Dashboard
│       ├── Management Pages
│       │   ├── Environment Management
│       │   ├── Forecast Management
│       │   └── Batch Job Monitoring
│       └── Form Components
│           ├── Environment Configuration
│           ├── Forecast Run Creation
│           └── Credential Upload
```

### 2. Dashboard Architecture

#### Executive Dashboard
- **High-Level KPIs**: Overall forecast accuracy
- **Model Comparison**: Side-by-side performance
- **Trend Analysis**: Historical accuracy trends
- **Department Overview**: Organization-level insights

#### Operational Dashboard
- **Real-Time Monitoring**: Live job status
- **Data Pipeline Status**: Sync progress indicators
- **Error Alerts**: System health monitoring
- **Performance Metrics**: Query performance tracking

#### Analytics Dashboard
- **Bell Curve Distribution**: Accuracy distribution charts
- **Deep-Dive Analysis**: Detailed model comparisons
- **Statistical Testing**: Significance analysis
- **Custom Filters**: Advanced data exploration

### 3. Form Architecture

#### Validation Pattern
```typescript
// Zod Schema Definition
const environmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bigqueryCredentials: z.object({
    project_id: z.string().min(1, "Project ID is required"),
    // ... other credential fields
  }),
  // ... other fields
})

// React Hook Form Integration
const form = useForm<EnvironmentFormData>({
  resolver: zodResolver(environmentSchema),
  defaultValues: {
    // ... default values
  }
})
```

#### Form Features
- **Real-time Validation**: Instant feedback
- **File Upload**: Secure credential handling
- **Connection Testing**: Live validation
- **Error Recovery**: Graceful error handling

## 🔄 Data Flow Architecture

### 1. Forecast Pipeline Flow

```
1. User Configuration
   ├── Environment Setup (BigQuery credentials)
   ├── Model Selection (UKG Dimensions)
   └── Forecast Parameters

2. Job Orchestration
   ├── UKG Dimensions Job Creation
   ├── Job Status Monitoring
   └── Completion Notification

3. Data Extraction
   ├── BigQuery Data Extraction
   ├── Data Transformation
   └── PostgreSQL Loading

4. Analysis Processing
   ├── Accuracy Calculation
   ├── Statistical Analysis
   └── Comparison Generation

5. Visualization
   ├── Chart Generation
   ├── Dashboard Updates
   └── Real-time Monitoring
```

### 2. Data Synchronization Flow

```
BigQuery → PostgreSQL Sync Process
├── Connection Validation
├── Table Discovery
├── Incremental Sync
│   ├── Date Range Filtering
│   ├── Organization Filtering
│   └── Batch Processing
├── Data Transformation
├── Index Updates
└── Sync Status Tracking
```

### 3. Real-Time Updates Flow

```
WebSocket/SSE Architecture
├── Job Status Updates
├── Data Sync Progress
├── Error Notifications
└── Dashboard Refresh
```

## 🔒 Security Architecture

### 1. Credential Security
- **Encryption**: Credentials encrypted at rest
- **Secure Storage**: Database-level encryption
- **Access Control**: Environment-based isolation
- **Audit Logging**: Credential access tracking

### 2. Data Security
- **Input Validation**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization
- **CSRF Protection**: Form token validation

### 3. API Security
- **Rate Limiting**: Request throttling
- **Authentication**: Future JWT implementation
- **Authorization**: Role-based access control
- **HTTPS**: Secure communication

## 📊 Performance Architecture

### 1. Database Performance
- **Connection Pooling**: Prisma connection management
- **Query Optimization**: Composite indexes
- **Partitioning**: Monthly data partitioning
- **Caching**: Redis for frequently accessed data

### 2. Frontend Performance
- **Code Splitting**: Dynamic imports
- **Lazy Loading**: Component-level optimization
- **Caching**: React Query caching
- **Bundle Optimization**: Tree shaking

### 3. BigQuery Performance
- **Query Optimization**: Efficient SQL patterns
- **Date Filtering**: Time-based query optimization
- **Organization Filtering**: Hierarchical data access
- **Batch Processing**: Large dataset handling

## 🚀 Scalability Architecture

### 1. Horizontal Scaling
- **Stateless API**: No server-side state
- **Load Balancing**: Multiple API instances
- **Database Sharding**: Future partitioning strategy
- **CDN Integration**: Static asset delivery

### 2. Vertical Scaling
- **Resource Optimization**: Memory and CPU usage
- **Database Tuning**: PostgreSQL optimization
- **Caching Strategy**: Multi-level caching
- **Background Jobs**: Queue-based processing

### 3. Data Scaling
- **Incremental Sync**: Delta-based updates
- **Archive Strategy**: Historical data management
- **Compression**: Data storage optimization
- **Backup Strategy**: Data protection

## 🔧 Development Architecture

### 1. Development Workflow
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Git Workflow**: Feature branch development

### 2. Testing Strategy
- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: User workflow testing
- **Performance Tests**: Load testing

### 3. Deployment Architecture
- **Environment Management**: Dev/Staging/Production
- **CI/CD Pipeline**: Automated deployment
- **Monitoring**: Application performance monitoring
- **Logging**: Centralized log management

## 📈 Monitoring & Observability

### 1. Application Monitoring
- **Performance Metrics**: Response times, throughput
- **Error Tracking**: Exception monitoring
- **User Analytics**: Usage patterns
- **Health Checks**: System status monitoring

### 2. Data Pipeline Monitoring
- **Sync Status**: BigQuery sync monitoring
- **Job Status**: UKG Dimensions job tracking
- **Data Quality**: Validation monitoring
- **Performance**: Query performance tracking

### 3. Infrastructure Monitoring
- **Database Performance**: PostgreSQL monitoring
- **API Performance**: Endpoint monitoring
- **Resource Usage**: CPU, memory, disk monitoring
- **Network Performance**: Latency monitoring

## 🎯 Success Metrics & KPIs

### 1. Performance Metrics
- **Dashboard Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Data Sync Success Rate**: > 99%
- **Query Performance**: < 5 seconds for large datasets

### 2. User Experience Metrics
- **Error Rate**: < 1%
- **Uptime**: > 99.9%
- **User Satisfaction**: > 4.5/5
- **Feature Adoption**: > 80%

### 3. Business Metrics
- **Forecast Accuracy**: Measured improvement
- **Time to Insight**: Reduced analysis time
- **Data Quality**: Improved data consistency
- **Cost Efficiency**: Reduced manual effort

This architecture provides a solid foundation for handling massive datasets (2.8+ billion data points) while maintaining enterprise-grade performance, security, and scalability requirements. 