import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/get-initials";

type AssigneeAvatarProps = {
  name: string | null;
  image: string | null;
  className?: string;
};

/**
 * An assignee's picture, falling back to their initials. `AvatarImage` resolves
 * database-backed avatar paths itself, so the raw `assigneeImage` from the API
 * is passed straight through. Nobody assigned gets the same "?" placeholder the
 * task cards use.
 */
export function AssigneeAvatar({
  name,
  image,
  className,
}: AssigneeAvatarProps) {
  const { t } = useTranslation();

  if (!name && !image) {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted",
          className,
        )}
        title={t("tasks:assignee.unassigned")}
      >
        <span className="font-medium text-[10px] text-muted-foreground">?</span>
      </span>
    );
  }

  return (
    <Avatar className={cn("h-5 w-5", className)}>
      <AvatarImage src={image ?? ""} alt={name ?? ""} />
      <AvatarFallback className="border border-border/30 font-medium text-xs">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
