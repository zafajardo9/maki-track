import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useAttachLabelToTask from "@/hooks/mutations/label/use-attach-label-to-task";
import useCreateLabel from "@/hooks/mutations/label/use-create-label";
import useDetachLabelFromTask from "@/hooks/mutations/label/use-detach-label-from-task";
import useAttachTagToTask from "@/hooks/mutations/tag/use-attach-tag-to-task";
import useCreateTag from "@/hooks/mutations/tag/use-create-tag";
import useDetachTagFromTask from "@/hooks/mutations/tag/use-detach-tag-from-task";
import useGetLabelsByTask from "@/hooks/queries/label/use-get-labels-by-task";
import useGetLabelsByWorkspace from "@/hooks/queries/label/use-get-labels-by-workspace";
import useGetTagsByProject from "@/hooks/queries/tag/use-get-tags-by-project";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { getTaskLabelOptions } from "@/lib/get-task-label-options";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

const labelColors = [
  { value: "gray", key: "stone", color: "var(--color-stone-500)" },
  { value: "dark-gray", key: "slate", color: "var(--color-slate-500)" },
  { value: "purple", key: "lavender", color: "var(--color-violet-500)" },
  { value: "teal", key: "sage", color: "var(--color-emerald-600)" },
  { value: "green", key: "forest", color: "var(--color-green-600)" },
  { value: "yellow", key: "amber", color: "var(--color-amber-600)" },
  { value: "orange", key: "terracotta", color: "var(--color-orange-600)" },
  { value: "pink", key: "rose", color: "var(--color-rose-600)" },
  { value: "red", key: "crimson", color: "var(--color-red-600)" },
];

type LabelColor =
  | "gray"
  | "dark-gray"
  | "purple"
  | "teal"
  | "green"
  | "yellow"
  | "orange"
  | "pink"
  | "red";

type TaskLabelRow = {
  id: string;
  name: string;
  color: string;
  taskId: string | null;
  projectId?: string | null;
};

type TaskLabelsPopoverProps = {
  task: Task;
  workspaceId: string;
  children: React.ReactNode;
  triggerNativeButton?: boolean;
  /**
   * Restricts the picker to a single pool. The task surface keeps Tags and
   * Labels on separate rows, so each row's control opens only its own pool
   * instead of a merged list.
   */
  scope?: LabelScope | "both";
};

type PopoverStep = "select" | "color";

// Which pool a newly typed name will be created in. Tags live on the task's
// project, labels on the workspace, and the same name may exist in both.
type LabelScope = "tag" | "label";

// Scope of a row is derived from projectId: tags always belong to a project,
// workspace labels never do.
function isTagRow(row: Pick<TaskLabelRow, "projectId">) {
  return Boolean(row.projectId);
}

