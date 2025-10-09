#!/bin/bash
#
# Quick setup script for PostgreSQL family EHR database
# Run this to set up a local PostgreSQL database for testing
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PostgreSQL Family EHR Database Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo ""
    echo "Install PostgreSQL:"
    echo "  macOS:   brew install postgresql@16"
    echo "  Ubuntu:  sudo apt install postgresql-16"
    echo "  Fedora:  sudo dnf install postgresql-server"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is installed${NC}"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running${NC}"
    echo "Starting PostgreSQL..."
    
    # Try to start based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@16 || brew services start postgresql
    elif [[ -f /etc/systemd/system/postgresql.service ]]; then
        sudo systemctl start postgresql
    else
        echo -e "${RED}Could not start PostgreSQL automatically${NC}"
        echo "Please start PostgreSQL manually and run this script again"
        exit 1
    fi
    
    sleep 2
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Database name
DB_NAME="family_ehr"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb "$DB_NAME" 2>/dev/null || true
    else
        echo "Using existing database"
    fi
fi

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Creating database '$DB_NAME'..."
    createdb "$DB_NAME"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database exists${NC}"
fi

# Run migration
echo ""
echo "Running migration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
psql -d "$DB_NAME" -f "$SCRIPT_DIR/schema.sql" > /dev/null 2>&1

echo -e "${GREEN}✓ Schema created${NC}"

# Set environment variable
echo ""
echo -e "${BLUE}Setting up environment...${NC}"
export DATABASE_URL="postgres://localhost:5432/$DB_NAME"

# Check if .env exists
if [ -f .env ]; then
    if grep -q "DATABASE_URL" .env; then
        echo -e "${YELLOW}⚠️  DATABASE_URL already in .env${NC}"
    else
        echo "DATABASE_URL=$DATABASE_URL" >> .env
        echo -e "${GREEN}✓ Added DATABASE_URL to .env${NC}"
    fi
else
    echo "DATABASE_URL=$DATABASE_URL" > .env
    echo -e "${GREEN}✓ Created .env with DATABASE_URL${NC}"
fi

# Show sample data
echo ""
echo "Checking sample data..."
PROVIDER_COUNT=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM medical_providers;" 2>/dev/null | xargs)
PATIENT_COUNT=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM patients;" 2>/dev/null | xargs)

echo -e "${GREEN}✓ Sample data loaded:${NC}"
echo "  - $PROVIDER_COUNT medical providers"
echo "  - $PATIENT_COUNT patients"

# Install dependencies
echo ""
echo "Installing Node.js dependencies..."
if command -v bun &> /dev/null; then
    bun install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed (using bun)${NC}"
elif command -v npm &> /dev/null; then
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed (using npm)${NC}"
else
    echo -e "${YELLOW}⚠️  No package manager found (bun or npm needed)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Database connection:"
echo -e "  ${YELLOW}$DATABASE_URL${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Import your EHR data:"
echo -e "     ${YELLOW}bun run migrations/import-to-postgres.ts \\${NC}"
echo -e "       ${YELLOW}--patient \"Emmanuel Bioux\" \\${NC}"
echo -e "       ${YELLOW}--provider \"Epic - Scripps Health\" \\${NC}"
echo -e "       ${YELLOW}--source ./data/my_record.sqlite${NC}"
echo ""
echo "  2. Try some example queries:"
echo -e "     ${YELLOW}psql -d $DB_NAME -f migrations/example-queries.sql${NC}"
echo ""
echo "  3. Connect with psql:"
echo -e "     ${YELLOW}psql -d $DB_NAME${NC}"
echo ""
echo "  4. View the README:"
echo -e "     ${YELLOW}cat migrations/README.md${NC}"
echo ""
