#!/bin/bash
# Script to reset database by deleting and recreating it

echo "⚠️  WARNING: This will delete your database and all data!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

DB_FILE="backend.db"

if [ -f "$DB_FILE" ]; then
    echo "Deleting $DB_FILE..."
    rm "$DB_FILE"
    echo "✅ Database deleted"
else
    echo "ℹ️  Database file not found, proceeding..."
fi

# Also delete any SQLite journal files
if [ -f "${DB_FILE}-journal" ]; then
    rm "${DB_FILE}-journal"
    echo "✅ Journal file deleted"
fi

echo ""
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "✅ Database reset complete!"
echo "You can now start the server with: uvicorn app.main:app --reload"

