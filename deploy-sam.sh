#!/usr/bin/env bash
set -euo pipefail

# Helper to build and deploy the SAM application stack for backend-app.
# Usage:
#   ./deploy-sam.sh [environment] [aws_profile]
#
# Examples:
#   ./deploy-sam.sh                          # dev + default profile
#   ./deploy-sam.sh dev Backend-App-Dev-Administrator
#   ./deploy-sam.sh prod Backend-App-Prod-Administrator
#
# Requirements:
#   - Base stack (backend-app-base-[env]) deployed with artifact bucket
#   - RDS base stack (backend-app-rds-base-[env]) deployed and healthy
#   - AWS SAM CLI installed
#
# Notes:
#   - For local builds/tests, you can run `sam build` directly; the template
#     defaults use Docker-based Postgres/Dynamo settings.
#   - This script deploys with UseRds=true so the app uses RDS + Secrets Manager
#     for DB configuration in AWS.

ENVIRONMENT_NAME="${1:-dev}"
AWS_PROFILE_NAME="${2:-Backend-App-Dev-Administrator}"
STACK_NAME="backend-app-api-${ENVIRONMENT_NAME}"
BASE_STACK_NAME="backend-app-base-${ENVIRONMENT_NAME}"

export AWS_PROFILE="${AWS_PROFILE_NAME}"

# Resolve artifact bucket from base stack output
ARTIFACT_BUCKET=$(aws cloudformation describe-stacks --stack-name "${BASE_STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucketName'].OutputValue" \
  --output text)

if [[ -z "${ARTIFACT_BUCKET}" || "${ARTIFACT_BUCKET}" == "None" ]]; then
  echo "Could not resolve ArtifactBucketName from base stack '${BASE_STACK_NAME}'" >&2
  exit 1
fi

echo "Using artifact bucket: ${ARTIFACT_BUCKET}"

echo "Building SAM application for environment '${ENVIRONMENT_NAME}'..."

sam build

echo "Deploying SAM stack '${STACK_NAME}' for environment '${ENVIRONMENT_NAME}' with AWS profile '${AWS_PROFILE_NAME}'..."

sam deploy \
  --stack-name "${STACK_NAME}" \
  --s3-bucket "${ARTIFACT_BUCKET}" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName="${ENVIRONMENT_NAME}" \
    UseRds="true" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "Done. Check the CloudFormation console for stack status: ${STACK_NAME}" 
