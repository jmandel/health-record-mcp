#!/bin/bash

# Reset and recreate PostgreSQL database with fresh schema
# This script drops all existing objects and starts clean

set -e  # Exit on any error

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Parse connection string from environment
if [ -z "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" ]; then
    echo "Error: OUR_HEALTHS_POSTGRES_CONNECTION_STRING not set"
    echo "Please set it in your .env file or environment"
    exit 1
fi

# Parse using sed (macOS compatible)
DB_HOST=$(echo "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" | sed -n 's/.*Host=\([^;]*\).*/\1/p')
DB_PORT=$(echo "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" | sed -n 's/.*Port=\([^;]*\).*/\1/p')
DB_NAME=$(echo "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" | sed -n 's/.*Database=\([^;]*\).*/\1/p')
DB_USER=$(echo "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" | sed -n 's/.*Username=\([^;]*\).*/\1/p')
DB_PASS=$(echo "$OUR_HEALTHS_POSTGRES_CONNECTION_STRING" | sed -n 's/.*Password=\([^;]*\).*/\1/p')

# Default port if not specified
if [ -z "$DB_PORT" ]; then
    DB_PORT="5432"
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: Could not parse connection string"
    echo "Expected format: Host=...;Port=...;Database=...;Username=...;Password=...;SSL Mode=Disable"
    exit 1
fi

export PGPASSWORD=$DB_PASS

echo "=========================================="
echo "  PostgreSQL Database Reset"
echo "=========================================="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo "⚠️  WARNING: This will DROP ALL EXISTING DATA!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "🗑️  Dropping and recreating database schema..."

# Apply the schema (which includes DROP statements at the top)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/schema.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema reset successfully!"
    echo ""
    echo "📊 Database is now ready for data import"
    echo ""
    echo "Next steps:"
    echo "  1. Run the Python importer to load your FHIR data"
    echo "  2. The triggers will automatically extract values to normalized columns"
else
    echo ""
    echo "❌ Schema reset failed"
    exit 1
fi
