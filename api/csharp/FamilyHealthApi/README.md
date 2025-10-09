# Family Health API - C# ASP.NET Core

A REST API for accessing multi-provider family health records stored in PostgreSQL. This API exposes 22+ validated query patterns for patient data, vitals, conditions, labs, medications, and more.

## Architecture

- **Framework**: ASP.NET Core 8.0
- **Database**: PostgreSQL 16 with JSONB support
- **ORM**: ADO.NET with Npgsql (direct SQL queries)
- **API Documentation**: Swagger/OpenAPI
- **Authentication**: None (designed for local/internal use)

## Features

- ✅ All 22 PostgreSQL query patterns ported to C#
- ✅ Full-text search support
- ✅ Component-based vital signs (blood pressure)
- ✅ NULL-safe query handling
- ✅ Async/await throughout
- ✅ Swagger UI for testing
- ✅ CORS enabled for OpenWebUI integration

## Prerequisites

- **.NET 8 SDK**: [Download here](https://dotnet.microsoft.com/download/dotnet/8.0)
- **PostgreSQL 16**: With the `our-healths` database imported (see `database/postgresql/README.md`)
- **Text Editor**: Visual Studio, VS Code, or Rider

## Quick Start

### 1. Install Dependencies

```bash
cd api/csharp/FamilyHealthApi
dotnet restore
```

### 2. Configure Database Connection

Edit `appsettings.json` to match your PostgreSQL credentials:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=10.0.15.109;Port=5432;Database=our-healths;Username=your_username;Password=your_password"
  }
}
```

Or use environment variables:

```bash
export ConnectionStrings__PostgreSQL="Host=10.0.15.109;Port=5432;Database=our-healths;Username=your_username;Password=your_password"
```

### 3. Run the API

```bash
dotnet run
```

The API will start at:
- **HTTP**: `http://localhost:5000`
- **HTTPS**: `https://localhost:5001`
- **Swagger UI**: `http://localhost:5000/swagger`

## API Endpoints

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | Get all family members |
| GET | `/api/patients/{id}/summary` | Get patient summary with counts |
| GET | `/api/patients/{id}/timeline` | Get medical timeline for patient |
| GET | `/api/patients/{id}/medications` | Get all medications |
| GET | `/api/patients/{id}/immunizations` | Get all immunizations |
| GET | `/api/patients/{id}/procedures` | Get all procedures |
| GET | `/api/patients/{id}/allergies` | Get all allergies |

### Vitals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vitals/{patientId}` | Get all vital signs (last 50) |
| GET | `/api/vitals/{patientId}/latest` | Get latest vital signs (one per type) |

### Conditions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conditions` | Get all active conditions |
| GET | `/api/conditions?patientId={id}` | Get active conditions for one patient |
| GET | `/api/conditions/by-category` | Get conditions grouped by category |
| GET | `/api/conditions/search?query={term}` | Search conditions by keyword |

### Labs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labs/{patientId}` | Get all lab results (last 50) |
| GET | `/api/labs/{patientId}/latest` | Get latest labs (one per test) |
| GET | `/api/labs/{patientId}/track/{loincCode}` | Track specific lab value over time |

### Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers` | Get all medical providers |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?query={term}` | Full-text search across all resources |
| GET | `/api/search/timeline?limit={n}` | Get full family medical timeline |

## Example Requests

### Get All Patients

```bash
curl http://localhost:5000/api/patients
```

Response:
```json
[
  {
    "patientId": "e73f3aed-9e2c-45c7-a176-7ef47bebe01d",
    "fullName": "Emmanuel Bioux",
    "dateOfBirth": "1980-01-15",
    "age": 44,
    "gender": "male",
    "lastVisit": "2023-11-20T10:30:00Z",
    "resourceCount": 298
  }
]
```

### Get Latest Vitals

```bash
curl http://localhost:5000/api/vitals/e73f3aed-9e2c-45c7-a176-7ef47bebe01d/latest
```

Response:
```json
[
  {
    "patientId": "e73f3aed-9e2c-45c7-a176-7ef47bebe01d",
    "fullName": "Emmanuel Bioux",
    "code": "85354-9",
    "display": "Blood pressure",
    "value": "Diastolic: 72 mm[Hg], Systolic: 112 mm[Hg]",
    "effectiveDateTime": "2023-11-15T14:30:00Z"
  }
]
```

