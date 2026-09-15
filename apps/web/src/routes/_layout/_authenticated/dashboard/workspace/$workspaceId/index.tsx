import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Plus } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceOverviewCharts } from "@/components/charts/workspace-overview-charts";
import WorkspaceSchedule from "@/components/charts/workspace-schedule";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import icons from "@/constants/project-icons";
import { shortcuts } from "@/constants/shortcuts";
import useReorderProjects from "@/hooks/mutations/project/use-reorder-projects";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/",
)({
  component: RouteComponent,
});

function SortableProjectRow({
  id,
  canReorder,
  onClick,
  children,
}: {
  id: string;
  canReorder: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id,
    disabled: !canReorder,
    // The reorder already moves the row; animating the index change too
    // replays the same move from a stale offset.
    animateLayoutChanges: () => false,
    // dnd-kit defaults to `ease`; this is the app's curve.
    transition: { duration: 200, easing: "var(--ease-out)" },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Only while a drag is live, or the dropped row eases back from the drop
    // point over a list that has already reordered.
    transition: isSorting ? transition : undefined,
  };

  return (
    // `listeners` without `attributes`: the latter puts role="button" and a tab
    // stop on the row.
    <TableRow
      ref={setNodeRef}
      style={style}
      data-maki-sortable=""
      className={cn(
        "group/row cursor-pointer",
        isDragging && "relative z-10 bg-muted shadow-md",
      )}
      onClick={onClick}
      {...(canReorder ? listeners : {})}
    >
      {children}
    </TableRow>
  );
}

