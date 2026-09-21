import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import labelColors from "@/constants/label-colors";
import useAttachLabelToTask from "@/hooks/mutations/label/use-attach-label-to-task";
import useDetachLabelFromTask from "@/hooks/mutations/label/use-detach-label-from-task";
import useAttachTagToTask from "@/hooks/mutations/tag/use-attach-tag-to-task";
import useDetachTagFromTask from "@/hooks/mutations/tag/use-detach-tag-from-task";
import { useUpdateTask } from "@/hooks/mutations/task/use-update-task";
import { useUpdateTaskAssignee } from "@/hooks/mutations/task/use-update-task-assignee";
import { useUpdateTaskDescription } from "@/hooks/mutations/task/use-update-task-description";
import { useUpdateTaskDueDate } from "@/hooks/mutations/task/use-update-task-due-date";
import { useUpdateTaskStatus } from "@/hooks/mutations/task/use-update-task-status";
import { useUpdateTaskPriority } from "@/hooks/mutations/task/use-update-task-status-priority";
import { useUpdateTaskTitle } from "@/hooks/mutations/task/use-update-task-title";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import useGetLabelsByTask from "@/hooks/queries/label/use-get-labels-by-task";
import useGetLabelsByWorkspace from "@/hooks/queries/label/use-get-labels-by-workspace";
import useGetTagsByProject from "@/hooks/queries/tag/use-get-tags-by-project";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-get-active-workspace-users";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { getColumnIcon } from "@/lib/column";
import { generateLink } from "@/lib/generate-link";
import { getInitials } from "@/lib/get-initials";
import { getTaskLabelOptions } from "@/lib/get-task-label-options";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import { toast } from "@/lib/toast";
import useProjectStore from "@/store/project";
import type Task from "@/types/task";

type TaskCardContext = {
  worskpaceId: string;
  projectId: string;
};

type TaskCardContextMenuContentProps = {
  task: Task;
  taskCardContext: TaskCardContext;
  onDeleteClick: () => void;
};