export default function TaskLabelsPopover({
  task,
  workspaceId,
  children,
  triggerNativeButton = true,
  scope = "both",
}: TaskLabelsPopoverProps) {
  const { t } = useTranslation();
  const showsTags = scope !== "label";
  const showsLabels = scope !== "tag";
  // A scoped picker only ever creates in its own pool.
  const defaultCreateScope: LabelScope = scope === "tag" ? "tag" : "label";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PopoverStep>("select");
  const [searchValue, setSearchValue] = useState("");
  const [selectedColor, setSelectedColor] = useState<LabelColor>("gray");
  const [newLabelName, setNewLabelName] = useState("");
  const [createScope, setCreateScope] =
    useState<LabelScope>(defaultCreateScope);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { mutateAsync: attachLabel } = useAttachLabelToTask();
  const { mutateAsync: createLabel } = useCreateLabel();
  const { mutateAsync: detachLabel } = useDetachLabelFromTask();
  const { mutateAsync: attachTag } = useAttachTagToTask();
  const { mutateAsync: createTag } = useCreateTag();
  const { mutateAsync: detachTag } = useDetachTagFromTask();
  const { canCreateLabels, canCreateTags, canUpdateLabels, canUpdateTags } =
    useWorkspacePermission();
  const canCreateLabel = canCreateLabels();
  const canCreateTag = canCreateTags();
  const canEditLabels = canUpdateLabels();
  const canEditTags = canUpdateTags();

  const { data: taskLabels = [] } = useGetLabelsByTask(task.id);
  const { data: workspaceLabels = [] } = useGetLabelsByWorkspace(workspaceId);
  const { data: projectTags = [] } = useGetTagsByProject(task.projectId);

  const labelPaletteNames = useMemo(
    () =>
      new Set(
        workspaceLabels
          .filter((label) => label.taskId === null)
          .map((label) => label.name.toLowerCase()),
      ),
    [workspaceLabels],
  );

  const tagPaletteNames = useMemo(
    () =>
      new Set(
        projectTags
          .filter((tag) => tag.taskId === null)
          .map((tag) => tag.name.toLowerCase()),
      ),
    [projectTags],
  );

  const tagOptions = useMemo(() => {
    if (!showsTags) return [];
    const options = getTaskLabelOptions(projectTags, task.id).filter((row) =>
      isTagRow(row),
    );
    return options.filter((tag) =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [projectTags, searchValue, task.id, showsTags]);

  const labelOptions = useMemo(() => {
    if (!showsLabels) return [];
    const options = getTaskLabelOptions(workspaceLabels, task.id).filter(
      (row) => !isTagRow(row),
    );
    return options.filter((label) =>
      label.name.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [workspaceLabels, searchValue, task.id, showsLabels]);

  const isAssigned = (option: TaskLabelRow) =>
    taskLabels.some(
      (label) =>
        label.name === option.name && isTagRow(label) === isTagRow(option),
    );

  const isCreatingNewLabel = useMemo(
    () =>
      Boolean(searchValue) && !labelPaletteNames.has(searchValue.toLowerCase()),
    [labelPaletteNames, searchValue],
  );

  const isCreatingNewTag = useMemo(
    () =>
      Boolean(searchValue) && !tagPaletteNames.has(searchValue.toLowerCase()),
    [tagPaletteNames, searchValue],
  );

  useEffect(() => {
    if (open && step === "select" && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, step]);

  const resetPopover = () => {
    setStep("select");
    setSearchValue("");
    setNewLabelName("");
    setSelectedColor("gray");
    setCreateScope(defaultCreateScope);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetPopover, 200);
  };

  const handleToggleOption = async (option: TaskLabelRow) => {
    try {
      const assignedCopy = taskLabels.find(
        (label) =>
          label.name === option.name && isTagRow(label) === isTagRow(option),
      );

      if (assignedCopy) {
        if (isTagRow(option)) {
          await detachTag({ tagId: assignedCopy.id });
          toast.success(t("tasks:popover.tags.removeSuccess"));
        } else {
          await detachLabel({ labelId: assignedCopy.id });
          toast.success(t("tasks:popover.labels.removeSuccess"));
        }
      } else {
        if (option.taskId !== null) return;
        if (isTagRow(option)) {
          await attachTag({ tagId: option.id, taskId: task.id });
          toast.success(t("tasks:popover.tags.addSuccess"));
        } else {
          await attachLabel({ labelId: option.id, taskId: task.id });
          toast.success(t("tasks:popover.labels.addSuccess"));
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.labels.updateError"),
      );
    }
  };

  const handleCreateNewClick = (scope: LabelScope) => {
    setCreateScope(scope);
    setNewLabelName(searchValue);
    setStep("color");
  };

  const handleColorSelect = async (color: LabelColor) => {
    setSelectedColor(color);

    // Creation starts as soon as a color is picked, so an empty name is a no-op.
    if (!newLabelName.trim()) return;

    try {
      const trimmedName = newLabelName.trim();

      if (createScope === "tag") {
        // Tags are scoped to the task's project; the palette row is then
        // attached so the same tag can be reused on other tasks.
        const createdTag = await createTag({
          name: trimmedName,
          color: color,
          projectId: task.projectId,
        });

        await attachTag({
          tagId: createdTag.id,
          taskId: task.id,
        });

        toast.success(t("tasks:popover.tags.createSuccess"));
      } else {
        const createdLabel = await createLabel({
          name: trimmedName,
          color: color,
          workspaceId,
        });

        await attachLabel({
          labelId: createdLabel.id,
          taskId: task.id,
        });

        toast.success(t("tasks:popover.labels.createSuccess"));
      }

      await queryClient.invalidateQueries({
        queryKey: ["tasks", task.projectId],
      });

      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              createScope === "tag"
                ? "tasks:popover.tags.createError"
                : "tasks:popover.labels.createError",
            ),
      );
    }
  };

  const renderOptionRow = (option: TaskLabelRow) => {
    const assigned = isAssigned(option);
    const scopeAllowed = isTagRow(option) ? canEditTags : canEditLabels;
    const disabled = !scopeAllowed;
    const disabledReason = disabled
      ? t(
          isTagRow(option)
            ? "tasks:popover.tags.noPermission"
            : "tasks:popover.labels.noPermission",
        )
      : undefined;

    return (
      // The title lives on a wrapper because disabled buttons do not fire
      // hover events, so a title on the button itself would never show.
      <span key={option.id} title={disabledReason} className="block">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={assigned}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleToggleOption(option)}
        >
          <div className="flex-shrink-0 w-3 flex justify-center">
            {assigned && <Check className="w-3 h-3" />}
          </div>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                labelColors.find((c) => c.value === option.color)?.color ||
                "var(--color-neutral-400)",
            }}
          />
          <span className="max-w-20 truncate">{option.name}</span>
        </button>
      </span>
    );
  };

  // Two explicit create rows rather than one: the same name may exist as both a
  // tag and a label, so a single "Create" would have to guess the pool.
  const renderCreateRow = (scope: LabelScope) => (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 text-left"
      onClick={() => handleCreateNewClick(scope)}
    >
      <div className="flex-shrink-0 w-3 flex justify-center">
        <Plus className="w-3 h-3" />
      </div>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor:
            labelColors.find((c) => c.value === selectedColor)?.color ||
            "var(--color-neutral-400)",
        }}
      />
      <span className="truncate">
        {t(
          scope === "tag"
            ? "tasks:popover.tags.create"
            : "tasks:popover.labels.create",
          { name: searchValue },
        )}
      </span>
    </button>
  );

  const renderSelectStep = () => {
    const totalOptions = tagOptions.length + labelOptions.length;
    const showTagsHeading = showsTags && tagOptions.length > 0;
    const showLabelsHeading =
      showsLabels && labelOptions.length > 0 && tagOptions.length > 0;
    const showCreateTag = showsTags && canCreateTag && isCreatingNewTag;
    const showCreateLabel = showsLabels && canCreateLabel && isCreatingNewLabel;

    return (
      <div className="w-auto">
        <div className="flex items-center gap-2 p-2 border-b border-border">
          <Search className="w-3 h-3 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={
              scope === "tag"
                ? t("tasks:popover.tags.searchPlaceholder")
                : scope === "label"
                  ? t("tasks:popover.labels.searchPlaceholder")
                  : t("tasks:popover.searchPlaceholder")
            }
            className="border-none p-0 h-auto focus-visible:ring-0 shadow-none !bg-transparent"
          />
        </div>

        <div className="py-1">
          {totalOptions === 0 && searchValue.length === 0 && (
            <span className="text-xs text-muted-foreground px-2">
              {scope === "tag"
                ? t("tasks:tags.empty")
                : scope === "label"
                  ? t("tasks:labels.empty")
                  : t("tasks:popover.labels.empty")}
            </span>
          )}

          {showTagsHeading && (
            <div className="px-2 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("tasks:tags.label")}
            </div>
          )}
          {tagOptions.map(renderOptionRow)}

          {showLabelsHeading && (
            <div className="px-2 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("tasks:labels.label")}
            </div>
          )}
          {labelOptions.map(renderOptionRow)}

          {(showCreateTag || showCreateLabel) && totalOptions > 0 && (
            <div className="border-t border-border my-1" />
          )}
          {showCreateTag && renderCreateRow("tag")}
          {showCreateLabel && renderCreateRow("label")}
        </div>
      </div>
    );
  };

  const renderColorStep = () => (
    <div className="w-auto">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <span className="text-xs font-medium">
          {t(
            createScope === "tag"
              ? "tasks:popover.tags.chooseColor"
              : "tasks:popover.labels.chooseColor",
          )}
        </span>
        <button
          type="button"
          onClick={() => setStep("select")}
          className="w-4 h-4 flex items-center justify-center hover:bg-accent/50 rounded"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="py-1">
        {labelColors.map((color) => (
          <button
            key={color.value}
            type="button"
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 text-left",
              selectedColor === color.value && "bg-accent/30",
            )}
            onClick={() => handleColorSelect(color.value as LabelColor)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color.color }}
            />
            <span className="truncate">
              {t(`tasks:popover.labels.colors.${color.key}`)}
            </span>
            {selectedColor === color.value && (
              <Check className="w-3 h-3 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Without a label- or tag-update permission the trigger renders as a plain
  // element, so users can still see the existing labels without opening edit
  // controls.
  if (!canEditLabels && !canEditTags) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild nativeButton={triggerNativeButton}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        {step === "select" && renderSelectStep()}
        {step === "color" && renderColorStep()}
      </PopoverContent>
    </Popover>
  );
}
