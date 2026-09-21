import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectAccess } from "@/hooks/queries/project/use-project-access";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import type { ProjectWithTasks } from "@/types/project";

export function ProjectAccessSettings({
  project,
}: {
  project: ProjectWithTasks;
}) {
  const { t } = useTranslation();
  const { canManageProjectAccess } = useWorkspacePermission();
  const canManage = canManageProjectAccess();
  const { members, membership, access } = useProjectAccess(
    project.id,
    canManage,
  );
  const { data: workspaceMembers } = useGetWorkspaceUsers({
    workspaceId: canManage ? project.workspaceId : undefined,
  });
  const [search, setSearch] = useState("");
  const searchId = useId();
  const pending = membership.isPending || access.isPending;
  const candidates = (workspaceMembers ?? []).filter(
    (member) =>
      !members.data?.some((existing) => existing.userId === member.userId) &&
      `${member.user.name} ${member.user.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-4 rounded-md border border-border bg-sidebar p-4">
      <div>
        <h2 className="text-md font-medium">
          {t("settings:projectAccess.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("settings:projectAccess.description")}
        </p>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        {t("settings:projectAccess.visibility")}
        <select
          className="rounded-md border border-input bg-background p-2"
          value={project.accessMode}
          disabled={!canManage || pending}
          onChange={(event) =>
            access.mutate({
              id: project.id,
              accessMode: event.target.value as "workspace" | "restricted",
            })
          }
        >
          <option value="restricted">
            {t("settings:projectAccess.restricted")}
          </option>
          <option value="workspace">
            {t("settings:projectAccess.workspace")}
          </option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        {t("settings:projectAccess.publicWarning")}
      </p>
      {canManage && (
        <>
          {members.isPending && (
            <p role="status">{t("settings:projectAccess.loading")}</p>
          )}
          {(members.isError || membership.isError || access.isError) && (
            <p role="alert">{t("settings:projectAccess.error")}</p>
          )}
          <ul className="space-y-2">
            {members.data?.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <span>{member.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {member.inherited
                      ? t("settings:projectAccess.inherited")
                      : member.email}
                  </p>
                </div>
                {member.explicit && !member.inherited && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label={t("settings:projectAccess.removeNamed", {
                      name: member.name,
                    })}
                    onClick={() =>
                      membership.mutate({
                        id: project.id,
                        userId: member.userId,
                        present: false,
                      })
                    }
                  >
                    {t("common:actions.remove")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <label htmlFor={searchId} className="text-sm font-medium">
              {t("settings:projectAccess.addMembers")}
            </label>
            <Input
              id={searchId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("settings:projectAccess.search")}
            />
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {candidates.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    {member.user.name}
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || !members.data}
                    aria-label={t("settings:projectAccess.addNamed", {
                      name: member.user.name,
                    })}
                    onClick={() =>
                      membership.mutate({
                        id: project.id,
                        userId: member.userId,
                        present: true,
                      })
                    }
                  >
                    {t("settings:projectAccess.add")}
                  </Button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  {t("settings:projectAccess.noMatches")}
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
