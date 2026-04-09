CREATE TYPE "public"."notification_type" AS ENUM('borrow_request_created', 'borrow_request_approved', 'borrow_request_rejected', 'borrow_request_cancelled', 'return_recorded', 'due_date_approaching', 'overdue');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"recipient_external_user_id" varchar(255) NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"entity_type" varchar(64),
	"entity_id" varchar(64),
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_external_user_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_external_user_id","is_read");
