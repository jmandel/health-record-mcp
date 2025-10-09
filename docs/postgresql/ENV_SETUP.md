# Environment Configuration - Quick Reference

## What Changed

✅ Added `.env.example` file with PostgreSQL configuration templates  
✅ Updated `import-to-postgres.ts` to use environment variables  
✅ Created comprehensive `ENV_CONFIG_GUIDE.md` documentation  
✅ All import arguments now optional if set in `.env`  

## Quick Setup

```bash
# 1. Copy example file
cp .env.example .env

# 2. Edit with your settings
nano .env

# 3. Set minimum required config
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite

# 4. Run import (arguments now optional!)
bun run migrations/import-to-postgres.ts
```

## Before (Arguments Required)

```bash
# Had to type everything every time
bun run migrations/import-to-postgres.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/my_record.sqlite \
  --pg postgres://localhost:5432/family_ehr
```

## After (With .env Defaults)

```bash
# Set once in .env file
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health

# Then just run:
bun run migrations/import-to-postgres.ts
```

## Configuration Options

### Database Connection

**Option 1: Connection String (Recommended)**
```bash
DATABASE_URL=postgres://localhost:5432/family_ehr
```

**Option 2: Separate Parameters**
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=family_ehr
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
```

### Import Defaults

Make importing easier by setting defaults:

```bash
# Default source SQLite file
DEFAULT_SOURCE_DB=./data/my_record.sqlite

# Default patient
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux

# Default provider
DEFAULT_PROVIDER_NAME=Epic - Scripps Health
```

### Override Defaults

You can still override any default with command-line arguments:

```bash
# Use default patient and provider, but different source
bun run migrations/import-to-postgres.ts \
  --source ./data/other_file.sqlite

# Use default source, but different patient
bun run migrations/import-to-postgres.ts \
  --patient "Sarah Bioux"

# Override everything
bun run migrations/import-to-postgres.ts \
  --patient "Alex Bioux" \
  --provider "Stanford Health" \
  --source ./data/alex.sqlite
```

## Example Workflows

### Workflow 1: Single Default Patient

Set up .env for your primary patient:

```bash
# .env
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/emmanuel_epic.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health
```

```bash
# Import default patient (no args needed)
bun run migrations/import-to-postgres.ts

# Import other family members (override patient)
bun run migrations/import-to-postgres.ts \
  --patient "Sarah Bioux" \
  --source ./data/sarah_epic.sqlite
```

### Workflow 2: Family Import Script

Keep database in .env, script the rest:

```bash
# .env
DATABASE_URL=postgres://localhost:5432/family_ehr
```

```bash
# import_family.sh
#!/bin/bash

declare -A family=(
  ["Emmanuel"]="./data/emmanuel_epic.sqlite"
  ["Sarah"]="./data/sarah_kaiser.sqlite"
  ["Alex"]="./data/alex_stanford.sqlite"
  ["Maya"]="./data/maya_ucsf.sqlite"
  ["Lucas"]="./data/lucas_sutter.sqlite"
)

for name in "${!family[@]}"; do
  bun run migrations/import-to-postgres.ts \
    --patient "$name Bioux" \
    --source "${family[$name]}"
done
```

### Workflow 3: Multiple Environments

**Development (.env.development):**
```bash
DATABASE_URL=postgres://localhost:5432/family_ehr_dev
DEFAULT_SOURCE_DB=./data/test_data.sqlite
```

**Production (.env.production):**
```bash
DATABASE_URL=postgres://user:pass@prod-db.example.com:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite
POSTGRES_SSL=true
```

Switch environments:
```bash
# Dev
cp .env.development .env
bun run migrations/import-to-postgres.ts

# Prod
cp .env.production .env
bun run migrations/import-to-postgres.ts
```

## Security

### ✅ DO

- Copy `.env.example` to `.env` and customize
- Use strong passwords
- Restrict file permissions: `chmod 600 .env`
- Use different credentials for dev/prod
- Keep `.env` out of version control (already in `.gitignore`)

### ❌ DON'T

- Commit `.env` to git
- Share `.env` files
- Use default/weak passwords
- Store production credentials in dev environments

## Files Created

```
.env.example                    # Template for configuration
ENV_CONFIG_GUIDE.md            # Comprehensive configuration guide
migrations/.env.example        # Migration-specific example
migrations/import-to-postgres.ts  # Updated to use environment variables
```

## Documentation

- **Quick setup:** This file
- **Comprehensive guide:** `ENV_CONFIG_GUIDE.md`
- **PostgreSQL setup:** `migrations/README.md`
- **Import examples:** `migrations/QUICKSTART.md`

## Common Use Cases

### Use Case 1: "I have one patient, one provider"

```bash
# .env (set everything)
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health

# Import (no args!)
bun run migrations/import-to-postgres.ts
```

### Use Case 2: "I need to import 5 family members"

```bash
# .env (just database)
DATABASE_URL=postgres://localhost:5432/family_ehr

# Import each (override patient)
for patient in "Emmanuel" "Sarah" "Alex" "Maya" "Lucas"; do
  bun run migrations/import-to-postgres.ts \
    --patient "$patient Bioux" \
    --source "./data/${patient,,}.sqlite"
done
```

### Use Case 3: "I refresh data monthly"

```bash
# .env (set defaults for primary patient)
DATABASE_URL=postgres://localhost:5432/family_ehr
DEFAULT_SOURCE_DB=./data/my_record.sqlite
DEFAULT_PATIENT_FIRST_NAME=Emmanuel
DEFAULT_PATIENT_LAST_NAME=Bioux
DEFAULT_PROVIDER_NAME=Epic - Scripps Health

# Monthly refresh (automated cron job)
# Re-download data to ./data/my_record.sqlite
# Then simply:
bun run migrations/import-to-postgres.ts
```

### Use Case 4: "Different providers per patient"

```bash
# .env (just database)
DATABASE_URL=postgres://localhost:5432/family_ehr

# Each family member uses different provider
bun run migrations/import-to-postgres.ts \
  --patient "Emmanuel Bioux" \
  --provider "Epic - Scripps Health" \
  --source ./data/emmanuel_epic.sqlite

bun run migrations/import-to-postgres.ts \
  --patient "Sarah Bioux" \
  --provider "Kaiser Permanente" \
  --source ./data/sarah_kaiser.sqlite

bun run migrations/import-to-postgres.ts \
  --patient "Alex Bioux" \
  --provider "Stanford Health Care" \
  --source ./data/alex_stanford.sqlite
```

## Troubleshooting

**Q: "Environment variables not loading"**  
A: Make sure `.env` is in the **project root** directory (same level as `package.json`)

**Q: "Still asking for --patient argument"**  
A: Check that `DEFAULT_PATIENT_FIRST_NAME` and `DEFAULT_PATIENT_LAST_NAME` are both set in `.env`

**Q: "Connection refused"**  
A: Verify `DATABASE_URL` is correct and PostgreSQL is running (`pg_isready`)

**Q: "Can I use environment variables with the REST API too?"**  
A: Yes! The `.env` file also configures `API_PORT`, `API_HOST`, and `STATIC_SESSION_ENABLED`

## Next Steps

1. ✅ Copy `.env.example` to `.env`
2. ✅ Configure `DATABASE_URL` (minimum required)
3. ✅ Optionally set import defaults
4. ✅ Run import: `bun run migrations/import-to-postgres.ts`
5. 🎉 Enjoy simplified imports!

See `ENV_CONFIG_GUIDE.md` for detailed documentation.
