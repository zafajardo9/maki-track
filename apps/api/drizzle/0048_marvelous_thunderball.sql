ALTER TABLE "label" DROP CONSTRAINT "label_task_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "label_task_name_unique" ON "label" USING btree ("task_id","name") WHERE "label"."project_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "label_task_tag_name_unique" ON "label" USING btree ("task_id","name") WHERE "label"."project_id" is not null;