# Backend App

Backend service built with Node.js 22, TypeScript, AWS SAM (Lambda + HttpApi), Postgres, and Jest. Lambdas are bundled with esbuild via SAM's NodejsNpmEsbuildBuilder.

## Prerequisites

- Node.js 22+
- npm
- Docker + Docker Compose
- AWS SAM CLI (for local Lambda/API testing)

## Installation

From the project root:

```bash
npm install
```

## Local Postgres

This project uses Postgres via Docker for local development.

### Start Postgres

```bash
docker-compose up -d postgres
```

This will start a Postgres 16 container with:

- Host: `localhost`
- Port: `5432`
- Database: `backend_app`
- User: `backend_app`
- Password: `backend_app`

You can verify connectivity with:

```bash
psql postgres://backend_app:backend_app@localhost:5432/backend_app
```

If you ever need a clean database, run:

```bash
docker-compose down -v
docker-compose up -d postgres
```

## Local DynamoDB

For local development, DynamoDB Local runs in Docker.

### Start DynamoDB Local

```bash
docker-compose up -d dynamodb
```

This starts DynamoDB Local on:

- Host: `localhost`
- Port: `9000`

Lambdas talk to it via the `DYNAMO_ENDPOINT` environment variable (set to `http://host.docker.internal:9000` in `template.yaml`).

## Running tests

```bash
npm test
```

This runs Jest tests (TypeScript) under `test/`.

## Linting

```bash
npm run lint
```

ESLint is configured for TypeScript, Jest, and Prettier.

## Running the API locally (SAM + esbuild)

Lambdas are defined in `template.yaml` and bundled from TypeScript sources using SAM's esbuild integration.

To build and start the local API:

```bash
npm run sam:start
```

This will:

1. Compile TypeScript (via `tsc`).
2. Run `sam build` using esbuild for each Lambda.
3. Start `sam local start-api` using the built template `.aws-sam/build/template.yaml`.

SAM will start an HTTP server on `http://127.0.0.1:3000`.

### Health endpoints

Once SAM is running, you can call:

- Basic health check:

  ```bash
  curl http://127.0.0.1:3000/health
  ```

- Database health check:

  ```bash
  curl http://127.0.0.1:3000/db/health
  ```

- DynamoDB health check:

  ```bash
  curl http://127.0.0.1:3000/dynamo/health
  ```

````

## Environment configuration

Lambda functions receive database configuration via environment variables defined in `template.yaml` and read by `src/config/env.ts`:

- `DB_HOST` (defaults to `host.docker.internal` in SAM template)
- `DB_PORT` (default `5432`)
- `DB_NAME` (default `backend_app`)
- `DB_USER` (default `backend_app`)
- `DB_PASSWORD` (default `backend_app`)
- `DB_SSL` (default `false`)

The shared Postgres client lives in `src/db/postgres/client.ts` and is used by Lambda handlers such as `src/handlers/dbHealth.ts`.

DynamoDB configuration is also driven by env vars:

- `DYNAMO_REGION` (default `ap-southeast-2`)
- `DYNAMO_ENDPOINT` (only set for local dev, `http://host.docker.internal:9000`)
- `DYNAMO_TABLE_PREFIX` (default `backend-app-`)

These are consumed by `src/config/env.ts` and used by the Dynamo client in `src/db/dynamodb/client.ts`, which is exercised by the `DynamoHealthFunction` handler in `src/handlers/dynamoHealth.ts`.

## Stopping local services

- Stop SAM local API: use `Ctrl+C` in the terminal where `npm run sam:start` is running.
- Stop Postgres:

  ```bash
docker-compose down
````

- Stop and delete Postgres data volume (reset DB):

  ```bash
  docker-compose down -v
  ```

````

## Deploying to AWS (dev/prod)

This repo uses a three-layer deployment model:

- A **base account stack** (artifact bucket, IAM roles, Secrets Manager).
- An **RDS base stack** (Postgres instance per environment + database connection secrets).
- The **SAM application stack** (Lambdas + HttpApi).

### Quick Full Setup

For new environments, use the automated setup script that handles all stacks in the correct order:

```bash
aws sso login --profile Club-Sports-App-Dev-Administrator

