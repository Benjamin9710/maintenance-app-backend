# infra/

## Purpose

- Infrastructure templates and supporting configuration.

## Conventions

- Prefer additive, backwards-compatible changes to shared/base templates.
- Keep resource names and parameters consistent across stacks.
- Avoid embedding secrets in templates; use parameters and AWS Secrets Manager or SSM Parameter Store.
