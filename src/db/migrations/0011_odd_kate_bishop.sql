CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_external_user_id_idx" ON "audit_logs" USING btree ("actor_external_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_actor_idx" ON "audit_logs" USING btree ("created_at","actor_external_user_id");--> statement-breakpoint
CREATE INDEX "return_transaction_items_borrow_request_item_id_idx" ON "return_transaction_items" USING btree ("borrow_request_item_id");