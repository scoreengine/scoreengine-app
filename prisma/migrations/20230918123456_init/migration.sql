-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "name" text,
  "trialEndsAt" timestamp(3),
  "credits" integer NOT NULL DEFAULT 0,
  "locale" text NOT NULL DEFAULT 'en',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audits table
CREATE TABLE IF NOT EXISTS "audits" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "url" text NOT NULL,
  "serviceAngle" text NOT NULL,
  "inputLocale" text NOT NULL,
  "recentUpdate" text,
  "resultJson" jsonb NOT NULL,
  "score" integer,
  "bucket" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audits_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "audits_userId_createdAt_idx" ON "audits" ("userId", "createdAt");

-- Create events table
CREATE TABLE IF NOT EXISTS "events" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "meta" jsonb,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "events_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "events_userId_createdAt_idx" ON "events" ("userId", "createdAt");

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "lszCustomerId" text,
  "lszSubId" text,
  "status" text,
  "currentPeriodEnd" timestamp(3),
  "plan" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx" ON "subscriptions" ("userId");

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "lszInvoiceId" text NOT NULL UNIQUE,
  "amountCents" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "type" text NOT NULL,
  "meta" jsonb,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "invoices_userId_createdAt_idx" ON "invoices" ("userId", "createdAt");

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" text PRIMARY KEY,
  "source" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" integer NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);