CREATE TYPE "public"."announcement_audience" AS ENUM('all');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."cms_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."collection_placement" AS ENUM('home', 'morshed');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('draft', 'published', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('row', 'playlist');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'coach', 'support', 'editor', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."track_source" AS ENUM('jamendo', 'upload', 'external');--> statement-breakpoint
CREATE TYPE "public"."track_status" AS ENUM('draft', 'published', 'hidden', 'deleted');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"audience" "announcement_audience" DEFAULT 'all' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"target_type" text DEFAULT '' NOT NULL,
	"target_id" text DEFAULT '' NOT NULL,
	"meta" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyyar_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyyar_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"plan" jsonb NOT NULL,
	"profile_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyyar_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"gender" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"days_per_week" integer DEFAULT 3 NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"diet" text DEFAULT '' NOT NULL,
	"age" integer,
	"height_cm" integer,
	"weight_kg" real,
	"limitations" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyyar_weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyyar_workout_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_index" integer DEFAULT 0 NOT NULL,
	"exercise_index" integer DEFAULT 0 NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_block_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_key" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"saved_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"published_content" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"type" "collection_type" DEFAULT 'row' NOT NULL,
	"placement" "collection_placement" DEFAULT 'morshed' NOT NULL,
	"status" "collection_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"track_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"track_key" text NOT NULL,
	"position_sec" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'image' NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text DEFAULT '' NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"mime_type" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"phone" text,
	"display_name" text DEFAULT '' NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"password_hash" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"order_ref" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_media_id" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"author_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"member_id" uuid NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"csrf_token" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"source" "track_source" DEFAULT 'upload' NOT NULL,
	"source_id" text DEFAULT '' NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"album" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"audio_url" text DEFAULT '' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"license_url" text DEFAULT '' NOT NULL,
	"share_url" text DEFAULT '' NOT NULL,
	"rights" text DEFAULT '' NOT NULL,
	"categories" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" "track_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bodyyar_messages" ADD CONSTRAINT "bodyyar_messages_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodyyar_plans" ADD CONSTRAINT "bodyyar_plans_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodyyar_profiles" ADD CONSTRAINT "bodyyar_profiles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodyyar_weight_logs" ADD CONSTRAINT "bodyyar_weight_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodyyar_workout_logs" ADD CONSTRAINT "bodyyar_workout_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodyyar_workout_logs" ADD CONSTRAINT "bodyyar_workout_logs_plan_id_bodyyar_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."bodyyar_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bodyyar_messages_member_idx" ON "bodyyar_messages" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "bodyyar_plans_member_idx" ON "bodyyar_plans" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "bodyyar_plans_created_idx" ON "bodyyar_plans" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bodyyar_profiles_member_unique" ON "bodyyar_profiles" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bodyyar_weight_logs_member_date_unique" ON "bodyyar_weight_logs" USING btree ("member_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "bodyyar_workout_logs_plan_day_exercise_unique" ON "bodyyar_workout_logs" USING btree ("plan_id","day_index","exercise_index");--> statement-breakpoint
CREATE INDEX "cms_block_versions_block_idx" ON "cms_block_versions" USING btree ("block_key");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_blocks_key_unique" ON "cms_blocks" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_items_collection_track_unique" ON "collection_items" USING btree ("collection_id","track_id");--> statement-breakpoint
CREATE INDEX "collection_items_collection_idx" ON "collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_slug_unique" ON "collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "collections_status_idx" ON "collections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_member_track_unique" ON "favorites" USING btree ("member_id","track_key");--> statement-breakpoint
CREATE INDEX "listening_history_member_track_idx" ON "listening_history" USING btree ("member_id","track_key");--> statement-breakpoint
CREATE INDEX "listening_history_played_at_idx" ON "listening_history" USING btree ("played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "login_attempts_key_unique" ON "login_attempts" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "members_username_unique" ON "members" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "members_phone_unique" ON "members" USING btree ("phone") WHERE "members"."phone" is not null and "members"."status" <> 'deleted';--> statement-breakpoint
CREATE INDEX "members_role_idx" ON "members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_unique" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_member_idx" ON "sessions" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key_unique" ON "site_settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_source_source_id_unique" ON "tracks" USING btree ("source","source_id") WHERE "tracks"."source_id" <> '';--> statement-breakpoint
CREATE INDEX "tracks_status_idx" ON "tracks" USING btree ("status");