./setup-full-infrastructure.sh dev Club-Sports-App-Dev-Administrator
````

This will:

1. Deploy base account infrastructure
2. Deploy RDS infrastructure
3. Create database connection secrets automatically
4. Deploy the SAM application

### Manual Step-by-Step Setup

#### 1. Base account stack

Template: `infra/base-account.yaml`

Deploy script: `deploy-base-stack.sh`

This stack creates:

- Versioned S3 artifact bucket used by SAM (`ArtifactBucketName`).
- CI/CD deploy role.
- Shared Lambda execution role (`backend-app-lambda-[env]`).
- Secrets Manager secrets for DB master username/password.
- IAM policies for accessing database connection secrets.

To deploy for `dev`:

```bash
aws sso login --profile Club-Sports-App-Dev-Administrator

./deploy-base-stack.sh                # defaults to env=dev, dev admin profile
```

After this, in Secrets Manager, update the two DB master secrets for `dev`:

- `backend-app-dev-db-master-username`
- `backend-app-dev-db-master-password`

Set their plaintext values to the desired RDS master credentials.

#### 2. RDS base stack

Template: `infra/rds-base.yaml`

Deploy script: `deploy-rds-base.sh`

This stack creates:

- A VPC, public subnets, and subnet group for RDS.
- A small Postgres instance (dev-friendly, non-HA).
- **Database connection secrets** automatically created with RDS endpoint info:
  - `DB_HOST` - RDS endpoint address
  - `DB_PORT` - RDS endpoint port (5432)
  - `DB_NAME` - Database name
  - `DB_USER` - Database username (from master username secret)
  - `DB_PASSWORD` - Database password (from master password secret)
- CloudFormation exports for DB endpoint address, port, and name.

To deploy for `dev`:

```bash
aws sso login --profile Club-Sports-App-Dev-Administrator

./deploy-rds-base.sh                  # defaults to env=dev, dev admin profile
```

Once complete, you can inspect the `backend-app-rds-base-dev` stack outputs for:

- `DbEndpointAddress`
- `DbEndpointPort`
- `DbName`

#### 3. Update RDS secrets (if needed)

If you need to update the database connection secrets after RDS deployment:

```bash
./update-rds-secrets.sh dev Club-Sports-App-Dev-Administrator
```

This updates the RDS stack to ensure all database connection secrets are properly created.

#### 4. SAM application stack

Template: `template.yaml`

Deploy script: `deploy-sam.sh`

This stack creates:

- The `HttpApi` API Gateway (driven by `openapi/api.yaml`).
- `HealthCheckFunction`, `DbHealthFunction`, `DynamoHealthFunction` Lambdas.
- Property management functions (AdminCreateProperty, AdminGetProperty, etc.).
- Lambda permissions for API Gateway.
- A DynamoDB table (`backend-app-table`) for session storage.
- Three Cognito User Pools (manager, contractor, admin).

The template supports both local Docker-based DB/Dynamo and AWS RDS/Dynamo via parameters:

- `EnvironmentName` (e.g. `local`, `dev`, `prod`).

`deploy-sam.sh` uses `EnvironmentName=dev` by default and reads the artifact bucket from the base stack.

To deploy the app for `dev`:

```bash
aws sso login --profile Club-Sports-App-Dev-Administrator

./deploy-sam.sh                       # env=dev, dev admin profile
```

On success, the CloudFormation output `HttpApiUrl` will contain the base URL for the API, e.g.:

```text
https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/v1
```

You can then hit the health endpoints in the deployed environment:

```bash
curl "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/v1/health"
curl "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/v1/db/health"
curl "https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/v1/dynamo/health"
```

### Database Connection Secrets

The SAM application automatically resolves database connection from AWS Secrets Manager:

- `DB_HOST` - RDS endpoint address
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

These secrets are created automatically by the RDS stack and referenced in the SAM template using `{{resolve:secretsmanager:GetSecretValue:SecretString:SECRET_NAME}}`.
