-- Base schema for maintenance-app database
-- This file contains the complete schema for early development
-- Post-launch, this will be replaced with proper migrations

-- Create the base schema for regular storage
CREATE SCHEMA IF NOT EXISTS base;

-- Properties table (in base schema)
CREATE TABLE IF NOT EXISTS base.properties (
    id TEXT PRIMARY KEY,
    owner_manager_sub TEXT NOT NULL,
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    postcode TEXT NOT NULL,
    country TEXT NOT NULL,
    timezone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_manager_sub ON base.properties(owner_manager_sub);

-- Unique constraint: property names must be unique per manager for active properties only
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_unique_name_per_manager 
ON base.properties(owner_manager_sub, name) 
WHERE archived_at IS NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists, then recreate it
DROP TRIGGER IF EXISTS update_properties_updated_at ON base.properties;

-- Trigger to auto-update updated_at on properties table
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON base.properties 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Schema migrations tracking table (for future use when we switch to proper migrations)
CREATE TABLE IF NOT EXISTS base.schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
