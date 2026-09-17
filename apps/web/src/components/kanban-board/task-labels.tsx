import { LabelChip } from "@/components/common/label-chip";
import type Task from "@/types/task";

export function TaskLabels({
  labels,
  compact = false,
}: {
  labels: NonNullable<Task["labels"]>;
  compact?: boolean;
}) {
  if (!labels.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {[...labels]
        .sort(
          (a, b) => Number(Boolean(b.projectId)) - Number(Boolean(a.projectId)),
        )
        .map((label) => (
          <LabelChip key={label.id} label={label} compact={compact} />
        ))}
    </div>
  );
}
