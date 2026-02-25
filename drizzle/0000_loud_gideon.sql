CREATE TYPE "prod"."user_role" AS ENUM('user', 'admin', 'client');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."users" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"actual_created_at" timestamp with time zone DEFAULT now(),
	"name" text,
	"username" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "prod"."user_role" NOT NULL,
	"paths" jsonb,
	"status" varchar(64) DEFAULT 'active',
	"is_disabled" boolean DEFAULT false,
	"phone_country_code" varchar(16),
	"phone_number" varchar(32) NOT NULL,
	"first_name" text,
	"last_name" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."templates" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
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
	"template_id" varchar(24),
	"userid" varchar(24),
	"date" timestamp with time zone DEFAULT now(),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"favourites" jsonb DEFAULT '[]'::jsonb,
	"likedby" jsonb DEFAULT '[]'::jsonb,
	"adminusers" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"quotes" jsonb DEFAULT '[]'::jsonb,
	"currentversion" varchar(24),
	"publishid" varchar(24),
	"to_publish" boolean DEFAULT false,
	"blogdetails" jsonb,
	"blocks" jsonb,
	"linktohtml" text,
	"is_disabled" boolean DEFAULT false,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."versions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
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
	"template_id" varchar(24),
	"date" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"versionof" varchar(24)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."direct_feasibilities" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"template_id" varchar(24) NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb,
	"masterinput" jsonb DEFAULT '[]'::jsonb,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_modified_at" timestamp with time zone,
	"inputsections" jsonb DEFAULT '[]'::jsonb,
	"new_pages" jsonb DEFAULT '{}'::jsonb,
	"new_masterinput" jsonb DEFAULT '{}'::jsonb,
	"new_inputsections" jsonb DEFAULT '{}'::jsonb,
	"userid" varchar(24),
	"collaborators" jsonb DEFAULT '[]'::jsonb,
	"is_disabled" boolean DEFAULT false,
	"fixedparameterset" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."contacts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"name" text,
	"phone" varchar(64),
	"is_disabled" boolean DEFAULT false,
	"email" varchar(256),
	"type" varchar(64),
	"description" text,
	"user" varchar(24),
	"files" jsonb,
	"gst" varchar(64),
	"pan" varchar(64)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."about_us" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"brief" text NOT NULL,
	"description" text NOT NULL,
	"level" integer NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_disabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."bills" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"form" jsonb,
	"user" varchar(24),
	"name" varchar(256),
	"client" varchar(24)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."pdf_download_logs" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user" varchar(24) NOT NULL,
	"fetch_id" varchar(256) NOT NULL,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prod"."file_templates" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"type" varchar(64),
	"html" text,
	"input_values" jsonb,
	"date" timestamp with time zone DEFAULT now()
);
