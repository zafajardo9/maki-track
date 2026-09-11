// Semantic colours shared by every chart, so the same idea is never painted two
// different ways. All of them resolve to theme tokens defined in index.css, so
// light and dark mode follow automatically.

/** Finished work. Used by both the workspace and project completion charts. */
export const COMPLETED_COLOR = "var(--success)";

/** Everything still outstanding, in a neutral so the completed slice leads. */
export const OPEN_COLOR = "var(--muted-foreground)";

/** A column the project marks final, in the project status breakdown. */
export const FINAL_COLUMN_COLOR = "var(--success)";

/** The single accent used for per-project progress bars. */
export const PROJECT_BAR_COLOR = "var(--chart-2)";

// An escalation ramp rather than unrelated hues: urgent and high reuse the
// app's destructive and warning tokens, and the lower two step down in
// intensity from there.
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--destructive)",
  high: "var(--warning)",
  medium: "color-mix(in srgb, var(--warning) 55%, transparent)",
  low: "var(--info)",
  "no-priority": "var(--muted-foreground)",
};

export function priorityColor(priority: string) {
  return PRIORITY_COLORS[priority] ?? "var(--chart-3)";
}
