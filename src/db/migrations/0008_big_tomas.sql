CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "assets_location_idx" ON "assets" USING btree ("location");--> statement-breakpoint
CREATE INDEX "borrow_request_items_borrow_request_id_idx" ON "borrow_request_items" USING btree ("borrow_request_id");--> statement-breakpoint
CREATE INDEX "borrow_request_items_asset_id_idx" ON "borrow_request_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "borrow_requests_status_idx" ON "borrow_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "borrow_requests_borrower_external_user_id_idx" ON "borrow_requests" USING btree ("borrower_external_user_id");--> statement-breakpoint
CREATE INDEX "borrow_requests_due_date_idx" ON "borrow_requests" USING btree ("due_date");