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
        <Button size="sm" aria-label={copyAriaLabel} onClick={onCopy}>
          {copyLabel}
        </Button>
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

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicLink = getPublicProjectLink(projectId, origin);
  const internalLink = getProjectInternalLink({
    projectId,
    workspaceId,
    origin,
  });

  const copy = (value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success(t("settings:projectVisibility.copiedToast")),
      () => toast.error(t("shareProject:copyFailed")),
    );
  };

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
          <ShareRow
            inputId="share-project-public-url"
            label={t("settings:projectVisibility.publicUrl")}
            hint={
              isPublic
                ? t("settings:projectVisibility.publicUrlHint")
                : t("shareProject:publicUrlPrivateHint")
            }
            value={publicLink}
            copyLabel={t("settings:projectVisibility.copy")}
            copyAriaLabel={t("shareProject:copyPublicUrlAria")}
            onCopy={() => copy(publicLink)}
          />

          <Separator />

          <ShareRow
            inputId="share-project-internal-url"
            label={t("shareProject:internalUrl")}
            hint={t("shareProject:internalUrlHint")}
            value={internalLink}
            copyLabel={t("settings:projectVisibility.copy")}
            copyAriaLabel={t("shareProject:copyInternalUrlAria")}
            onCopy={() => copy(internalLink)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
