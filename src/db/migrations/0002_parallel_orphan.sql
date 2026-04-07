CREATE TABLE "local_auth_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "local_auth_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_user_id" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"employee_code" varchar(50),
	"department" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_auth_users_external_user_id_unique" UNIQUE("external_user_id"),
	CONSTRAINT "local_auth_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE INDEX "local_auth_users_external_user_id_idx" ON "local_auth_users" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "local_auth_users_username_idx" ON "local_auth_users" USING btree ("username");