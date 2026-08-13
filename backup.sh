#!/bin/bash
# ==============================================================================
# Prowexa WhatsApp Platform - Automated Database Backup Script
# ==============================================================================
# This script creates a compressed backup of the PostgreSQL database and 
# deletes backups older than 30 days.
#
# USAGE (Cron Job):
# 0 2 * * * /path/to/backup.sh >> /var/log/prowexa-backup.log 2>&1
# ==============================================================================

# Load environment variables
source .env

# Configuration
BACKUP_DIR="/var/backups/prowexa_db"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-prowexa_whatsapp}
CONTAINER_NAME="prowexa_postgres"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup file name
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

echo "[$(date)] Starting database backup..."

# Execute pg_dump inside the docker container and gzip the output
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE"
else
    echo "[$(date)] Backup FAILED!"
    exit 1
fi

# Cleanup: Delete backups older than 30 days
echo "[$(date)] Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +30 -exec rm {} \;

echo "[$(date)] Backup process finished."
