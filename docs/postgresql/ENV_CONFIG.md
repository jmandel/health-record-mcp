# Environment Configuration Guide

This project uses environment variables for configuration. Follow these steps to set up your environment.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your settings:**
   ```bash
   nano .env  # or use your favorite editor
   ```

3. **Set your PostgreSQL connection:**
   ```bash
   # Option 1: Use a connection string (recommended)
   DATABASE_URL=postgres://username:password@localhost:5432/family_ehr
   
   # Option 2: Use separate parameters
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=family_ehr
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_password
   ```

## Configuration Options

### PostgreSQL Database

#### Connection String (Recommended)

```bash
DATABASE_URL=postgres://username:password@localhost:5432/family_ehr
```

**Format:** `postgres://[user]:[password]@[host]:[port]/[database]`

**Examples:**
- Local database: `postgres://localhost:5432/family_ehr`
- With authentication: `postgres://postgres:mypassword@localhost:5432/family_ehr`
- Remote database: `postgres://user:pass@db.example.com:5432/family_ehr`
- With SSL: `postgres://user:pass@db.example.com:5432/family_ehr?sslmode=require`

#### Separate Parameters (Alternative)

If you prefer not to use a connection string:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=family_ehr
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
```

### Import Script Defaults

Set these to avoid typing the same arguments repeatedly:

```bash
# Default SQLite source file
DEFAULT_SOURCE_DB=./data/my_record.sqlite

# Default patient information
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux

# Default provider name
DEFAULT_PROVIDER_NAME=Epic - Scripps Health
```

**With defaults set, you can run:**
```bash
bun run migrations/import-to-postgres.ts
# No arguments needed!
```

**Override individual values:**
```bash
# Use default patient and provider, but different source
bun run migrations/import-to-postgres.ts --source ./data/other_file.sqlite

# Use default source, but different patient
bun run migrations/import-to-postgres.ts --patient "Sarah Bioux"
```

### REST API Configuration

```bash
# Port for REST API server
API_PORT=8443

# Host to bind to
API_HOST=localhost

# Bearer token for API authentication (leave empty for static session)
API_BEARER_TOKEN=

# Static session mode (for development)
STATIC_SESSION_ENABLED=true
STATIC_SESSION_DB_PATH=./data/my_record.sqlite
```

### SSL/TLS Configuration

For production databases with SSL:

```bash
POSTGRES_SSL=true
POSTGRES_SSL_CA=/path/to/ca-certificate.crt
```

## Usage Examples

### Example 1: Simple Local Setup

```bash
# .env file
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health
```

```bash
# Import with all defaults
bun run migrations/import-to-postgres.ts
```

### Example 2: Multiple Family Members

Keep one `.env` for common settings, override patient per import:

```bash
# .env file
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_PROVIDER_NAME=Epic - Scripps Health
```

```bash
# Import each family member
bun run migrations/import-to-postgres.ts \
  --patient "Emmanuel Bioux" \
  --source ./data/emmanuel_epic.sqlite

bun run migrations/import-to-postgres.ts \
  --patient "Sarah Bioux" \
  --source ./data/sarah_epic.sqlite

bun run migrations/import-to-postgres.ts \
  --patient "Alex Bioux" \
  --source ./data/alex_epic.sqlite
```

### Example 3: Remote Database

```bash
# .env file
DATABASE_URL=postgres://myuser:securepass@db.mycompany.com:5432/family_ehr?sslmode=require
DEFAULT_SOURCE_DB=./data/my_record.sqlite
```

### Example 4: Development vs Production

Create separate env files:

**`.env.development`**
```bash
DATABASE_URL=postgres://localhost:5432/family_ehr_dev
STATIC_SESSION_ENABLED=true
```

**`.env.production`**
```bash
DATABASE_URL=postgres://user:pass@prod-db.example.com:5432/family_ehr
POSTGRES_SSL=true
STATIC_SESSION_ENABLED=false
API_BEARER_TOKEN=your-secret-token
```

Load the appropriate one:
```bash
# Development
cp .env.development .env
bun run migrations/import-to-postgres.ts

