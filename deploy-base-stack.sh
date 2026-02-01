#!/usr/bin/env bash
set -euo pipefail

# Simple helper to deploy the base account-level stack for backend-app.
# Usage:
#   ./deploy-base-stack.sh [environment] [aws_profile]
#
# Examples:
#   ./deploy-base-stack.sh                          # dev + default profile
#   ./deploy-base-stack.sh dev Backend-App-Dev-Administrator
#   ./deploy-base-stack.sh prod Backend-App-Prod-Administrator
#
# Requirements:
#   - AWS CLI configured with credentials for the target account (e.g. via AWS_PROFILE or env vars)
#   - infra/base-account.yaml present in this repo

ENVIRONMENT_NAME="${1:-dev}"
AWS_PROFILE_NAME="${2:-Backend-App-Dev-Administrator}"
STACK_NAME="backend-app-base-${ENVIRONMENT_NAME}"
TEMPLATE_FILE="infra/base-account.yaml"

PARAMS=(
  "ParameterKey=EnvironmentName,ParameterValue=${ENVIRONMENT_NAME}"
)

echo "Creating or updating base stack '${STACK_NAME}' for environment '${ENVIRONMENT_NAME}' using template '${TEMPLATE_FILE}' with AWS profile '${AWS_PROFILE_NAME}'..."

export AWS_PROFILE="${AWS_PROFILE_NAME}"

if aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1; then
  echo "Stack '${STACK_NAME}' exists, updating..."
  aws cloudformation update-stack \
    --stack-name "${STACK_NAME}" \
    --template-body "file://${TEMPLATE_FILE}" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_NAMED_IAM

  echo "Waiting for stack update to complete..."
  aws cloudformation wait stack-update-complete --stack-name "${STACK_NAME}"
else
  echo "Stack '${STACK_NAME}' does not exist, creating..."
  aws cloudformation create-stack \
    --stack-name "${STACK_NAME}" \
    --template-body "file://${TEMPLATE_FILE}" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_NAMED_IAM

  echo "Waiting for stack creation to complete..."
  aws cloudformation wait stack-create-complete --stack-name "${STACK_NAME}"
fi

echo "Done. Check the CloudFormation console for stack status: ${STACK_NAME}"
