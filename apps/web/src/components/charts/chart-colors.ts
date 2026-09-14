// Chart-only neutral tones follow the theme; task priority badges retain their
// semantic colors elsewhere in the product.
export const COMPLETED_COLOR = "var(--chart-1)";
export const OPEN_COLOR = "var(--chart-4)";
export const FINAL_COLUMN_COLOR = COMPLETED_COLOR;
export const PROJECT_BAR_COLOR = "var(--chart-1)";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--chart-1)",
  high: "var(--chart-2)",
  medium: "var(--chart-3)",
  low: "var(--chart-4)",
  "no-priority": "var(--chart-5)",
};

export function priorityColor(priority: string) {
  return PRIORITY_COLORS[priority] ?? "var(--chart-5)";
}
