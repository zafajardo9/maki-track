import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFrame,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import labelColors from "@/constants/label-colors";
import useCreateTag from "@/hooks/mutations/tag/use-create-tag";
import useDeleteTag from "@/hooks/mutations/tag/use-delete-tag";
import useUpdateTag from "@/hooks/mutations/tag/use-update-tag";
import useGetTagsByProject from "@/hooks/queries/tag/use-get-tags-by-project";
import { useProjectWebSocket } from "@/hooks/use-project-websocket";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

export default function ProjectTagsSettings({
  projectId,
}: {
  projectId: string;
}) {
  const { t } = useTranslation();
  useProjectWebSocket(projectId);
  const { canCreateTags, canUpdateTags, canDeleteTags } =
    useWorkspacePermission();
  const canCreate = canCreateTags();
  const canUpdate = canUpdateTags();
  const canDelete = canDeleteTags();

  const { data: tags = [] } = useGetTagsByProject(projectId);
  const paletteTags = tags.filter((tag) => !tag.taskId);

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("gray");
  const [createError, setCreateError] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("gray");
  const [editError, setEditError] = useState("");

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const resetCreate = () => {
    setNewName("");
    setNewColor("gray");
    setCreateError("");
  };

  const openCreate = () => {
    resetCreate();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError(t("settings:projectTags.nameRequired"));
      return;
    }

    try {
      await createTag.mutateAsync({
        name: trimmed,
        color: newColor,
        projectId,
      });
      toast.success(t("settings:projectTags.createSuccess"));
      setCreateOpen(false);
      resetCreate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:projectTags.createError"),
      );
    }
  };

  const openEdit = (tag: { id: string; name: string; color: string }) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingTag) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(t("settings:projectTags.nameRequired"));
      return;
    }

    try {
      await updateTag.mutateAsync({
        id: editingTag.id,
        name: trimmed,
        color: editColor,
      });
      toast.success(t("settings:projectTags.updateSuccess"));
      setEditOpen(false);
      setEditingTag(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:projectTags.updateError"),
      );
    }
  };

  const openDelete = (tag: { id: string; name: string }) => {
    setDeletingTag(tag);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTag) return;

    try {
      await deleteTag.mutateAsync({ id: deletingTag.id });
      toast.success(t("settings:projectTags.deleteSuccess"));
      setDeleteOpen(false);
      setDeletingTag(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:projectTags.deleteError"),
      );
    }
  };

  const getColorVar = (colorValue: string) =>
    labelColors.find((c) => c.value === colorValue)?.color ??
    "var(--color-neutral-400)";

  return (
    <>
      <PageTitle title={t("settings:projectTags.pageTitle")} />
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {t("settings:projectTags.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("settings:projectTags.subtitle")}
          </p>
        </div>

        <CardFrame>
          <Card className="!rounded-none !border-t-0">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Tag className="size-4" />
                {t("settings:projectTags.title")}
              </CardTitle>
              <CardDescription>
                {t("settings:projectTags.cardDescription")}
              </CardDescription>
              {canCreate && (
                <CardAction>
                  <Button onClick={openCreate} className="gap-2">
                    <Plus className="size-4" />
                    {t("settings:projectTags.createTag")}
                  </Button>
                </CardAction>
              )}
            </CardHeader>
          </Card>

          <Card className="!rounded-none">
            <CardPanel className="p-4">
              {paletteTags.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia>
                      <Tag className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>{t("settings:projectTags.empty")}</EmptyTitle>
                    <EmptyDescription />
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="divide-y divide-border">
                  {paletteTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between py-2.5 px-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: getColorVar(tag.color),
                          }}
                        />
                        <span className="text-sm truncate">{tag.name}</span>
                      </div>
                      {(canUpdate || canDelete) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("settings:projectTags.editTag")}
                              className="h-8 w-8"
                              onClick={() =>
                                openEdit({
                                  id: tag.id,
                                  name: tag.name,
                                  color: tag.color,
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("settings:projectTags.deleteTag")}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                openDelete({
                                  id: tag.id,
                                  name: tag.name,
                                })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardPanel>
          </Card>
        </CardFrame>
      </div>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings:projectTags.createTag")}</DialogTitle>
            <DialogDescription>
              {t("settings:projectTags.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-tag-name">
                {t("settings:projectTags.nameLabel")}
              </Label>
              <Input
                id="new-tag-name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setCreateError("");
                }}
                placeholder={t("settings:projectTags.namePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !createTag.isPending) handleCreate();
                }}
              />
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("settings:projectTags.colorLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {labelColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-[scale,border-color]",
                      newColor === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-110",
                    )}
                    style={{ backgroundColor: c.color }}
                    onClick={() => setNewColor(c.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleCreate} disabled={createTag.isPending}>
              {t("settings:projectTags.createTag")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setEditingTag(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings:projectTags.editTag")}</DialogTitle>
            <DialogDescription>
              {t("settings:projectTags.editDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">
                {t("settings:projectTags.nameLabel")}
              </Label>
              <Input
                id="edit-tag-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError("");
                }}
                placeholder={t("settings:projectTags.namePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !updateTag.isPending) handleEdit();
                }}
              />
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("settings:projectTags.colorLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {labelColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-[scale,border-color]",
                      editColor === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-110",
                    )}
                    style={{ backgroundColor: c.color }}
                    onClick={() => setEditColor(c.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingTag(null);
              }}
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleEdit} disabled={updateTag.isPending}>
              {t("settings:projectTags.saveTag")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setDeletingTag(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:projectTags.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:projectTags.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingTag(null);
              }}
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTag.isPending}
            >
              {t("settings:projectTags.deleteTag")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
