CREATE TABLE "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_name" text NOT NULL,
	"pinclicks_account_url" text,
	"monthly_views" integer,
	"total_keywords" integer,
	"status" text DEFAULT 'active',
	"last_sitemap_import" timestamp,
	"last_keywords_import" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "domains_domain_name_unique" UNIQUE("domain_name")
);
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer,
	"import_type" text NOT NULL,
	"file_name" text,
	"rows_imported" integer,
	"rows_skipped" integer,
	"warnings" jsonb,
	"imported_by" text,
	"imported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "keyword_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer,
	"domain_id" integer,
	"recipe_url_id" integer,
	"position" integer NOT NULL,
	"position_change" integer,
	"search_volume" integer,
	"pinterest_pin_url" text,
	"pin_image_url" text,
	"tracked_date" date NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	CONSTRAINT "keyword_rankings_keyword_id_domain_id_unique" UNIQUE("keyword_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_text" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "keywords_keyword_text_unique" UNIQUE("keyword_text")
);
--> statement-breakpoint
CREATE TABLE "recipe_urls" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer,
	"url" text NOT NULL,
	"slug" text NOT NULL,
	"last_modified" timestamp,
	"images" jsonb,
	"source" text DEFAULT 'sitemap',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "recipe_urls_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_rankings" ADD CONSTRAINT "keyword_rankings_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_rankings" ADD CONSTRAINT "keyword_rankings_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_rankings" ADD CONSTRAINT "keyword_rankings_recipe_url_id_recipe_urls_id_fk" FOREIGN KEY ("recipe_url_id") REFERENCES "public"."recipe_urls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_urls" ADD CONSTRAINT "recipe_urls_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;