export default function TaskCardContextMenuContent({
  task,
  taskCardContext,
  onDeleteClick,
}: TaskCardContextMenuContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { project } = useProjectStore();
  const { data: columnsData = [] } = useGetColumns(taskCardContext.projectId);
  const columns =
    project?.columns && project.columns.length > 0
      ? project.columns.map((col) => ({
          slug: col.id,
          name: col.name,
          icon: col.icon,
          isFinal: col.isFinal,
        }))
      : columnsData.map((col) => ({
          slug: col.slug,
          name: col.name,
          icon: col.icon,
          isFinal: col.isFinal,
        }));
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(
    taskCardContext.worskpaceId,
  );
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: updateTaskPriority } = useUpdateTaskPriority();
  const { mutateAsync: updateTaskStatus } = useUpdateTaskStatus();
  const { mutateAsync: updateTaskAssignee } = useUpdateTaskAssignee();
  const { mutateAsync: updateTaskTitle } = useUpdateTaskTitle();
  const { mutateAsync: updateTaskDescription } = useUpdateTaskDescription();
  const { mutateAsync: updateTaskDueDate } = useUpdateTaskDueDate();
  const {
    canUpdateTasks,
    canDeleteTasks,
    canAssignTasks,
    canUpdateLabels,
    canUpdateTags,
  } = useWorkspacePermission();
  const canEdit = canUpdateTasks();
  const canDelete = canDeleteTasks();
  const canAssign = canAssignTasks();
  const canEditLabels = canUpdateLabels();
  const canEditTags = canUpdateTags();

  const { data: taskLabels = [] } = useGetLabelsByTask(task.id);
  const { data: projectTags = [] } = useGetTagsByProject(
    taskCardContext.projectId,
  );
  const { data: workspaceLabels = [] } = useGetLabelsByWorkspace(
    taskCardContext.worskpaceId,
  );
  const { mutateAsync: attachLabel } = useAttachLabelToTask();
  const { mutateAsync: detachLabel } = useDetachLabelFromTask();
  const { mutateAsync: attachTag } = useAttachTagToTask();
  const { mutateAsync: detachTag } = useDetachTagFromTask();

  // Options are deduped per scope so a tag never hides a same-named label.
  const tagOptions = useMemo(
    () =>
      getTaskLabelOptions(projectTags, task.id).filter((row) =>
        Boolean(row.projectId),
      ),
    [projectTags, task.id],
  );

  const labelOptions = useMemo(
    () =>
      getTaskLabelOptions(workspaceLabels, task.id).filter(
        (row) => !row.projectId,
      ),
    [workspaceLabels, task.id],
  );

  const assignedTagNames = useMemo(
    () => new Set(taskLabels.filter((l) => l.projectId).map((l) => l.name)),
    [taskLabels],
  );
  const assignedLabelNames = useMemo(
    () => new Set(taskLabels.filter((l) => !l.projectId).map((l) => l.name)),
    [taskLabels],
  );

  const handleToggleScope = async (
    scope: "tag" | "label",
    option: { id: string; name: string; taskId: string | null },
  ) => {
    try {
      const isTag = scope === "tag";
      const assigned = (isTag ? assignedTagNames : assignedLabelNames).has(
        option.name,
      );
      // Detaching needs the id of the copy on THIS task, not the palette row.
      const assignedCopy = taskLabels.find(
        (label) =>
          label.name === option.name && Boolean(label.projectId) === isTag,
      );

      if (assigned && assignedCopy) {
        if (isTag) {
          await detachTag({ tagId: assignedCopy.id });
          toast.success(t("tasks:popover.tags.removeSuccess"));
        } else {
          await detachLabel({ labelId: assignedCopy.id });
          toast.success(t("tasks:popover.labels.removeSuccess"));
        }
        return;
      }

      if (option.taskId !== null) return;
      if (isTag) {
        await attachTag({ tagId: option.id, taskId: task.id });
        toast.success(t("tasks:popover.tags.addSuccess"));
      } else {
        await attachLabel({ labelId: option.id, taskId: task.id });
        toast.success(t("tasks:popover.labels.addSuccess"));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tasks:update.error"),
      );
    }
  };

  const usersOptions = useMemo(() => {
    return workspaceUsers?.members?.map((member) => ({
      label: member?.user?.name ?? member.userId,
      value: member.userId,
      image: member?.user?.image ?? "",
      name: member?.user?.name ?? "",
    }));
  }, [workspaceUsers]);

  const handleCopyTaskLink = () => {
    const path = `/dashboard/workspace/${taskCardContext.worskpaceId}/project/${taskCardContext.projectId}/task/${task.id}`;
    const taskLink = generateLink(path);

    navigator.clipboard.writeText(taskLink);
    toast.success(t("tasks:contextMenu.copyLinkSuccess"));
  };

  // Same destination as the sheet's "Open in full page" button.
  const handleViewTask = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
      params: {
        workspaceId: taskCardContext.worskpaceId,
        projectId: taskCardContext.projectId,
        taskId: task.id,
      },
    });
  };

  const handleChange = async (field: keyof Task, value: string | Date) => {
    try {
      switch (field) {
        case "priority":
          await updateTaskPriority({ ...task, priority: value as string });
          break;
        case "status":
          await updateTaskStatus({ ...task, status: value as string });
          break;
        case "userId":
          await updateTaskAssignee({ ...task, userId: value as string });
          break;
        case "title":
          await updateTaskTitle({ ...task, title: value as string });
          break;
        case "description":
          await updateTaskDescription({
            ...task,
            description: value as string,
          });
          break;
        default:
          await updateTask({
            ...task,
            [field]: value,
          });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tasks:update.error"),
      );
    } finally {
      toast.success(t("tasks:update.success"));
    }
  };

  // Read-only users still see what is attached; the items are just disabled.
  const renderScopeSubmenu = (scope: "tag" | "label") => {
    const isTag = scope === "tag";
    const options = isTag ? tagOptions : labelOptions;
    const assignedNames = isTag ? assignedTagNames : assignedLabelNames;
    const canEditScope = isTag ? canEditTags : canEditLabels;
    if (!canEditScope && assignedNames.size === 0) return null;

    return (
      <ContextMenuSub key={scope}>
        <ContextMenuSubTrigger>
          <span>
            {t(isTag ? "tasks:contextMenu.tags" : "tasks:contextMenu.labels")}
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-48">
          {options.length === 0 ? (
            <ContextMenuItem disabled>
              <span>
                {t(
                  isTag
                    ? "tasks:contextMenu.noTags"
                    : "tasks:contextMenu.noLabels",
                )}
              </span>
            </ContextMenuItem>
          ) : (
            options.map((option) => (
              <ContextMenuCheckboxItem
                key={option.id}
                checked={assignedNames.has(option.name)}
                disabled={!canEditScope}
                onCheckedChange={() => handleToggleScope(scope, option)}
                closeOnClick={false}
                className="[&_svg]:text-muted-foreground"
              >
                <span
                  className="w-2 h-2 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      labelColors.find((c) => c.value === option.color)
                        ?.color || "var(--color-neutral-400)",
                  }}
                />
                <span className="max-w-32 truncate">{option.name}</span>
              </ContextMenuCheckboxItem>
            ))
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  };

  return (
    <ContextMenuContent className="w-46">
      <ContextMenuItem onClick={handleViewTask}>
        <span>{t("tasks:contextMenu.viewTask")}</span>
      </ContextMenuItem>

      <ContextMenuItem onClick={handleCopyTaskLink}>
        <span>{t("tasks:contextMenu.copyLink")}</span>
      </ContextMenuItem>

      {(canEdit || canAssign) && <ContextMenuSeparator />}

      {canEdit && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <span>{t("tasks:priority.label")}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuCheckboxItem
              key="no-priority"
              checked={task.priority === "no-priority"}
              onCheckedChange={() => handleChange("priority", "no-priority")}
              closeOnClick
              className="[&_svg]:text-muted-foreground"
            >
              {getPriorityIcon("no-priority")}
              <span>{getPriorityLabel("no-priority")}</span>
            </ContextMenuCheckboxItem>
            {["low", "medium", "high", "urgent"].map((priority) => (
              <ContextMenuCheckboxItem
                key={priority}
                checked={task.priority === priority}
                onCheckedChange={() => handleChange("priority", priority)}
                closeOnClick
                className="[&_svg]:text-muted-foreground"
              >
                {getPriorityIcon(priority)}
                <span className="capitalize">{getPriorityLabel(priority)}</span>
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {canEdit && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span>{t("tasks:status.label")}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {columns.map((col) => (
              <ContextMenuCheckboxItem
                key={col.slug}
                checked={task.status === col.slug}
                onCheckedChange={() => handleChange("status", col.slug)}
                closeOnClick
                className="[&_svg]:text-muted-foreground"
              >
                {getColumnIcon(col.slug, col.isFinal, col.icon)}
                <span>{col.name}</span>
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {renderScopeSubmenu("tag")}

      {renderScopeSubmenu("label")}

      {canEdit && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span>{t("tasks:dueDate.label")}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-fit min-w-0 p-0">
            <div className="p-2">
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={async (date) => {
                  try {
                    await updateTaskDueDate({
                      ...task,
                      dueDate: date?.toISOString() || null,
                    });
                    toast.success(t("tasks:dueDate.updateSuccess"));
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : t("tasks:dueDate.updateError"),
                    );
                  }
                }}
                className="w-full bg-popover!"
              />
            </div>
            {task.dueDate && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="gap-2 text-muted-foreground"
                  onClick={async () => {
                    try {
                      await updateTaskDueDate({
                        ...task,
                        dueDate: null,
                      });
                      toast.success(t("tasks:dueDate.clearSuccess"));
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t("tasks:dueDate.clearError"),
                      );
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                  <span>{t("tasks:dueDate.clear")}</span>
                </ContextMenuItem>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {canAssign && usersOptions && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span>{t("tasks:assignee.label")}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuCheckboxItem
              checked={!task.userId}
              onCheckedChange={() => handleChange("userId", "")}
              closeOnClick
            >
              <div
                className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center"
                title={t("tasks:assignee.unassigned")}
              >
                <span className="text-[10px] font-medium text-muted-foreground">
                  ?
                </span>{" "}
              </div>
              {t("tasks:assignee.unassigned")}
            </ContextMenuCheckboxItem>
            {usersOptions.map((user) => (
              <ContextMenuCheckboxItem
                key={user.value}
                checked={task.userId === user.value}
                onCheckedChange={() => handleChange("userId", user.value ?? "")}
                closeOnClick
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.image ?? ""} alt={user.name || ""} />
                  <AvatarFallback className="text-xs font-medium border border-border/30">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                {user.label}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {(canEdit || canDelete) && (
        <>
          {canEdit && (
            <>
              <ContextMenuSeparator />

              <ContextMenuItem
                onClick={() => handleChange("status", "archived")}
              >
                <span>{t("tasks:actions.archive")}</span>
              </ContextMenuItem>

              <ContextMenuItem
                onClick={() => handleChange("status", "planned")}
              >
                <span>{t("tasks:actions.markAsPlanned")}</span>
              </ContextMenuItem>
            </>
          )}

          {canDelete && (
            <>
              <ContextMenuSeparator />

              <ContextMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    onDeleteClick();
                  }, 0);
                }}
              >
                <span>{t("tasks:actions.delete")}</span>
              </ContextMenuItem>
            </>
          )}
        </>
      )}
    </ContextMenuContent>
  );
}
