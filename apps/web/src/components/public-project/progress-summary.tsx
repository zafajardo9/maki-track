import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { buildColumnCompletion } from "@/lib/chart-data";

type PublicProgressSummaryProps = {
  columns: ReadonlyArray<{
    slug: string;
    name: string;
    isFinal: boolean;
    tasks: ReadonlyArray<unknown>;
  }>;
};

/**
 * The first thing a client opening a shared link wants: how much of it is done.
 *
 * Counts only the tasks sitting in a column, and treats a task as complete when
 * its column is marked final — the same rule the rest of the app uses, so this
 * number cannot disagree with the board a member sees.
 */
export function PublicProgressSummary({ columns }: PublicProgressSummaryProps) {
  const { t } = useTranslation();
  const completion = buildColumnCompletion(columns);
  const total = completion.completed + completion.open;

  if (total === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium text-foreground text-sm">
          {t("publicProject:progress.title")}
        </span>
        <span className="text-muted-foreground text-xs">
          {t("publicProject:progress.counts", {
            completed: completion.completed,
            total,
          })}
          {" · "}
          <span className="font-medium text-foreground tabular-nums">
            {t("publicProject:progress.percent", {
              percent: completion.percentage,
            })}
          </span>
        </span>
      </div>
      <Progress value={completion.percentage} />
    </div>
  );
}
