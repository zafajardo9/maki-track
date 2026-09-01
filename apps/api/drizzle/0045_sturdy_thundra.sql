-- Legacy "comment" rows were unified into "activity" (migration 0032) and the
-- table has been unused since. "github_integration" was superseded by the
-- typed "integration" table; rows that a very old install never migrated at
-- boot are folded over first. The old startup migration task dropped
-- "github_integration" outside the drizzle journal, hence IF EXISTS throughout
-- and the existence guard around the data fold. "is_anonymous" belonged to the
-- removed guest-login plugin and is no longer part of the user model.
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'github_integration'
  ) THEN
    INSERT INTO "integration" ("id", "project_id", "type", "config", "is_active", "created_at", "updated_at")
    SELECT
      'ghmig-' || old."id",
      old."project_id",
      'github',
      jsonb_build_object(
        'repositoryOwner', old."repository_owner",
        'repositoryName', old."repository_name",
        'installationId', old."installation_id",
        'branchPattern', '{slug}-{number}',
        'commentTaskLinkOnGitHubIssue', true,
        'statusTransitions', jsonb_build_object(
          'onBranchPush', 'in-progress',
          'onPROpen', 'in-review',
          'onPRMerge', 'done'
        )
      )::text,
      COALESCE(old."is_active", true),
      old."created_at",
      old."updated_at"
    FROM "github_integration" old
    WHERE NOT EXISTS (
      SELECT 1 FROM "integration" i
      WHERE i."project_id" = old."project_id" AND i."type" = 'github'
    );
  END IF;
END
$$;
--> statement-breakpoint
DROP TABLE IF EXISTS "comment" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "github_integration" CASCADE;
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "is_anonymous";
