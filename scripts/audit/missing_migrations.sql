-- RegnskapsAI - Missing Columns and Tables Migration
-- Date: 2025-01-25
-- NOTE: Use `npm run db:push --force` instead of running this SQL manually

-- Add missing columns to existing clients table
-- (These will be added through Drizzle schema updates)

-- Altinn integration fields
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_access BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_access_type TEXT;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_access_granted_at TIMESTAMP;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_access_granted_by UUID;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS coord_reg_signed BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_invitation_sent BOOLEAN DEFAULT FALSE;
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS altinn_notes TEXT;

-- Add missing columns to time_entries table
-- ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2);
-- ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;
-- ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- Add missing columns to tasks table  
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT TRUE;
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'not_invoiced';

-- Create missing tables (will be created through Drizzle schema)

-- Password reset tokens table
-- CREATE TABLE IF NOT EXISTS password_reset_tokens (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES users(id),
--   token_hash TEXT NOT NULL,
--   expires_at TIMESTAMP NOT NULL,
--   used_at TIMESTAMP,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- Audit logs table
-- CREATE TABLE IF NOT EXISTS audit_logs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES users(id),
--   company_id UUID REFERENCES tenants(id),
--   action TEXT NOT NULL,
--   meta JSONB,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- KYC cases table
-- CREATE TABLE IF NOT EXISTS kyc_cases (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   client_id UUID NOT NULL REFERENCES clients(id),
--   status TEXT DEFAULT 'pending',
--   risk_score DECIMAL(5,2),
--   documents JSONB,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- AML screenings table  
-- CREATE TABLE IF NOT EXISTS aml_screenings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   client_id UUID NOT NULL REFERENCES clients(id),
--   result TEXT,
--   status TEXT DEFAULT 'pending',
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- Indexes for performance
-- CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
-- CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
-- CREATE INDEX IF NOT EXISTS idx_kyc_cases_client_id ON kyc_cases(client_id);
-- CREATE INDEX IF NOT EXISTS idx_aml_screenings_client_id ON aml_screenings(client_id);