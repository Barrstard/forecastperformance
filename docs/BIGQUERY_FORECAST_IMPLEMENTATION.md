# BigQuery Forecast Data Loading Implementation

## Overview
This document outlines the implementation of BigQuery data loading for forecast datasets with enhanced business structure integration and user-configurable options.

## Key Features Implemented

### 1. Enhanced BigQuery Query Structure
The forecast query now includes a JOIN with the business structure table to provide comprehensive organizational context:

```sql
SELECT 
  forecast.orgId as orgId, 
  forecast.partitionDate as partitionDate, 
  forecast.dailyAmount as dailyAmount, 
  forecast.volumeDriver as volumeDriver, 
  forecast.volumeType as volumeType,
  forecast.volumeTypeId as volumeTypeId,
  forecast.currency as currency,
  forecast.currencyId as currencyId,
  forecast.eventRatio as eventRatio,
  forecast.volumeDriverId as volumeDriverId,
  forecast.updateDtm as updateDtm,
  forecast.linkedCategoryType as linkedCategoryType,
  forecast.includeSummarySwt as includeSummarySwt,
  bs.orgBreak2 as brand,  
  bs.orgBreak3 as region,
  bs.orgBreak4 as area,
  bs.orgBreak6 as site,
  bs.orgBreak7 as department,
  bs.orgBreak0 as category,
  bs.contextName as contextName,
  bs.orgPathTxt as orgPathTxt
FROM `{project_id}.{dataset}.vVolumeForecast` as forecast
JOIN `{project_id}.{dataset}.vBusinessStructure` as bs 
  ON forecast.orgId = bs.orgId
WHERE forecast.volumeType = '{volumeType}'
AND (partitionDate between '{startDate}' and '{endDate}')
```

### 2. User-Configurable Options

#### Volume Type Selection
- **GENERATED**: Default option for automatically created forecasts
- **ADJUSTED**: For manually modified forecasts
- Dropdown selection in the UI with clear descriptions

#### Date Range Filtering
- Start and end date inputs
- Uses the comparison model's period settings as defaults
- Validates date ranges before execution

#### Additional Filters
- Extensible filter system for future enhancements
- Supports multiple filter types (exact match, IN clauses)

### 3. Database Schema Enhancements

#### VVolumeForecast Model Updates
Added business structure fields to the forecast table:
```prisma
model VVolumeForecast {
  // ... existing fields ...
  
  // Business structure fields from join
  brand               String?   // orgBreak2
  region              String?   // orgBreak3
  area                String?   // orgBreak4
  site                String?   // orgBreak6
  department          String?   // orgBreak7
  category            String?   // orgBreak0
  contextName         String?   // contextName
  orgPathTxt          String?   // orgPathTxt
  
  // ... relations and indexes ...
}
```

#### New Indexes
- `[brand, region, area]` for hierarchical filtering
- `[site, department]` for operational filtering

### 4. API Enhancements

#### BigQuery Sync API (`/api/data-loading/bigquery-sync`)
- **Enhanced query building** with business structure JOIN
- **Volume type filtering** support
- **Preview mode** for testing connections
- **Batch processing** for large datasets
- **Error handling** and status updates

#### New Features
- **Preview functionality**: Test queries without loading data
- **Connection testing**: Validate BigQuery connectivity
- **Progress tracking**: Real-time status updates
- **Error recovery**: Graceful handling of connection issues

### 5. UI Components

#### ForecastDatasetConfig Component
- **Volume type dropdown** with GENERATED/ADJUSTED options
- **Date range selection** with validation
- **Connection testing** with preview results
- **Real-time feedback** with loading states
- **Error handling** with user-friendly messages

### 6. BigQuery Service Enhancements

#### New Methods
- `executeQuery()`: Generic query execution
- Enhanced connection testing
- Dataset auto-detection
- Table validation

#### Connection Management
- **Credential validation** before queries
- **Project ID extraction** from credentials
- **Dataset detection** with 'detail' naming convention
- **Table availability** verification

## Usage Workflow

### 1. Environment Setup
1. Create environment with BigQuery credentials
2. Test BigQuery connection
3. Verify dataset and table access

### 2. Forecast Model Creation
1. Create forecast comparison model
2. Set period start/end dates
3. Configure model parameters

### 3. Data Loading
1. Navigate to forecast model detail page
2. Go to "Forecast Models" tab
3. Click "Add Forecast Model"
4. Configure BigQuery settings:
   - Select volume type (GENERATED/ADJUSTED)
   - Set date range
   - Test connection
   - Start sync

### 4. Monitoring
1. View sync status in real-time
2. Check record counts and preview data
3. Monitor for errors and handle issues

## Technical Implementation Details

### Query Optimization
- **Indexed joins** on orgId for performance
- **Date range filtering** for efficient data retrieval
- **Batch processing** to handle large datasets
- **Connection pooling** for BigQuery client

### Data Processing
- **Type conversion** for dates and numbers
- **Null handling** for optional fields
- **Duplicate prevention** with skipDuplicates
- **Transaction management** for data integrity

### Error Handling
- **Connection timeouts** with retry logic
- **Query validation** before execution
- **Data type validation** for inserts
- **Rollback mechanisms** for failed operations

## Future Enhancements

### Planned Features
1. **Advanced filtering** by business structure fields
2. **Incremental loading** for large datasets
3. **Data validation** rules and constraints
4. **Performance monitoring** and optimization
5. **Scheduled sync** capabilities

### Potential Improvements
1. **Caching layer** for frequently accessed data
2. **Parallel processing** for multiple datasets
3. **Data quality metrics** and reporting
4. **Audit logging** for data changes
5. **Backup and recovery** procedures

## Configuration Examples

### Basic Forecast Load
```json
{
  "datasetId": "forecast_dataset_id",
  "datasetType": "forecast",
  "bigqueryConfig": {
    "volumeType": "GENERATED",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}
```

### Preview Request
```json
{
  "datasetId": "forecast_dataset_id",
  "datasetType": "forecast",
  "bigqueryConfig": {
    "volumeType": "ADJUSTED",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "preview": true
  }
}
```

## Testing

### Unit Tests
- BigQuery service methods
- Query building logic
- Data transformation functions
- Error handling scenarios

### Integration Tests
- End-to-end data loading workflow
- Connection testing with real BigQuery
- Performance testing with large datasets
- Error recovery scenarios

### Manual Testing
- UI component functionality
- Configuration validation
- Data loading accuracy
- Error message clarity

## Monitoring and Maintenance

### Health Checks
- BigQuery connection status
- Dataset availability
- Table structure validation
- Performance metrics

### Logging
- Query execution logs
- Error tracking and reporting
- Performance monitoring
- User activity tracking

### Maintenance Tasks
- Regular connection testing
- Data quality validation
- Performance optimization
- Schema updates and migrations 