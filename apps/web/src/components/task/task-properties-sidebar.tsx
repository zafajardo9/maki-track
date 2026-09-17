import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Copy,
  GitBranch,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LabelChip } from "@/components/common/label-chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { KbdSequence } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import useGetGiteaIntegration from "@/hooks/queries/gitea-integration/use-get-gitea-integration";
import useGetGithubIntegration from "@/hooks/queries/github-integration/use-get-github-integration";
import useGetLabelsByTask from "@/hooks/queries/label/use-get-labels-by-task";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetTask from "@/hooks/queries/task/use-get-task";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-get-active-workspace-users";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { getColumnIcon } from "@/lib/column";
import {
  dueDateStatusColors,
  getDueDateStatus,
  isTaskCompleted,
} from "@/lib/due-date-status";
import { formatDateShort } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import { getPriorityLabel, getStatusDisplayLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import { toast } from "@/lib/toast";
import TaskAssigneePopover from "./task-assignee-popover";
import TaskDueDatePopover from "./task-due-date-popover";
import TaskLabelsPopover from "./task-labels-popover";
import TaskMovePopover from "./task-move-popover";
import TaskPriorityPopover from "./task-priority-popover";
import TaskStartDatePopover from "./task-start-date-popover";
import TaskStatusPopover from "./task-status-popover";

function slugify(text: string | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function generateBranchName(
  pattern: string,
  projectSlug: string | undefined,
  taskNumber: number | null | undefined,
  taskTitle: string | undefined,
): string {
  if (!projectSlug || !taskNumber) return "";
  return pattern
    .replace("{slug}", projectSlug.toLowerCase())
    .replace("{number}", taskNumber.toString())
    .replace("{title}", slugify(taskTitle));
}

type TaskPropertiesSidebarProps = {
  taskId: string | undefined;
  projectId: string;
  workspaceId: string;
  className?: string;
  compact?: boolean;
};

export default function TaskPropertiesSidebar({
  taskId,
  projectId,
  workspaceId,
  className,
  compact = false,
}: TaskPropertiesSidebarProps) {
  const { t } = useTranslation();
  const { data: task } = useGetTask(taskId ?? "");
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const { data: columns = [] } = useGetColumns(projectId);
  const taskIsCompleted = isTaskCompleted(task?.status ?? "", columns);
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: taskLabels = [] } = useGetLabelsByTask(taskId ?? "");
  const { data: githubIntegration } = useGetGithubIntegration(projectId);
  const { data: giteaIntegration } = useGetGiteaIntegration(projectId);
  const { data: workspaceProjects = [] } = useGetProjects({ workspaceId });
  const { canUpdateLabels, canUpdateTags } = useWorkspacePermission();
  const canEditLabels = canUpdateLabels();
  const canEditTags = canUpdateTags();
  // A task carries copies of both pools in one list; scope comes from projectId.
  const assignedTags = taskLabels.filter((label) => Boolean(label.projectId));
  const assignedLabels = taskLabels.filter((label) => !label.projectId);
  const canMoveTask =
    Boolean(task) && workspaceProjects.some((p) => p.id !== task?.projectId);
  const statusColumn = columns.find(
    (column) => column.slug === task?.status || column.id === task?.status,
  );
  const statusLabel = getStatusDisplayLabel(
    task?.status ?? "",
    statusColumn?.name,
  );
  const statusIsFinal = statusColumn?.isFinal ?? false;
  const statusIcon = statusColumn?.icon;

  const projectSlug = project?.slug;
  const taskNumber = task?.number;
  const branchPattern =
    githubIntegration?.branchPattern ||
    giteaIntegration?.branchPattern ||
    "{slug}-{number}";

  const assignee = workspaceUsers?.members?.find(
    (member) => member.userId === task?.userId,
  );

  const handleCopyTaskLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/workspace/${workspaceId}/project/${projectId}/task/${taskId}`,
    );
    toast.message(t("tasks:properties.copyTaskLink"));
  };

  const handleCopyTaskBranch = () => {
    const branchName = generateBranchName(
      branchPattern,
      projectSlug,
      taskNumber,
      task?.title,
    );
    navigator.clipboard.writeText(branchName);
    toast.message(t("tasks:properties.copyTaskBranch"));
  };

  return (
    <div className={className}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        {/* Compact mode: properties + icons in one row */}
        {compact && (
          <div className="flex flex-row-reverse gap-2 w-full border-b border-border">
            <div className="flex px-3 py-2">
              {task && canMoveTask && (
                <TaskMovePopover
                  task={task}
                  workspaceId={workspaceId}
                  triggerClassName="rounded-l-md rounded-r-none border-r-0"
                />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-foreground border-r-0",
                        canMoveTask ? "rounded-none" : "rounded-r-none",
                      )}
                      onClick={() => handleCopyTaskLink()}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <KbdSequence
                      keys={["Ctrl", "Shift", "C"]}
                      description={t("tasks:properties.copyTaskLink")}
                      separator=""
                    />
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-foreground rounded-l-none"
                      onClick={() => handleCopyTaskBranch()}
                    >
                      <GitBranch className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <KbdSequence
                      keys={["Ctrl", "Shift", "G"]}
                      description={t("tasks:properties.copyTaskBranch")}
                      separator=""
                    />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-row flex-wrap gap-1 items-center p-2 w-full">
              {task && (
                <TaskStatusPopover task={task}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-7 px-1.5 gap-1.5"
                  >
                    {getColumnIcon(
                      task.status ?? "",
                      statusIsFinal,
                      statusIcon,
                    )}
                    <span className="text-xs font-semibold truncate">
                      {statusLabel}
                    </span>
                  </Button>
                </TaskStatusPopover>
              )}
              {task && (
                <TaskPriorityPopover task={task}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-7 px-1.5 gap-1.5"
                  >
                    {getPriorityIcon(task.priority ?? "")}
                    <span className="text-xs font-semibold truncate">
                      {getPriorityLabel(task.priority ?? "")}
                    </span>
                  </Button>
                </TaskPriorityPopover>
              )}
              {task && (
                <TaskAssigneePopover task={task} workspaceId={workspaceId}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-7 px-1.5 gap-1.5"
                  >
                    {task.userId ? (
                      <Avatar className="h-[16px] w-[16px]">
                        <AvatarImage
                          src={assignee?.user?.image ?? ""}
                          alt={assignee?.user?.name || ""}
                        />
                        <AvatarFallback className="text-[9px] font-medium border border-border/30 flex-shrink-0 h-[16px] w-[16px]">
                          {getInitials(
                            assignee?.user?.name || task.assigneeName,
                          )}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className="w-[16px] h-[16px] rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0"
                        title={t("tasks:popover.assignee.unassigned")}
                      >
                        <span className="text-[8px] font-medium">?</span>
                      </div>
                    )}
                    <span className="text-xs font-semibold truncate max-w-[100px]">
                      {assignee?.user?.name ||
                        task.assigneeName ||
                        t("tasks:popover.assignee.unassigned")}
                    </span>
                  </Button>
                </TaskAssigneePopover>
              )}
              {task && (
                <TaskStartDatePopover task={task}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-7 px-1.5 gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    <span
                      className={`text-xs font-semibold ${task.startDate ? "" : "text-muted-foreground"}`}
                    >
                      {task.startDate
                        ? formatDateShort(task.startDate)
                        : t("tasks:properties.start")}
                    </span>
                  </Button>
                </TaskStartDatePopover>
              )}
              {task && (
                <TaskDueDatePopover task={task}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-7 px-1.5 gap-1.5"
                  >
                    {task.dueDate ? (
                      <>
                        {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                          "overdue" && (
                          <CalendarX
                            className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                          />
                        )}
                        {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                          "due-soon" && (
                          <CalendarClock
                            className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                          />
                        )}
                        {(getDueDateStatus(task.dueDate, taskIsCompleted) ===
                          "far-future" ||
                          getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "no-due-date") && (
                          <Calendar
                            className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                          />
                        )}
                        <span className="text-xs font-semibold">
                          {formatDateShort(task.dueDate)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t("tasks:properties.noDate")}
                        </span>
                      </>
                    )}
                  </Button>
                </TaskDueDatePopover>
              )}
            </div>
          </div>
        )}

        {!compact && (
          <>
            {/* Mobile: Compact-style layout */}
            <div className="flex flex-row-reverse gap-2 w-full border-b border-border lg:hidden">
              <div className="flex px-3 py-2">
                {task && canMoveTask && (
                  <TaskMovePopover
                    task={task}
                    workspaceId={workspaceId}
                    triggerClassName="rounded-l-md rounded-r-none border-r-0"
                  />
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "text-foreground border-r-0",
                          canMoveTask ? "rounded-none" : "rounded-r-none",
                        )}
                        onClick={() => handleCopyTaskLink()}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <KbdSequence
                        keys={["Ctrl", "Shift", "C"]}
                        description={t("tasks:properties.copyTaskLink")}
                        separator=""
                      />
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-foreground rounded-l-none"
                        onClick={() => handleCopyTaskBranch()}
                      >
                        <GitBranch className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <KbdSequence
                        keys={["Ctrl", "Shift", "G"]}
                        description={t("tasks:properties.copyTaskBranch")}
                        separator=""
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex flex-row flex-wrap gap-1 items-center p-2 w-full">
                {task && (
                  <TaskStatusPopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5"
                    >
                      {getColumnIcon(
                        task.status ?? "",
                        statusIsFinal,
                        statusIcon,
                      )}
                      <span className="text-xs font-semibold truncate">
                        {statusLabel}
                      </span>
                    </Button>
                  </TaskStatusPopover>
                )}
                {task && (
                  <TaskPriorityPopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5"
                    >
                      {getPriorityIcon(task.priority ?? "")}
                      <span className="text-xs font-semibold truncate">
                        {getPriorityLabel(task.priority ?? "")}
                      </span>
                    </Button>
                  </TaskPriorityPopover>
                )}
                {task && (
                  <TaskAssigneePopover task={task} workspaceId={workspaceId}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5"
                    >
                      {task.userId ? (
                        <Avatar className="h-[16px] w-[16px]">
                          <AvatarImage
                            src={assignee?.user?.image ?? ""}
                            alt={assignee?.user?.name || ""}
                          />
                          <AvatarFallback className="text-[9px] font-medium border border-border/30 shrink-0 h-[16px] w-[16px]">
                            {getInitials(
                              assignee?.user?.name || task.assigneeName,
                            )}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div
                          className="w-[16px] h-[16px] rounded-full bg-muted border border-border flex items-center justify-center shrink-0"
                          title={t("tasks:popover.assignee.unassigned")}
                        >
                          <span className="text-[8px] font-medium">?</span>
                        </div>
                      )}
                      <span className="text-xs font-semibold truncate max-w-[100px]">
                        {assignee?.user?.name ||
                          task.assigneeName ||
                          t("tasks:popover.assignee.unassigned")}
                      </span>
                    </Button>
                  </TaskAssigneePopover>
                )}
                {task && (
                  <TaskStartDatePopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      <span
                        className={`text-xs font-semibold ${task.startDate ? "" : "text-muted-foreground"}`}
                      >
                        {task.startDate
                          ? formatDateShort(task.startDate)
                          : t("tasks:properties.start")}
                      </span>
                    </Button>
                  </TaskStartDatePopover>
                )}
                {task && (
                  <TaskDueDatePopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5"
                    >
                      {task.dueDate ? (
                        <>
                          {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "overdue" && (
                            <CalendarX
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "due-soon" && (
                            <CalendarClock
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          {(getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "far-future" ||
                            getDueDateStatus(task.dueDate, taskIsCompleted) ===
                              "no-due-date") && (
                            <Calendar
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          <span className="text-xs font-semibold">
                            {formatDateShort(task.dueDate)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t("tasks:properties.noDate")}
                          </span>
                        </>
                      )}
                    </Button>
                  </TaskDueDatePopover>
                )}
              </div>
            </div>

            {/* Desktop: Title + stacked properties */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border lg:border-none">
                <p className="text-sm font-medium text-foreground/70 flex-1">
                  {t("tasks:properties.title")}
                </p>
                <div className="flex">
                  {task && canMoveTask && (
                    <TaskMovePopover
                      task={task}
                      workspaceId={workspaceId}
                      triggerClassName="rounded-l-md rounded-r-none border-r-0"
                    />
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "text-foreground border-r-0",
                            canMoveTask ? "rounded-none" : "rounded-r-none",
                          )}
                          onClick={() => handleCopyTaskLink()}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <KbdSequence
                          keys={["Ctrl", "Shift", "C"]}
                          description={t("tasks:properties.copyTaskLink")}
                          separator=""
                        />
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-foreground rounded-l-none"
                          onClick={() => handleCopyTaskBranch()}
                        >
                          <GitBranch className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <KbdSequence
                          keys={["Ctrl", "Shift", "G"]}
                          description={t("tasks:properties.copyTaskBranch")}
                          separator=""
                        />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-3 py-3">
                {task && (
                  <TaskStatusPopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5 w-full"
                    >
                      {getColumnIcon(
                        task.status ?? "",
                        statusIsFinal,
                        statusIcon,
                      )}
                      <span className="text-xs font-semibold truncate">
                        {statusLabel}
                      </span>
                    </Button>
                  </TaskStatusPopover>
                )}
                {task && (
                  <TaskPriorityPopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5 w-full"
                    >
                      {getPriorityIcon(task.priority ?? "")}
                      <span className="text-xs font-semibold truncate">
                        {getPriorityLabel(task.priority ?? "")}
                      </span>
                    </Button>
                  </TaskPriorityPopover>
                )}
                {task && (
                  <TaskAssigneePopover task={task} workspaceId={workspaceId}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5 w-full"
                    >
                      {task.userId ? (
                        <Avatar className="h-[16px] w-[16px]">
                          <AvatarImage
                            src={assignee?.user?.image ?? ""}
                            alt={assignee?.user?.name || ""}
                          />
                          <AvatarFallback className="text-[9px] font-medium border border-border/30 shrink-0 h-[16px] w-[16px]">
                            {getInitials(
                              assignee?.user?.name || task.assigneeName,
                            )}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div
                          className="w-[16px] h-[16px] rounded-full bg-muted border border-border flex items-center justify-center shrink-0"
                          title={t("tasks:popover.assignee.unassigned")}
                        >
                          <span className="text-[8px] font-medium">?</span>
                        </div>
                      )}
                      <span className="text-xs font-semibold truncate max-w-[100px]">
                        {assignee?.user?.name ||
                          task.assigneeName ||
                          t("tasks:popover.assignee.unassigned")}
                      </span>
                    </Button>
                  </TaskAssigneePopover>
                )}
                {task && (
                  <TaskStartDatePopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5 w-full"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      <span
                        className={`text-xs font-semibold ${task.startDate ? "" : "text-muted-foreground"}`}
                      >
                        {task.startDate
                          ? formatDateShort(task.startDate)
                          : t("tasks:properties.startDate")}
                      </span>
                    </Button>
                  </TaskStartDatePopover>
                )}
                {task && (
                  <TaskDueDatePopover task={task}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 px-1.5 gap-1.5 w-full"
                    >
                      {task.dueDate ? (
                        <>
                          {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "overdue" && (
                            <CalendarX
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          {getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "due-soon" && (
                            <CalendarClock
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          {(getDueDateStatus(task.dueDate, taskIsCompleted) ===
                            "far-future" ||
                            getDueDateStatus(task.dueDate, taskIsCompleted) ===
                              "no-due-date") && (
                            <Calendar
                              className={`w-3.5 h-3.5 ${dueDateStatusColors[getDueDateStatus(task.dueDate, taskIsCompleted)]}`}
                            />
                          )}
                          <span className="text-xs font-semibold">
                            {formatDateShort(task.dueDate)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t("tasks:properties.noDate")}
                          </span>
                        </>
                      )}
                    </Button>
                  </TaskDueDatePopover>
                )}
              </div>
            </div>
          </>
        )}

        {(() => {
          const scopes = ["tag", "label"] as const;

          const scopeHeading = (scope: "tag" | "label") =>
            t(
              scope === "tag"
                ? "tasks:properties.tags"
                : "tasks:properties.labels",
            );

          const renderScopeChips = (scope: "tag" | "label") => {
            const items = scope === "tag" ? assignedTags : assignedLabels;
            return (
              <>
                {task &&
                  items.map((label) => (
                    <TaskLabelsPopover
                      key={`edit-${label.id}`}
                      task={task}
                      workspaceId={workspaceId}
                      triggerNativeButton={false}
                      scope={scope}
                    >
                      <LabelChip
                        label={label}
                        compact
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                    </TaskLabelsPopover>
                  ))}
              </>
            );
          };

          // Per-scope add control for the roomier full-page view, which keeps
          // the two headed sections.
          const renderScopeAdd = (scope: "tag" | "label") => {
            const items = scope === "tag" ? assignedTags : assignedLabels;
            const canEditScope = scope === "tag" ? canEditTags : canEditLabels;
            if (!task || !canEditScope) return null;
            const addItem = t(
              scope === "tag"
                ? "tasks:properties.addTag"
                : "tasks:properties.addLabel",
            );

            return (
              <TaskLabelsPopover
                task={task}
                workspaceId={workspaceId}
                scope={scope}
              >
                {items.length > 0 ? (
                  // The Button must stay the popover trigger's direct child.
                  // Wrapping it in a context-only component (a Tooltip, say)
                  // makes the trigger render that component instead of a DOM
                  // node, so its click handler never reaches a real element and
                  // the picker silently fails to open. The label comes from
                  // `title` + `aria-label` instead.
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={addItem}
                    title={addItem}
                    className="size-6 rounded-full p-0"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1.5 px-2 text-xs text-muted-foreground"
                  >
                    <Plus className="size-3.5" />
                    {addItem}
                  </Button>
                )}
              </TaskLabelsPopover>
            );
          };

          // Tags first: they are the project-local pool and read as the more
          // specific grouping.
          const visibleScopes = scopes.filter((scope) => {
            const items = scope === "tag" ? assignedTags : assignedLabels;
            const canEditScope = scope === "tag" ? canEditTags : canEditLabels;
            return items.length > 0 || canEditScope;
          });
          if (visibleScopes.length === 0) return null;

          // Compact mode (the details sheet): each pool keeps its own row, so a
          // tag and a label never share a line and each row owns its add action.
          if (compact) {
            return (
              <div className="flex flex-col gap-1.5 px-3 pt-2 pb-3">
                {visibleScopes.map((scope) => (
                  <div
                    key={scope}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {scopeHeading(scope)}
                    </span>
                    {renderScopeChips(scope)}
                    {renderScopeAdd(scope)}
                  </div>
                ))}
              </div>
            );
          }

          return visibleScopes.map((scope) => (
            <div key={scope} className="flex flex-col gap-1 py-2 px-2 lg:px-3">
              <span className="text-xs font-medium text-foreground/70">
                {scopeHeading(scope)}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {renderScopeChips(scope)}
                {renderScopeAdd(scope)}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