# Production
cp .env.production .env
bun run migrations/import-to-postgres.ts
```

## Security Best Practices

### 1. Never Commit .env Files

The `.env` file is already in `.gitignore`. **Never** commit it to version control!

```bash
# Check that .env is ignored
git status  # Should not show .env
```

### 2. Use Strong Passwords

```bash
# Good
POSTGRES_PASSWORD=X9k#mP2$vL8@qR5n

# Bad
POSTGRES_PASSWORD=password123
```

### 3. Restrict File Permissions

```bash
chmod 600 .env
```

Only the owner can read/write.

### 4. Use Different Credentials per Environment

Don't use the same database password for development and production!

### 5. Rotate Secrets Regularly

Update passwords and tokens periodically:

```bash
# Update PostgreSQL password
psql -U postgres -c "ALTER USER postgres PASSWORD 'new_secure_password';"

# Update .env
nano .env
# Change POSTGRES_PASSWORD=new_secure_password
```

## Troubleshooting

### "Connection refused" Error

**Problem:** Can't connect to PostgreSQL

**Solutions:**
1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify connection details:
   ```bash
   psql -U postgres -d family_ehr
   ```

3. Check `DATABASE_URL` format:
   ```bash
   echo $DATABASE_URL
   ```

### "Database does not exist" Error

**Problem:** Database not created

**Solution:**
```bash
createdb family_ehr
# Or with custom user:
createdb -U postgres family_ehr
```

### "Authentication failed" Error

**Problem:** Wrong username/password

**Solutions:**
1. Check PostgreSQL user exists:
   ```bash
   psql -U postgres -c "\du"
   ```

2. Reset password:
   ```bash
   psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
   ```

3. Update `.env` with correct credentials

### "SSL connection required" Error

**Problem:** Production database requires SSL

**Solution:**
```bash
# In .env
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
POSTGRES_SSL=true
```

### Environment Variables Not Loading

**Problem:** .env file not being read

**Solutions:**
1. Verify file exists:
   ```bash
   ls -la .env
   ```

2. Check file location (must be in project root)

3. Restart your terminal/shell

4. Manually load:
   ```bash
   export $(cat .env | xargs)
   ```

## Complete Example Setup

Here's a complete setup from scratch:

```bash
# 1. Copy example
cp .env.example .env

# 2. Edit with your settings
cat > .env << 'EOF'
# PostgreSQL
DATABASE_URL=postgres://localhost:5432/family_ehr

# Defaults
DEFAULT_SOURCE_DB=./data/my_record.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health

# API
API_PORT=8443
STATIC_SESSION_ENABLED=true
EOF

# 3. Secure the file
chmod 600 .env

# 4. Create database
createdb family_ehr

# 5. Run migration
psql -d family_ehr -f migrations/001_create_pgsql_schema.sql

# 6. Import data (using defaults from .env)
bun run migrations/import-to-postgres.ts

# 7. Start REST API
bun run src/rest-api.ts
```

Done! 🎉

## Reference: All Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | `postgres://localhost:5432/family_ehr` | PostgreSQL connection string |
| `POSTGRES_HOST` | No | `localhost` | Database host |
| `POSTGRES_PORT` | No | `5432` | Database port |
| `POSTGRES_DB` | No | `family_ehr` | Database name |
| `POSTGRES_USER` | No | `postgres` | Database user |
| `POSTGRES_PASSWORD` | No | (empty) | Database password |
| `POSTGRES_SSL` | No | `false` | Enable SSL |
| `POSTGRES_SSL_CA` | No | - | Path to CA certificate |
| `DEFAULT_SOURCE_DB` | No | `./data/my_record.sqlite` | Default SQLite source |
| `DEFAULT_PATIENT_FIRST_NAME` | No | (empty) | Default patient first name |
| `DEFAULT_PATIENT_LAST_NAME` | No | (empty) | Default patient last name |
| `DEFAULT_PROVIDER_NAME` | No | (empty) | Default provider name |
| `API_PORT` | No | `8443` | REST API port |
| `API_HOST` | No | `localhost` | REST API host |
| `API_BEARER_TOKEN` | No | (empty) | API authentication token |
| `STATIC_SESSION_ENABLED` | No | `true` | Enable static session mode |
| `STATIC_SESSION_DB_PATH` | No | `./data/my_record.sqlite` | Static session DB path |

\* Either `DATABASE_URL` or the individual `POSTGRES_*` variables must be set.
