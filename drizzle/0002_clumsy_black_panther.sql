DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb,
	"masterinput" jsonb DEFAULT '[]'::jsonb,
	"masterinputfromother" jsonb DEFAULT '[]'::jsonb,
	"imported_input_sections" jsonb DEFAULT '[]'::jsonb,
	"pagesfromother" jsonb DEFAULT '[]'::jsonb,
	"inputsections" jsonb DEFAULT '[]'::jsonb,
	"dashboards" jsonb DEFAULT '[]'::jsonb,
	"name" text,
	"subject" varchar(512) DEFAULT 'No Subject',
	"scheme" text,
	"rulebook" text,
	"description" text,
	"template_id" uuid,
	"userid" uuid,
	"date" timestamp with time zone DEFAULT now(),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"favourites" jsonb DEFAULT '[]'::jsonb,
	"likedby" jsonb DEFAULT '[]'::jsonb,
	"adminusers" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"quotes" jsonb DEFAULT '[]'::jsonb,
	"currentversion" uuid,
	"publishid" uuid,
	"to_publish" boolean DEFAULT false,
	"blogdetails" jsonb,
	"blocks" jsonb,
	"linktohtml" text,
	"is_disabled" boolean DEFAULT false,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb,
	"masterinput" jsonb DEFAULT '[]'::jsonb,
	"masterinputfromother" jsonb DEFAULT '[]'::jsonb,
	"imported_input_sections" jsonb DEFAULT '[]'::jsonb,
	"pagesfromother" jsonb DEFAULT '[]'::jsonb,
	"inputsections" jsonb DEFAULT '[]'::jsonb,
	"dashboards" jsonb DEFAULT '[]'::jsonb,
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "direct_feasibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb,
	"masterinput" jsonb DEFAULT '[]'::jsonb,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_modified_at" timestamp with time zone,
	"inputsections" jsonb DEFAULT '[]'::jsonb,
	"new_pages" jsonb DEFAULT '{}'::jsonb,
	"new_masterinput" jsonb DEFAULT '{}'::jsonb,
	"new_inputsections" jsonb DEFAULT '{}'::jsonb,
	"userid" uuid,
	"collaborators" jsonb DEFAULT '[]'::jsonb,
	"is_disabled" boolean DEFAULT false,
	"fixedparameterset" boolean DEFAULT false
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"form" jsonb,
	"user" uuid,
	"name" varchar(256),
	"client" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pdf_download_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user" uuid NOT NULL,
	"fetch_id" varchar(256) NOT NULL,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256),
	"type" varchar(64),
	"html" text,
	"input_values" jsonb,
	"date" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "users";
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actual_created_at" timestamp with time zone DEFAULT now(),
	"name" text,
	"username" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" NOT NULL,
	"paths" jsonb,
	"status" varchar(64) DEFAULT 'active',
	"is_disabled" boolean DEFAULT false,
	"phone_country_code" varchar(16),
	"phone_number" varchar(32) NOT NULL,
	"first_name" text,
	"last_name" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");