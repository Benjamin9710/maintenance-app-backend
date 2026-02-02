#!/usr/bin/env bash
set -euo pipefail

# Helper to create or update the RDS base stack for backend-app.
# Usage:
#   ./deploy-rds-base.sh [environment] [aws_profile]
#
# Examples:
#   ./deploy-rds-base.sh                          # dev + default profile
#   ./deploy-rds-base.sh dev Backend-App-Dev-Administrator
#   ./deploy-rds-base.sh prod Backend-App-Prod-Administrator
#
# Required:
#   Base stack backend-app-base-[env] must be deployed so that the DB master secrets exist.
#
# The template uses the default VPC / DB subnet group for convenience in dev.

ENVIRONMENT_NAME="${1:-dev}"
AWS_PROFILE_NAME="${2:-Backend-App-Dev-Administrator}"
STACK_NAME="backend-app-rds-base-${ENVIRONMENT_NAME}"
TEMPLATE_FILE="infra/rds-base.yaml"

export AWS_PROFILE="${AWS_PROFILE_NAME}"

PARAMS=(
  "ParameterKey=EnvironmentName,ParameterValue=${ENVIRONMENT_NAME}"
  "ParameterKey=DbName,ParameterValue=backendapp"
)

echo "Creating or updating RDS base stack '${STACK_NAME}' for environment '${ENVIRONMENT_NAME}' using template '${TEMPLATE_FILE}' with AWS profile '${AWS_PROFILE_NAME}'..."

if aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1; then
  echo "Stack '${STACK_NAME}' exists, updating..."
  aws cloudformation update-stack \
    --stack-name "${STACK_NAME}" \
    --template-body "file://${TEMPLATE_FILE}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters "${PARAMS[@]}"

  echo "Waiting for stack update to complete..."
  aws cloudformation wait stack-update-complete --stack-name "${STACK_NAME}"
else
  echo "Stack '${STACK_NAME}' does not exist, creating..."
  aws cloudformation create-stack \
    --stack-name "${STACK_NAME}" \
    --template-body "file://${TEMPLATE_FILE}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters "${PARAMS[@]}"

  echo "Waiting for stack creation to complete..."
  aws cloudformation wait stack-create-complete --stack-name "${STACK_NAME}"
fi

echo "Done. Check the CloudFormation console for stack status: ${STACK_NAME}"
