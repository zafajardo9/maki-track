type TaskScopedLabel = {
  name: string;
  taskId: string | null;
  projectId?: string | null;
};

// Labels and project tags may share a name ("bug" in both pools). Options are
// keyed by scope + name so a tag never hides a same-named label and vice
// versa; within one scope a palette row still wins over a task-scoped copy.
export function getTaskLabelOptions<T extends TaskScopedLabel>(
  labels: T[],
  taskId: string,
) {
  const labelMap = new Map<string, T>();

  for (const label of labels) {
    if (label.taskId !== null && label.taskId !== taskId) continue;

    const key = `${label.projectId ? "tag" : "label"}:${label.name}`;
    const existing = labelMap.get(key);
    if (!existing || (label.taskId === null && existing.taskId !== null)) {
      labelMap.set(key, label);
    }
  }

  return Array.from(labelMap.values());
}
