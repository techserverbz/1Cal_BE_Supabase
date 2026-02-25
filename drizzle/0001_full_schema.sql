-- Drop old users table (legacy simple schema)
DROP TABLE IF EXISTS "users";

-- Create enum for user role
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM('user', 'admin', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users (full app schema)
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actual_created_at" timestamp with time zone DEFAULT now(),
  "name" text,
  "username" text,
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "role" "user_role" NOT NULL,
  "paths" jsonb,
  "status" varchar(64) DEFAULT 'active',
  "is_disabled" boolean DEFAULT false,
  "phone_country_code" varchar(16),
  "phone_number" varchar(32) NOT NULL UNIQUE,
  "first_name" text,
  "last_name" text
);

-- Templates
CREATE TABLE IF NOT EXISTS "templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pages" jsonb DEFAULT '[]',
  "masterinput" jsonb DEFAULT '[]',
  "masterinputfromother" jsonb DEFAULT '[]',
  "imported_input_sections" jsonb DEFAULT '[]',
  "pagesfromother" jsonb DEFAULT '[]',
  "inputsections" jsonb DEFAULT '[]',
  "dashboards" jsonb DEFAULT '[]',
  "name" text,
  "subject" varchar(512) DEFAULT 'No Subject',
  "scheme" text,
  "rulebook" text,
  "description" text,
  "template_id" uuid,
  "userid" uuid,
  "date" timestamp with time zone DEFAULT now(),
  "tags" jsonb DEFAULT '[]',
  "favourites" jsonb DEFAULT '[]',
  "likedby" jsonb DEFAULT '[]',
  "adminusers" jsonb DEFAULT '[]',
  "created_at" timestamp with time zone DEFAULT now(),
  "quotes" jsonb DEFAULT '[]',
  "currentversion" uuid,
  "publishid" uuid,
  "to_publish" boolean DEFAULT false,
  "blogdetails" jsonb,
  "blocks" jsonb,
  "linktohtml" text,
  "is_disabled" boolean DEFAULT false,
  "order" integer DEFAULT 0
);

-- Versions
CREATE TABLE IF NOT EXISTS "versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pages" jsonb DEFAULT '[]',
  "masterinput" jsonb DEFAULT '[]',
  "masterinputfromother" jsonb DEFAULT '[]',
  "imported_input_sections" jsonb DEFAULT '[]',
  "pagesfromother" jsonb DEFAULT '[]',
  "inputsections" jsonb DEFAULT '[]',
  "dashboards" jsonb DEFAULT '[]',
  "name" text,
  "subject" varchar(512) DEFAULT 'No Subject',
  "scheme" text,
  "rulebook" text,
  "description" text,
  "template_id" uuid,
  "date" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "versionof" uuid
);

-- Direct feasibilities (formula templates)
CREATE TABLE IF NOT EXISTS "direct_feasibilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "pages" jsonb DEFAULT '[]',
  "masterinput" jsonb DEFAULT '[]',
  "name" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "last_modified_at" timestamp with time zone,
  "inputsections" jsonb DEFAULT '[]',
  "new_pages" jsonb DEFAULT '{}',
  "new_masterinput" jsonb DEFAULT '{}',
  "new_inputsections" jsonb DEFAULT '{}',
  "userid" uuid,
  "collaborators" jsonb DEFAULT '[]',
  "is_disabled" boolean DEFAULT false,
  "fixedparameterset" boolean DEFAULT false
);

-- Contacts
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "name" text,
  "phone" varchar(64),
  "is_disabled" boolean DEFAULT false,
  "email" varchar(256),
  "type" varchar(64),
  "description" text,
  "user" uuid,
  "files" jsonb,
  "gst" varchar(64),
  "pan" varchar(64)
);

-- About us
CREATE TABLE IF NOT EXISTS "about_us" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(256) NOT NULL,
  "brief" text NOT NULL,
  "description" text NOT NULL,
  "level" integer NOT NULL,
  "photo_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "is_disabled" boolean DEFAULT false
);

-- Bills
CREATE TABLE IF NOT EXISTS "bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "form" jsonb,
  "user" uuid,
  "name" varchar(256),
  "client" uuid
);

-- PDF download logs
CREATE TABLE IF NOT EXISTS "pdf_download_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user" uuid NOT NULL,
  "fetch_id" varchar(256) NOT NULL,
  "downloaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- File templates
CREATE TABLE IF NOT EXISTS "file_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(256),
  "type" varchar(64),
  "html" text,
  "input_values" jsonb,
  "date" timestamp with time zone DEFAULT now()
);
