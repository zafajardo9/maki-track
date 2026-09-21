import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import useUpdateProject from "@/hooks/mutations/project/use-update-project";
import useGetProject from "@/hooks/queries/project/use-get-project";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import {
  getProjectInternalLink,
  getPublicProjectLink,
} from "@/lib/project-share-link";
import { toast } from "@/lib/toast";

type ShareProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  workspaceId: string;
  isPublic: boolean | null | undefined;
};

type ShareRowProps = {
  /** Ties the visible label to its input; without it the label points at nothing. */
  inputId: string;
  label: string;
  hint: string;
  value: string;
  openLabel: string;
  /** Distinguishes the two "Open" buttons for assistive technology. */
  openAriaLabel: string;
  /** The public link only resolves once the project is public. */
  openDisabled: boolean;
  onOpen: () => void;
  copyLabel: string;
  /** Distinguishes the two "Copy" buttons for assistive technology. */
  copyAriaLabel: string;
  onCopy: () => void;
};

function ShareRow({
  inputId,
  label,
  hint,
  value,
  openLabel,
  openAriaLabel,
  openDisabled,
  onOpen,
  copyLabel,
  copyAriaLabel,
  onCopy,
}: ShareRowProps) {
  return (
    // Stacks below `sm`, so the label never competes with the field for width.
    // In the row layout the text keeps a readable column and the field takes the
    // rest, rather than a fixed input width squeezing the hint into a narrow
    // ribbon.
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 space-y-0.5 sm:w-56 sm:shrink-0">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="flex w-full min-w-0 items-center gap-2">
        <Input
          id={inputId}
          readOnly
          value={value}
          className="w-full sm:flex-1"
        />
        {/* The buttons keep their width; the field is what gives way. */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label={openAriaLabel}
            disabled={openDisabled}
            onClick={onOpen}
          >
            <ExternalLink className="size-3.5" />
            {openLabel}
          </Button>
          <Button size="sm" aria-label={copyAriaLabel} onClick={onCopy}>
            {copyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Both links a project can be shared with, side by side, because which one is
 * usable depends on the project's visibility. The layout mirrors the visibility
 * screen's URL row so the two read as the same control.
 */
export function ShareProjectDialog({
  open,
  onClose,
  projectId,
  projectName,
  workspaceId,
  isPublic,
}: ShareProjectDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const publicAccessId = useId();
  const { hasPermission } = useWorkspacePermission();
  const { mutateAsync: updateProject } = useUpdateProject();
  // The callers that host this dialog already read the project, so this is
  // normally the same cache entry rather than a second request.
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const [canShare, setCanShare] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const savingRef = useRef(false);

  // `project:share` is deliberately not one of the cached capabilities, so it
  // has to be asked for — and only while the dialog is open. Same check the
  // visibility screen makes.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void hasPermission({ project: ["share"] }).then((allowed) => {
      if (!cancelled) setCanShare(allowed);
    });

    return () => {
      cancelled = true;
    };
  }, [open, hasPermission]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicLink = getPublicProjectLink(projectId, origin);
  const internalLink = getProjectInternalLink({
    projectId,
    workspaceId,
    origin,
  });

  // The fetched project is the fresher source once a toggle round-trips.
  const projectVisibility = project ? project.isPublic : isPublic;
  // Nothing worth showing when visibility is unknown, and nothing to offer
  // someone who cannot change it.
  const showVisibilityToggle =
    canShare &&
    project?.accessMode !== "restricted" &&
    typeof projectVisibility === "boolean";

  const openLink = (value: string) => {
    if (!value) return;
    window.open(value, "_blank", "noopener,noreferrer");
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success(t("settings:projectVisibility.copiedToast")),
      () => toast.error(t("shareProject:copyFailed")),
    );
  };

  const handleToggleVisibility = useCallback(async () => {
    if (!project || savingRef.current) return;
    savingRef.current = true;
    setIsSavingVisibility(true);

    try {
      await updateProject({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description || "",
        icon: project.icon || "Layout",
        isPublic: !project.isPublic,
      });
      // Prefix match covers the project list and the single-project entry this
      // dialog, the sidebar and the header all read from.
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("settings:projectVisibility.toastUpdated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:projectVisibility.toastUpdateError"),
      );
    } finally {
      savingRef.current = false;
      setIsSavingVisibility(false);
    }
  }, [project, updateProject, queryClient, t]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("shareProject:title")}</DialogTitle>
          <DialogDescription>
            {t("shareProject:description", { project: projectName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-md border border-border bg-sidebar p-4">
          {/* Public access and the public link answer one question between them
              — the toggle decides whether the link resolves — so they are one
              group rather than two rows split by a rule. The internal link is
              the separate one, and is the only rule left inside the card. */}
          <div className="space-y-3" data-slot="share-public-group">
            {showVisibilityToggle && (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <Label
                    className="text-sm font-medium"
                    htmlFor={publicAccessId}
                  >
                    {t("settings:projectVisibility.publicAccess")}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t("settings:projectVisibility.publicAccessHint")}
                  </p>
                </div>
                <Switch
                  checked={Boolean(projectVisibility)}
                  disabled={isSavingVisibility}
                  id={publicAccessId}
                  onCheckedChange={handleToggleVisibility}
                />
              </div>
            )}

            <ShareRow
              inputId="share-project-public-url"
              label={t("settings:projectVisibility.publicUrl")}
              hint={
                isPublic
                  ? t("settings:projectVisibility.publicUrlHint")
                  : t("shareProject:publicUrlPrivateHint")
              }
              value={publicLink}
              openLabel={t("common:actions.open")}
              openAriaLabel={t("shareProject:openPublicUrlAria")}
              openDisabled={!projectVisibility}
              onOpen={() => openLink(publicLink)}
              copyLabel={t("settings:projectVisibility.copy")}
              copyAriaLabel={t("shareProject:copyPublicUrlAria")}
              onCopy={() => copy(publicLink)}
            />
          </div>

          <Separator />

          <ShareRow
            inputId="share-project-internal-url"
            label={t("shareProject:internalUrl")}
            hint={t("shareProject:internalUrlHint")}
            value={internalLink}
            openLabel={t("common:actions.open")}
            openAriaLabel={t("shareProject:openInternalUrlAria")}
            openDisabled={false}
            onOpen={() => openLink(internalLink)}
            copyLabel={t("settings:projectVisibility.copy")}
            copyAriaLabel={t("shareProject:copyInternalUrlAria")}
            onCopy={() => copy(internalLink)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
