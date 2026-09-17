import { LabelChip } from "@/components/common/label-chip";

type PublicTaskLabelsProps = {
  labels: Array<{
    id: string;
    name: string;
    color: string;
    projectId?: string | null;
  }>;
};

export function PublicTaskLabels({ labels }: PublicTaskLabelsProps) {
  if (!labels || labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {[...labels]
        .sort(
          (a, b) => Number(Boolean(b.projectId)) - Number(Boolean(a.projectId)),
        )
        .map((label) => (
          <LabelChip key={label.id} label={label} />
        ))}
    </div>
  );
}
