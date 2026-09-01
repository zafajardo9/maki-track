export type MakiWorkspace = { id: string; name: string; slug?: string };
export type MakiProject = { id: string; name: string; slug: string };
export type MakiColumn = { id: string; name: string; slug: string };
export type MakiTask = { id: string; title: string; number: number };
export type MakiLabel = { id: string; name: string; color: string };
export type MakiMember = { id: string; name: string; email: string };

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, "");
    if (path === "/api" || path.endsWith("/api")) {
      path = path.replace(/\/?api$/, "") || "/";
    }
    return `${url.protocol}//${url.host}${path === "/" ? "" : path}`;
  } catch {
    return trimmed.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
}

export class MakiClient {
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { baseUrl: string; apiKey: string }) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
  }

  listWorkspaces(): Promise<MakiWorkspace[]> {
    return this.request<MakiWorkspace[]>("/api/auth/organization/list");
  }

  listProjects(workspaceId: string): Promise<MakiProject[]> {
    return this.request<MakiProject[]>(
      `/api/project?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  }

  listMembers(workspaceId: string): Promise<MakiMember[]> {
    return this.request<MakiMember[]>(
      `/api/workspace/${encodeURIComponent(workspaceId)}/members`,
    );
  }

  createProject(input: {
    name: string;
    workspaceId: string;
    icon: string;
    slug: string;
  }): Promise<MakiProject> {
    return this.request<MakiProject>("/api/project", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listColumns(projectId: string): Promise<MakiColumn[]> {
    return this.request<MakiColumn[]>(
      `/api/column/${encodeURIComponent(projectId)}`,
    );
  }

  createColumn(
    projectId: string,
    input: { name: string; isFinal?: boolean },
  ): Promise<MakiColumn> {
    return this.request<MakiColumn>(
      `/api/column/${encodeURIComponent(projectId)}`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  deleteColumn(columnId: string): Promise<unknown> {
    return this.request(`/api/column/${encodeURIComponent(columnId)}`, {
      method: "DELETE",
    });
  }

  createTask(
    projectId: string,
    input: {
      title: string;
      description: string;
      status: string;
      priority: string;
      dueDate?: string;
      userId?: string;
    },
  ): Promise<MakiTask> {
    return this.request<MakiTask>(
      `/api/task/${encodeURIComponent(projectId)}`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  // Never use PUT /label/:id/task: it moves an existing label row off
  // whichever task already had it. This upserts in both scopes.
  createLabel(input: {
    name: string;
    color: string;
    workspaceId: string;
    taskId?: string;
  }): Promise<MakiLabel> {
    return this.request<MakiLabel>("/api/label", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createTaskRelation(input: {
    sourceTaskId: string;
    targetTaskId: string;
    relationType: "subtask" | "blocks" | "related";
  }): Promise<unknown> {
    return this.request("/api/task-relation", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createComment(
    taskId: string,
    content: string,
    externalUserName?: string,
  ): Promise<unknown> {
    return this.request(`/api/comment/${encodeURIComponent(taskId)}`, {
      method: "POST",
      body: JSON.stringify({
        content,
        ...(externalUserName
          ? { externalUserName, externalSource: "planka" }
          : {}),
      }),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Accept", "application/json");
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Maki ${path}: ${reason}`);
    }

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      throw new Error(`Maki ${path}: ${describeError(body, res.status)}`);
    }

    return body as T;
  }
}

function describeError(body: unknown, status: number): string {
  if (status === 401) {
    return "unauthorized (HTTP 401), check your Maki API key";
  }
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error"]) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  if (typeof body === "string" && body.length > 0) {
    return body.length > 300 ? `${body.slice(0, 300)}…` : body;
  }
  return `HTTP ${status}`;
}
