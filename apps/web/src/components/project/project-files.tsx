import { Link } from "@tanstack/react-router";
import {
  AudioLines,
  Download,
  FileArchive,
  FileCode,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  LoaderCircle,
  Presentation,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectFile } from "@/fetchers/project/get-project-files";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetProjectFiles from "@/hooks/queries/project/use-get-project-files";
import { cn } from "@/lib/cn";
import { formatDateMedium } from "@/lib/format";
import {
  type FileCategory,
  formatFileSize,
  getFileCategory,
} from "@/lib/project-files";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

const CATEGORY_ICONS: Record<
  FileCategory,
  React.ComponentType<{ className?: string }>
> = {
  archive: FileArchive,
  audio: AudioLines,
  document: FileText,
  image: FileImage,
  other: FileIcon,
  pdf: FileText,
  presentation: Presentation,
  spreadsheet: FileSpreadsheet,
  text: FileCode,
  video: FileVideo,
};

const KIND_FILTERS = ["all", "image", "attachment"] as const;
type KindFilter = (typeof KIND_FILTERS)[number];

const SORTS = ["newest", "oldest", "name", "largest"] as const;
type SortOption = (typeof SORTS)[number];

type ProjectFilesProps = {
  projectId: string;
  workspaceId: string;
};

function FileRow({
  file,
  projectSlug,
  workspaceId,
  projectId,
}: {
  file: ProjectFile;
  projectSlug: string | undefined;
  workspaceId: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const CategoryIcon =
    CATEGORY_ICONS[getFileCategory(file.mimeType, file.filename)];

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"
      >
        <CategoryIcon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          title={file.filename}
          className="block truncate text-sm text-foreground hover:underline"
        >
          {file.filename}
        </a>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDateMedium(file.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {file.uploadedBy?.name
              ? t("files:uploadedBy", { name: file.uploadedBy.name })
              : t("files:unknownUploader")}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {file.surface === "comment"
              ? t("files:sourceComment")
              : t("files:sourceDescription")}
          </span>
        </p>
      </div>

      {file.task && projectSlug && (
        <Link
          to="/dashboard/workspace/$workspaceId/project/$projectId/board"
          params={{ workspaceId, projectId }}
          search={{ taskId: file.task.id }}
          className="hidden shrink-0 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground sm:block"
          title={file.task.title}
        >
          {`${projectSlug}-${file.task.number}`}
        </Link>
      )}

      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("files:open", { name: file.filename })}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Download className="size-3.5" />
      </a>
    </li>
  );
}

export function ProjectFiles({ projectId, workspaceId }: ProjectFilesProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const { data, isLoading, isFetching } = useGetProjectFiles({
    projectId,
    q: query || undefined,
    kind,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  // Typing pauses are what the debounce is for, so the timer is cleared on
  // unmount as well as on the next keystroke.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setQuery(value.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const clearSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchInput("");
    setQuery("");
    setPage(1);
  };

  const selectKind = (next: KindFilter) => {
    setKind(next);
    setPage(1);
  };

  const selectSort = (next: SortOption) => {
    setSort(next);
    setPage(1);
  };

  const files = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalSize = data?.totalSize ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const hasFilters = Boolean(query) || kind !== "all";

  const kindLabels: Record<KindFilter, string> = {
    all: t("files:filterAll"),
    attachment: t("files:filterFiles"),
    image: t("files:filterImages"),
  };

  const sortLabels: Record<SortOption, string> = {
    largest: t("files:sortLargest"),
    name: t("files:sortName"),
    newest: t("files:sortNewest"),
    oldest: t("files:sortOldest"),
  };

  return (
    <div className="h-full min-h-0 overflow-auto bg-background p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="w-full sm:max-w-sm">
            <InputGroupInput
              type="search"
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={t("files:searchPlaceholder")}
              aria-label={t("files:searchPlaceholder")}
            />
            {/* The addon has to follow the input in the DOM: it places itself
                with `order-first`, and the primitive sizes and tints the icon
                from there, so neither is set by hand here. */}
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {searchInput && (
              <InputGroupAddon align="inline-end">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={clearSearch}
                  aria-label={t("files:clearSearch")}
                >
                  <X aria-hidden="true" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5">
              {KIND_FILTERS.map((option) => (
                <Button
                  key={option}
                  variant={kind === option ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => selectKind(option)}
                  className={cn(
                    "h-6 rounded-md px-2 text-xs",
                    kind !== option && "text-muted-foreground",
                  )}
                >
                  {kindLabels[option]}
                </Button>
              ))}
            </div>

            <Select
              value={sort}
              onValueChange={(value) => {
                if (typeof value === "string") selectSort(value as SortOption);
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue>{sortLabels[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {sortLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("files:count", { count: total })}</span>
          {totalSize > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatFileSize(totalSize)}</span>
            </>
          )}
          {isFetching && !isLoading && (
            <LoaderCircle className="size-3.5 animate-spin" />
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : files.length > 0 ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                projectId={projectId}
                projectSlug={project?.slug}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        ) : (
          <Empty className="rounded-xl border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {hasFilters ? <Search /> : <FileIcon />}
              </EmptyMedia>
              <EmptyTitle>
                {hasFilters ? t("files:noResultsTitle") : t("files:emptyTitle")}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? t("files:noResultsDescription")
                  : t("files:emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("files:previousPage")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("files:pageOf", { page, totalPages })}
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("files:nextPage")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectFiles;