// The workspace home shows either the analytics overview or the project list.
// The tab bar is shared with the loading state so the chrome does not shift
// once the projects arrive.
function WorkspaceViewTabs({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="dashboard" className="gap-0">
      <div className="px-6 pt-6 pb-4">
        {/* The list is `w-fit`, so it needs an explicit auto margin to sit in
            the middle of the content area. */}
        <TabsList className="mx-auto">
          <TabsTrigger value="dashboard">
            {t("workspace:overview.tabs.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="projects">
            {t("workspace:overview.tabs.projects")}
          </TabsTrigger>
        </TabsList>
      </div>

      {children}
    </Tabs>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = useGetProjects({
    workspaceId,
    refresh: true,
  });
  const reorderProjects = useReorderProjects();

  // React state, not the query cache: dnd-kit clears its transforms with a
  // setState in the same handler, while a cache write notifies a task later,
  // leaving a frame with the transforms gone and the rows not yet moved.
  const [droppedOrder, setDroppedOrder] = useState<string[] | null>(null);

  const orderedProjects = useMemo(() => {
    if (!projects || !droppedOrder) return projects;

    const rank = new Map(droppedOrder.map((id, index) => [id, index]));

    return [...projects].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [projects, droppedOrder]);

  // Released once the server agrees, or a reorder made elsewhere stays pinned.
  useEffect(() => {
    if (!droppedOrder || !projects) return;
    if (projects.map((project) => project.id).join() === droppedOrder.join()) {
      setDroppedOrder(null);
    }
  }, [projects, droppedOrder]);

  const { canCreateProjects, canUpdateProjects } = useWorkspacePermission();
  const canCreate = canCreateProjects();
  // Matches the API, which gates /project/reorder on `project: ["update"]`
  // alone — not the create+update+delete bundle.
  const canReorder = canUpdateProjects();

  // Below these thresholds the row is still a link and the page still scrolls;
  // above them the gesture becomes a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = () => {
    document.body.classList.add("maki-dragging");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    document.body.classList.remove("maki-dragging");

    if (!over || active.id === over.id || !orderedProjects) return;

    const oldIndex = orderedProjects.findIndex(
      (project) => project.id === active.id,
    );
    const newIndex = orderedProjects.findIndex(
      (project) => project.id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedProjects, oldIndex, newIndex);

    setDroppedOrder(reordered.map((project) => project.id));

    reorderProjects(workspaceId, reordered, {
      onError: () => {
        setDroppedOrder(null);
        toast.error(t("workspace:projects.reorderError"));
      },
    });
  };

  const handleCreateProject = () => {
    if (!canCreate) return;
    setIsCreateProjectOpen(true);
  };

  useRegisterShortcuts({
    sequentialShortcuts: {
      [shortcuts.project.prefix]: {
        [shortcuts.project.create]: handleCreateProject,
      },
    },
  });

  const handleProjectClick = (projectId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: { workspaceId, projectId },
    });
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title={t("workspace:projects.pageTitle")} />
        <WorkspaceLayout
          title={t("workspace:projects.pageTitle")}
          headerActions={
            canCreate ? (
              <Button
                variant="outline"
                size="xs"
                onClick={handleCreateProject}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                {t("workspace:projects.createProject")}
              </Button>
            ) : null
          }
        >
          <WorkspaceViewTabs>
            <TabsPanel value="dashboard" className="space-y-6 px-6 pb-8">
              <Skeleton className="h-24 rounded-2xl" />
              <div className="grid gap-6 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-80 rounded-2xl" />
                ))}
              </div>
            </TabsPanel>

            <TabsPanel value="projects">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.title")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.created")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.progress")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.nextTaskDue")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="py-3">
                        <Skeleton className="h-2 w-20" />
                      </TableCell>
                      <TableCell className="py-3">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="py-3">
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsPanel>
          </WorkspaceViewTabs>
        </WorkspaceLayout>
      </>
    );
  }

  if (isError && !projects) {
    return (
      <WorkspaceLayout title={t("workspace:projects.pageTitle")}>
        <div role="alert" className="space-y-3 p-6">
          <p>{t("workspace:overview.loadError")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("workspace:overview.schedule.retry")}
          </Button>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <>
        <PageTitle title={t("workspace:projects.pageTitle")} />
        <WorkspaceLayout
          title={t("workspace:projects.pageTitle")}
          headerActions={
            canCreate ? (
              <Button
                variant="outline"
                size="xs"
                onClick={handleCreateProject}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                {t("workspace:projects.createProject")}
              </Button>
            ) : null
          }
        >
          <Empty className="min-h-[60vh]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutGrid />
              </EmptyMedia>
              <EmptyTitle>{t("workspace:projects.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {canCreate
                  ? t("workspace:projects.emptyDescription")
                  : t("workspace:projects.emptyDescriptionReadOnly")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {canCreate && (
                <Button onClick={handleCreateProject}>
                  <Plus />
                  {t("workspace:projects.createProject")}
                </Button>
              )}
            </EmptyContent>
          </Empty>
        </WorkspaceLayout>

        <CreateProjectModal
          open={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("workspace:projects.pageTitle")} />
      <WorkspaceLayout
        title={t("workspace:projects.pageTitle")}
        headerActions={
          canCreate ? (
            <Button
              variant="outline"
              size="xs"
              onClick={handleCreateProject}
              className="gap-1"
            >
              <Plus className="w-3 h-3" />
              {t("workspace:projects.createProject")}
            </Button>
          ) : null
        }
      >
        <WorkspaceViewTabs>
          <TabsPanel value="dashboard" className="space-y-6 px-6 pb-8">
            <WorkspaceOverviewCharts projects={orderedProjects ?? []} />
            <WorkspaceSchedule workspaceId={workspaceId} />
          </TabsPanel>

          <TabsPanel value="projects">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() =>
                document.body.classList.remove("maki-dragging")
              }
            >
              <Table>
                <TableHeader className="p-4">
                  <TableRow>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.title")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.created")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.progress")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.nextTaskDue")}
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      {t("workspace:projects.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={orderedProjects?.map((project) => project.id) ?? []}
                    strategy={verticalListSortingStrategy}
                  >
                    {orderedProjects?.map((project) => {
                      if (!project?.id || !project.statistics) return null;

                      const IconComponent =
                        icons[project.icon as keyof typeof icons] ||
                        icons.Layout;

                      const getStatusText = () => {
                        if (project.statistics.totalTasks === 0)
                          return t(
                            "workspace:projects.projectStatus.notStarted",
                          );
                        if (project.statistics.completionPercentage === 100)
                          return t("workspace:projects.projectStatus.complete");
                        return t("workspace:projects.projectStatus.inProgress");
                      };

                      const getStatusVariant = () => {
                        if (project.statistics.totalTasks === 0)
                          return "secondary";
                        if (project.statistics.completionPercentage === 100)
                          return "default";
                        return "outline";
                      };

                      return (
                        <SortableProjectRow
                          key={project.id}
                          id={project.id}
                          canReorder={canReorder}
                          onClick={() => handleProjectClick(project.id)}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-5 h-5 text-muted-foreground" />
                              <span className="font-medium">
                                {project.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <time
                              dateTime={project.createdAt}
                              className="whitespace-nowrap text-muted-foreground text-sm"
                            >
                              {formatDateMedium(project.createdAt)}
                            </time>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={project.statistics.completionPercentage}
                                className="w-16 h-2"
                              />
                              <span className="text-sm text-muted-foreground">
                                {project.statistics.completionPercentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-sm text-muted-foreground">
                              {project.statistics.dueDate
                                ? formatDateMedium(project.statistics.dueDate)
                                : t("workspace:projects.noDueDate")}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={getStatusVariant()}>
                              {getStatusText()}
                            </Badge>
                          </TableCell>
                        </SortableProjectRow>
                      );
                    })}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </TabsPanel>
        </WorkspaceViewTabs>
      </WorkspaceLayout>

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}
