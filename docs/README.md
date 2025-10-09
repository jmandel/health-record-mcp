# Documentation Hub

Welcome to the Health Record MCP Server documentation. Choose your deployment mode below.

## 📚 Documentation by Mode

### 🚀 MCP Server (SQLite Mode)
The original and simplest deployment mode. Perfect for Claude Desktop integration.

- **[Original README](mcp-server/ORIGINAL_README.md)** - Complete MCP server documentation
- **Features**: Direct FHIR integration, SMART on FHIR client, SQLite storage
- **Use Cases**: Claude Desktop, local development, quick prototyping

---

### 🌐 REST API Mode
Expose MCP tools via HTTP endpoints for integration with web apps and external tools.

- **[REST API Guide](rest-api/README.md)** - Complete REST API documentation
- **[Client Example](rest-api/examples/client.ts)** - TypeScript client example
- **Features**: HTTP endpoints, CORS support, JSON API
- **Use Cases**: Web applications, multi-client access, HTTP integrations

---

### 🗄️ PostgreSQL Mode
Advanced deployment for family health data with custom schema optimized for queries.

- **[README](postgresql/README.md)** - Complete PostgreSQL guide
- **[Quick Start](postgresql/QUICKSTART.md)** - Get started in 5 minutes
- **[Architecture Comparison](postgresql/ARCHITECTURE.md)** - PostgreSQL vs MinIO vs FHIR-compliant
- **[Schema Documentation](postgresql/SCHEMA.md)** - Database schema and design
- **[Environment Config](postgresql/ENV_CONFIG.md)** - Complete configuration guide
- **[Environment Setup](postgresql/ENV_SETUP.md)** - Quick environment reference
- **[Summary](postgresql/SUMMARY.md)** - High-level overview

**Database Files**:
- **[Schema SQL](../database/postgresql/schema.sql)** - PostgreSQL schema definition
- **[Import Script](../database/postgresql/import.ts)** - Data import from SQLite
- **[Setup Script](../database/postgresql/setup.sh)** - Automated database setup
- **[Example Queries](../database/postgresql/queries.sql)** - 30+ SQL query examples

**Features**: 
- Multi-patient, multi-provider support
- Full-text search with trigram fuzzy matching
- Materialized views for performance
- JSONB hybrid storage
- Optimized for LLM queries

**Use Cases**: Family health data, complex queries, OpenWebUI integration, data analytics

---

### 🤖 OpenWebUI Integration
Natural language interface to health data using LLM agents.

- **[OpenWebUI Guide](openwebui/README.md)** - Complete integration guide
- **[Python Functions](openwebui/functions.py)** - Pre-built OpenWebUI functions

**Features**:
- Natural language health queries
- Family-wide data search
- Lab result comparisons
- Timeline and trend analysis
- Direct PostgreSQL integration

**Use Cases**: Natural language queries, family health assistant, trend analysis

---

## 🔧 Configuration

### Environment Configuration
- **[.env.example](../.env.example)** - Environment template
- **[Complete Config Guide](postgresql/ENV_CONFIG.md)** - All configuration options
- **[Quick Setup](postgresql/ENV_SETUP.md)** - Quick reference

### Database Configuration
- PostgreSQL connection strings
- Default patient/provider settings
- Source database paths
- Security and secrets management

---

## 🚀 Quick Start by Mode

### MCP Server (SQLite)
```bash
bun install
# Add to Claude Desktop config
# See docs/mcp-server/ORIGINAL_README.md
```

### REST API
```bash
bun install
bun run src/http.ts
# Server runs on http://localhost:3000
```

### PostgreSQL
```bash
bun install
./database/postgresql/setup.sh
cp .env.example .env
# Edit .env
bun run database/postgresql/import.ts
```

### OpenWebUI
```bash
# Setup PostgreSQL first
# Import functions from docs/openwebui/functions.py
# See docs/openwebui/README.md
```

---

## 📖 Core Concepts

### MCP Tools (All Modes)
- **grep_record** - Text/regex search across all data
- **query_record** - SQL queries against FHIR resources
- **eval_record** - JavaScript execution for complex analysis
- **read_resource** - Read specific FHIR resources
- **read_attachment** - Access document attachments

### FHIR Support
- Patient, Condition, Observation, Medication resources
- DocumentReference with attachment extraction
- Full FHIR R4 compatibility
- Plaintext extraction from PDFs, RTF, HTML

### Data Storage
- **SQLite**: Simple, local, FHIR-native storage
- **PostgreSQL**: Custom schema, multi-patient, optimized for queries
- **Hybrid**: JSONB storage preserves FHIR while enabling SQL queries

---

## 🏗️ Architecture

### Data Flow
1. **SMART on FHIR Client** → Fetch EHR data securely
2. **Storage Layer** → SQLite (simple) or PostgreSQL (advanced)
3. **MCP Server** → Expose tools via MCP protocol
4. **REST API** → Optional HTTP interface
5. **LLM Interface** → Claude, OpenWebUI, or custom clients

### Deployment Options
- **Local Development**: SQLite + MCP server
- **Web Integration**: SQLite/PostgreSQL + REST API
- **Family Health**: PostgreSQL + MCP/REST
- **LLM Analysis**: PostgreSQL + OpenWebUI

---

## 🔍 Finding What You Need

### I want to...
- **Get started quickly** → [MCP Server docs](mcp-server/ORIGINAL_README.md)
- **Build a web app** → [REST API docs](rest-api/README.md)
- **Store family data** → [PostgreSQL docs](postgresql/README.md)
- **Use natural language** → [OpenWebUI docs](openwebui/README.md)
- **Configure environment** → [ENV Config](postgresql/ENV_CONFIG.md)
- **Compare architectures** → [Architecture Comparison](postgresql/ARCHITECTURE.md)
- **See example queries** → [Example Queries](../database/postgresql/queries.sql)

### I'm looking for...
- **Database schema** → [Schema docs](postgresql/SCHEMA.md)
- **Import script** → [Import script](../database/postgresql/import.ts)
- **Setup automation** → [Setup script](../database/postgresql/setup.sh)
- **Python integration** → [OpenWebUI functions](openwebui/functions.py)
- **TypeScript examples** → [REST client](rest-api/examples/client.ts)
- **Environment template** → [.env.example](../.env.example)

---

## 🆘 Support & Contributing

- **Issues**: File issues on GitHub
- **Questions**: Check mode-specific documentation
- **Examples**: See `examples/` directories in each doc section
- **Contributing**: PRs welcome!

---

**[← Back to Main README](../README.md)**
