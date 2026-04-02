#!/bin/bash

# Fix deployment by removing existing directory and cloning fresh

set -e

echo "Fixing deployment issue..."

# Remove existing directory if it's not a git repo
if [ -d "/var/www/digital" ]; then
    echo "Removing existing /var/www/digital directory..."
    rm -rf /var/www/digital
fi

# Now run the deployment script
echo "Running deployment script..."
bash /root/deploy.sh
