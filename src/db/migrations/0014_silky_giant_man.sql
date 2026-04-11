CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_list_order_idx" ON "assets" USING btree ((case when "available_qty" = 0 then 1 else 0 end),"asset_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_search_trgm_idx" ON "assets" USING gin ((lower("name" || ' ' || "asset_code")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_auth_users_full_name_external_user_id_idx" ON "local_auth_users" USING btree ("full_name","external_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_auth_users_search_trgm_idx" ON "local_auth_users" USING gin ((lower(
        "username"
        || ' '
        || "full_name"
        || ' '
        || "external_user_id"
        || ' '
        || coalesce("email", '')
        || ' '
        || coalesce("employee_code", '')
        || ' '
        || coalesce("department", '')
      )) gin_trgm_ops);
