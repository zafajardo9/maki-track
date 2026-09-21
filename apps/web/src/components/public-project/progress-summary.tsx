import { useTranslation } from "react-i18next";
import { COMPLETED_COLOR, OPEN_COLOR } from "@/components/charts/chart-colors";
import { DonutChart } from "@/components/charts/donut-chart";
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
 *
 * The donut mirrors the workspace overview's CompletionCard, and the per-column
 * breakdown shows where the remaining work sits. Column bars use the same
 * completed/open colors as the ring so the two visuals read as one statement.
 */
export function PublicProgressSummary({ columns }: PublicProgressSummaryProps) {
  const { t } = useTranslation();
  const completion = buildColumnCompletion(columns);
  const total = completion.completed + completion.open;

  if (total === 0) {
    return null;
  }

  const maxColumnTasks = Math.max(
    ...columns.map((column) => column.tasks.length),
    1,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium text-foreground text-sm">
          {t("publicProject:progress.title")}
        </span>
        <span className="text-muted-foreground text-xs">
          {t("publicProject:progress.counts", {
            completed: completion.completed,
            total,
          })}
        </span>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <DonutChart
          className="sm:w-72 sm:shrink-0"
          segments={[
            {
              key: "completed",
              label: t("publicProject:progress.completed"),
              value: completion.completed,
              color: COMPLETED_COLOR,
            },
            {
              key: "open",
              label: t("publicProject:progress.open"),
              value: completion.open,
              color: OPEN_COLOR,
            },
          ]}
          centerValue={t("publicProject:progress.percent", {
            percent: completion.percentage,
          })}
          centerCaption={t("publicProject:progress.centerCaption")}
        />

        <ul className="min-w-0 flex-1 space-y-2.5">
          {columns.map((column) => {
            const count = column.tasks.length;
            return (
              <li key={column.slug} className="flex items-center gap-3 text-sm">
                <span
                  className="w-28 shrink-0 truncate text-muted-foreground"
                  title={column.name}
                >
                  {column.name}
                </span>
                <span
                  aria-hidden="true"
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${(count / maxColumnTasks) * 100}%`,
                      backgroundColor: column.isFinal
                        ? COMPLETED_COLOR
                        : OPEN_COLOR,
                    }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-medium tabular-nums">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
