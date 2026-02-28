# Infrastructure as Code Updates

## Problem Solved

The SAM deployment was failing because Lambda functions that need database access were trying to resolve Secrets Manager secrets that didn't exist:
- `DB_HOST`
- `DB_PORT` 
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## Solution Implemented

### 1. Updated RDS Infrastructure (`infra/rds-base.yaml`)

**Added automatic database connection secret creation:**

```yaml
DbHostSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: DB_HOST
    SecretString: !GetAtt BackendAppDbInstance.Endpoint.Address

DbPortSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: DB_PORT
    SecretString: !GetAtt BackendAppDbInstance.Endpoint.Port

DbNameSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: DB_NAME
    SecretString: !Ref DbName

DbUserSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: DB_USER
    SecretString: !Sub '{{resolve:secretsmanager:backend-app-${EnvironmentName}-db-master-username:SecretString}}'

DbPasswordSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: DB_PASSWORD
    SecretString: !Sub '{{resolve:secretsmanager:backend-app-${EnvironmentName}-db-master-password:SecretString}}'
```

### 2. Updated Base Account Infrastructure (`infra/base-account.yaml`)

**Added IAM policies for database secret access:**

```yaml
- PolicyName: !Sub 'backend-app-lambda-secrets-${EnvironmentName}'
  PolicyDocument:
    Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action:
          - secretsmanager:GetSecretValue
          - secretsmanager:DescribeSecret
        Resource:
          - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:DB_HOST*'
          - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:DB_PORT*'
          - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:DB_NAME*'
          - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:DB_USER*'
          - !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:DB_PASSWORD*'
```

**Updated DbCredentialsAccessPolicy** to include the new database connection secrets.

### 3. New Deployment Scripts

#### `setup-full-infrastructure.sh`
- Automated end-to-end infrastructure setup
- Deploys stacks in correct order: base → RDS → secrets update → SAM
- Handles all dependencies automatically

#### `update-rds-secrets.sh`
- Updates RDS stack to create database connection secrets
- Useful for existing deployments that need the new secrets

### 4. Updated Documentation

**Enhanced README.md** with:
- Quick full setup option
- Detailed manual step-by-step instructions
- Database connection secrets explanation
- Updated deployment commands

## Benefits

1. **Automatic Secret Creation**: Database connection secrets are now created automatically when RDS stack is deployed
2. **Proper IAM Permissions**: Lambda functions have the necessary permissions to access database secrets
3. **Idempotent Deployments**: Infrastructure can be deployed and updated reliably
4. **Complete Documentation**: Clear setup instructions for new environments
5. **Dependency Management**: Scripts handle deployment order and dependencies

## Deployment Process

### For New Environments
```bash
./setup-full-infrastructure.sh dev Club-Sports-App-Dev-Administrator
```

### For Existing Environments
```bash
# Update base stack for new IAM policies
./deploy-base-stack.sh dev Club-Sports-App-Dev-Administrator

# Update RDS stack to create secrets
./update-rds-secrets.sh dev Club-Sports-App-Dev-Administrator

# Deploy SAM application
./deploy-sam.sh dev Club-Sports-App-Dev-Administrator
```

## Files Modified

- `infra/rds-base.yaml` - Added database connection secrets
- `infra/base-account.yaml` - Added IAM policies for secret access
- `README.md` - Updated deployment documentation
- `setup-full-infrastructure.sh` - New automated setup script
- `update-rds-secrets.sh` - New RDS secrets update script

## Result

The SAM deployment now succeeds because all required database connection secrets are automatically created and accessible by Lambda functions. The infrastructure is fully managed as code with proper dependency handling.