### Search for Diabetes Conditions

```bash
curl "http://localhost:5000/api/conditions/search?query=diabetes"
```

### Track Cholesterol Over Time

```bash
# LOINC code 2093-3 = Total Cholesterol
curl http://localhost:5000/api/labs/e73f3aed-9e2c-45c7-a176-7ef47bebe01d/track/2093-3
```

## OpenWebUI Integration

### Method 1: Function (Recommended)

Create a custom function in OpenWebUI:

```python
import requests

def get_patient_summary(patient_id: str) -> dict:
    """Get comprehensive patient summary"""
    response = requests.get(f"http://localhost:5000/api/patients/{patient_id}/summary")
    return response.json()

def search_conditions(query: str) -> list:
    """Search patient conditions"""
    response = requests.get(f"http://localhost:5000/api/conditions/search?query={query}")
    return response.json()
```

### Method 2: Direct URL Access

Configure OpenWebUI to use the API as a data source:

```yaml
api_base_url: http://localhost:5000/api
endpoints:
  - patients
  - vitals/{patientId}
  - labs/{patientId}
  - conditions/search
```

## Development

### Project Structure

```
FamilyHealthApi/
├── Controllers/          # REST API endpoints
│   ├── PatientsController.cs
│   ├── VitalsController.cs
│   ├── ConditionsController.cs
│   ├── LabsController.cs
│   ├── ProvidersController.cs
│   └── SearchController.cs
├── Models/              # DTOs and data models
│   └── HealthRecords.cs
├── Services/            # Database layer
│   ├── IHealthRecordService.cs
│   └── HealthRecordService.cs
├── Program.cs           # Application entry point
├── appsettings.json     # Configuration
└── FamilyHealthApi.csproj
```

### Adding New Endpoints

1. Add method to `IHealthRecordService.cs`:
```csharp
Task<IEnumerable<YourModel>> GetYourDataAsync(string patientId);
```

2. Implement in `HealthRecordService.cs`:
```csharp
public async Task<IEnumerable<YourModel>> GetYourDataAsync(string patientId)
{
    const string sql = "SELECT ... FROM ...";
    // Implementation
}
```

3. Add controller endpoint:
```csharp
[HttpGet("{patientId}/your-data")]
public async Task<ActionResult<IEnumerable<YourModel>>> GetYourData(string patientId)
{
    var data = await _healthRecordService.GetYourDataAsync(patientId);
    return Ok(data);
}
```

### Running Tests

```bash
# Run unit tests (when implemented)
dotnet test

# Run integration tests against PostgreSQL
dotnet test --filter Category=Integration
```

### Building for Production

```bash
# Publish self-contained executable
dotnet publish -c Release -r linux-x64 --self-contained

# Or Docker container
docker build -t family-health-api .
docker run -p 5000:5000 -e ConnectionStrings__PostgreSQL="..." family-health-api
```

## Performance

- **Query Speed**: All 22 queries complete in <100ms (tested with 298 resources)
- **Connection Pooling**: Enabled by default in Npgsql
- **Async Operations**: Full async/await for non-blocking I/O
- **Indexing**: PostgreSQL indexes on patient_id, resource_type, code_value, effective_date

## Troubleshooting

### Connection Refused

```
Npgsql.NpgsqlException: Connection refused
```

**Solution**: Verify PostgreSQL is running and connection string is correct:
```bash
psql -h 10.0.15.109 -p 5432 -U your_username -d our-healths
```

### NULL Values in Results

The API handles NULLs gracefully with:
- C# nullable types (`string?`, `int?`)
- `COALESCE` in SQL queries
- Default values where appropriate

### Missing Data

If endpoints return empty arrays, verify:
1. Database has imported data: `SELECT COUNT(*) FROM fhir_resources;`
2. Patient ID is correct (use `/api/patients` to list all)
3. Resource types exist in database

## Related Documentation

- [PostgreSQL Schema](../../../database/postgresql/SCHEMA.md)
- [Query Patterns](../../../database/postgresql/queries.sql)
- [Import Guide](../../../database/postgresql/README.md)
- [OpenWebUI Integration](../../../docs/openwebui/README.md)

## License

MIT (see LICENSE.txt)
