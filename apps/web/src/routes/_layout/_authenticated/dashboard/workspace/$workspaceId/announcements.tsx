import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import {
  type AnnouncementKind,
  sortedAnnouncements,
} from "@/constants/announcements";
import { formatDateMedium } from "@/lib/format";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/announcements",
)({
  component: RouteComponent,
});

function KindBadge({ kind }: { kind: AnnouncementKind }) {
  const { t } = useTranslation();

  return (
    <span
      className={
        kind === "announcement"
          ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs"
          : "rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 font-medium text-muted-foreground text-xs"
      }
    >
      {t(`navigation:announcementsPage.kinds.${kind}`)}
    </span>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const entries = sortedAnnouncements();

  return (
    <>
      <PageTitle title={t("navigation:announcementsPage.pageTitle")} />
      <WorkspaceLayout title={t("navigation:announcementsPage.pageTitle")}>
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {t("navigation:announcementsPage.description")}
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="mt-8 text-muted-foreground text-sm">
              {t("navigation:announcementsPage.empty")}
            </p>
          ) : (
            <ol className="mt-6 space-y-6 border-border/60 border-l pl-6">
              {entries.map((entry) => (
                <li className="relative" key={`${entry.date}-${entry.title}`}>
                  <span
                    aria-hidden="true"
                    className="-left-[27px] absolute top-1.5 size-2 rounded-full border border-border bg-background"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                    <KindBadge kind={entry.kind} />
                    <time dateTime={entry.date}>
                      {formatDateMedium(`${entry.date}T00:00:00Z`)}
                    </time>
                  </div>
                  <h2 className="mt-2 font-medium text-base leading-snug">
                    {entry.title}
                  </h2>
                  <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                    {entry.body}
                  </p>
                  {entry.href ? (
                    <a
                      className="mt-2 inline-block font-medium text-primary text-sm hover:underline"
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("navigation:announcementsPage.readMore")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </WorkspaceLayout>
    </>
  );
}
