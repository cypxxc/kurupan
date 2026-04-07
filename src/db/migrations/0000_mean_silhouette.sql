CREATE TYPE "public"."asset_status" AS ENUM('available', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."borrow_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'partially_returned', 'returned');--> statement-breakpoint
CREATE TYPE "public"."return_condition" AS ENUM('good', 'damaged', 'lost');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('borrower', 'staff', 'admin');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"asset_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"description" text,
	"location" text,
	"total_qty" integer NOT NULL,
	"available_qty" integer NOT NULL,
	"status" "asset_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_asset_code_unique" UNIQUE("asset_code"),
	CONSTRAINT "assets_total_qty_non_negative" CHECK ("assets"."total_qty" >= 0),
	CONSTRAINT "assets_available_qty_non_negative" CHECK ("assets"."available_qty" >= 0),
	CONSTRAINT "assets_available_qty_lte_total_qty" CHECK ("assets"."available_qty" <= "assets"."total_qty")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actor_external_user_id" varchar(255),
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrow_request_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "borrow_request_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"borrow_request_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"requested_qty" integer NOT NULL,
	"approved_qty" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrow_request_items_requested_qty_positive" CHECK ("borrow_request_items"."requested_qty" > 0),
	CONSTRAINT "borrow_request_items_approved_qty_positive" CHECK ("borrow_request_items"."approved_qty" IS NULL OR "borrow_request_items"."approved_qty" > 0),
	CONSTRAINT "borrow_request_items_approved_qty_lte_requested_qty" CHECK ("borrow_request_items"."approved_qty" IS NULL OR "borrow_request_items"."approved_qty" <= "borrow_request_items"."requested_qty")
);
--> statement-breakpoint
CREATE TABLE "borrow_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "borrow_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_no" varchar(32) NOT NULL,
	"borrower_external_user_id" varchar(255) NOT NULL,
	"purpose" text,
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "borrow_request_status" DEFAULT 'pending' NOT NULL,
	"approved_by_external_user_id" varchar(255),
	"approved_at" timestamp with time zone,
	"rejected_by_external_user_id" varchar(255),
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"cancelled_by_external_user_id" varchar(255),
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrow_requests_request_no_unique" UNIQUE("request_no"),
	CONSTRAINT "borrow_requests_due_date_gte_start_date" CHECK ("borrow_requests"."due_date" >= "borrow_requests"."start_date")
);
--> statement-breakpoint
CREATE TABLE "return_transaction_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "return_transaction_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"return_transaction_id" integer NOT NULL,
	"borrow_request_item_id" integer NOT NULL,
	"return_qty" integer NOT NULL,
	"condition" "return_condition" NOT NULL,
	"note" text,
	CONSTRAINT "return_transaction_items_return_qty_positive" CHECK ("return_transaction_items"."return_qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "return_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "return_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"borrow_request_id" integer NOT NULL,
	"received_by_external_user_id" varchar(255) NOT NULL,
	"note" text,
	"returned_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_user_id" varchar(255) NOT NULL,
	"effective_role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_access" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_access_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_user_id" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'borrower' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_by_external_user_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_access_external_user_id_unique" UNIQUE("external_user_id")
);
--> statement-breakpoint
ALTER TABLE "borrow_request_items" ADD CONSTRAINT "borrow_request_items_borrow_request_id_borrow_requests_id_fk" FOREIGN KEY ("borrow_request_id") REFERENCES "public"."borrow_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_request_items" ADD CONSTRAINT "borrow_request_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_return_transaction_id_return_transactions_id_fk" FOREIGN KEY ("return_transaction_id") REFERENCES "public"."return_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_borrow_request_item_id_borrow_request_items_id_fk" FOREIGN KEY ("borrow_request_item_id") REFERENCES "public"."borrow_request_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_borrow_request_id_borrow_requests_id_fk" FOREIGN KEY ("borrow_request_id") REFERENCES "public"."borrow_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_external_user_id_idx" ON "sessions" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_access_external_user_id_idx" ON "user_access" USING btree ("external_user_id");
