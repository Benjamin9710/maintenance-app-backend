#!/bin/bash

set -e

# Usage: ./setup-full-infrastructure.sh <environment> <profile>
# Example: ./setup-full-infrastructure.sh dev Club-Sports-App-Dev-Administrator

if [ $# -ne 2 ]; then
    echo "Usage: $0 <environment> <profile>"
    echo "Example: $0 dev Club-Sports-App-Dev-Administrator"
    exit 1
fi

ENVIRONMENT=$1
PROFILE=$2

echo "Setting up full backend infrastructure for environment: ${ENVIRONMENT}"
echo "Using AWS profile: ${PROFILE}"
echo ""

# Step 1: Deploy base account infrastructure (IAM roles, basic secrets)
echo "Step 1: Deploying base account infrastructure..."
./deploy-base-stack.sh "${ENVIRONMENT}" "${PROFILE}"
echo "✓ Base infrastructure deployed"
echo ""

# Step 2: Deploy RDS infrastructure (database + connection secrets)
echo "Step 2: Deploying RDS infrastructure..."
./deploy-rds-base.sh "${ENVIRONMENT}" "${PROFILE}"
echo "✓ RDS infrastructure deployed"
echo ""

# Step 3: Update RDS stack to create database connection secrets
echo "Step 3: Creating database connection secrets..."
./update-rds-secrets.sh "${ENVIRONMENT}" "${PROFILE}"
echo "✓ Database connection secrets created"
echo ""

# Step 4: Deploy SAM application
echo "Step 4: Deploying SAM application..."
./deploy-sam.sh "${ENVIRONMENT}" "${PROFILE}"
echo "✓ SAM application deployed"
echo ""

echo "🎉 Full infrastructure setup complete!"
echo ""
echo "Next steps:"
echo "1. Update frontend environment variables with deployed stack outputs"
echo "2. Test the application endpoints"
echo "3. Run E2E tests to verify functionality"
