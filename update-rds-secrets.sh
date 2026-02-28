#!/bin/bash

set -e

# Usage: ./update-rds-secrets.sh <environment> <profile>
# Example: ./update-rds-secrets.sh dev Club-Sports-App-Dev-Administrator

if [ $# -ne 2 ]; then
    echo "Usage: $0 <environment> <profile>"
    echo "Example: $0 dev Club-Sports-App-Dev-Administrator"
    exit 1
fi

ENVIRONMENT=$1
PROFILE=$2
STACK_NAME="backend-app-rds-base-${ENVIRONMENT}"

echo "Updating RDS stack ${STACK_NAME} to create database connection secrets..."

aws cloudformation update-stack \
    --stack-name "${STACK_NAME}" \
    --template-body file://infra/rds-base.yaml \
    --parameters ParameterKey=EnvironmentName,ParameterValue="${ENVIRONMENT}" \
    --capabilities CAPABILITY_IAM \
    --profile "${PROFILE}"

echo "Waiting for stack update to complete..."
aws cloudformation wait stack-update-complete \
    --stack-name "${STACK_NAME}" \
    --profile "${PROFILE}"

echo "RDS stack updated successfully! Database connection secrets are now managed by CloudFormation."
