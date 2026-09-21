ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_id_unique" UNIQUE("workspace_id","id");--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text NOT NULL,
	"workspace_member_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_project_member_unique" UNIQUE("project_id","workspace_member_id")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "access_mode" text DEFAULT 'workspace' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "access_mode" SET DEFAULT 'restricted';--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_workspace_id_project_id_project_workspace_id_id_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."project"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_workspace_id_workspace_member_id_workspace_member_workspace_id_id_fk" FOREIGN KEY ("workspace_id","workspace_member_id") REFERENCES "public"."workspace_member"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_member_workspace_member_idx" ON "project_member" USING btree ("workspace_member_id");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_access_mode_check" CHECK ("project"."access_mode" in ('workspace', 'restricted'));--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_restricted_not_public" CHECK ("project"."access_mode" <> 'restricted' or "project"."is_public" is not true);