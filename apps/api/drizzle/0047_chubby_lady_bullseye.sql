DROP INDEX "label_workspace_name_unique";--> statement-breakpoint
ALTER TABLE "label" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "label_project_id_idx" ON "label" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "label_project_name_unique" ON "label" USING btree ("project_id","name") WHERE "label"."task_id" is null and "label"."project_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "label_workspace_name_unique" ON "label" USING btree ("workspace_id","name") WHERE "label"."task_id" is null and "label"."project_id" is null;