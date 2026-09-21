import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

const mockSelect = vi.fn();

vi.mock("../../../apps/api/src/database", () => ({
  default: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

import getProjectFiles from "../../../apps/api/src/project/controllers/get-project-files";

const API_BASE = "https://maki.test/api";

const summaryRow = { total: 1, totalSize: 2048 };

const fileRow = {
  activityId: null,
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  filename: "contract.pdf",
  id: "asset-1",
  kind: "attachment",
  mimeType: "application/pdf",
  size: 2048,
  surface: "description",
  taskId: "task-1",
  taskNumber: 12,
  taskTitle: "Sign the contract",
  uploaderEmail: "ana@example.com",
  uploaderId: "user-1",
  uploaderImage: null,
  uploaderName: "Ana",
};

// The controller reads the summary first and the page second, so the canned
// results are handed out in that order.
function queueSelectResults(results: unknown[][]) {
  const queue = [...results];

  mockSelect.mockImplementation(() => {
    const result = queue.shift() ?? [];
    // A thenable that also carries the `orderBy` chain: the summary query is
    // awaited straight off `where()`, while the page query keeps going.
    const terminal = Object.assign(Promise.resolve(result), {
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve(result)) })),
      })),
    });
    const chain: Record<string, Mock> = {
      from: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      where: vi.fn(() => terminal),
    };
    return chain;
  });
}

describe("getProjectFiles", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a row to a downloadable file with its task and uploader", async () => {
    queueSelectResults([[summaryRow], [fileRow]]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      projectId: "project-1",
    });

    expect(result.data).toEqual([
      {
        activityId: null,
        createdAt: fileRow.createdAt,
        filename: "contract.pdf",
        id: "asset-1",
        kind: "attachment",
        mimeType: "application/pdf",
        size: 2048,
        surface: "description",
        task: { id: "task-1", number: 12, title: "Sign the contract" },
        uploadedBy: {
          email: "ana@example.com",
          id: "user-1",
          image: null,
          name: "Ana",
        },
        // The stored object key is never exposed; the id is what streams it.
        url: `${API_BASE}/asset/asset-1`,
      },
    ]);
  });

  it("reports the filtered totals rather than the size of the page", async () => {
    queueSelectResults([[{ total: 45, totalSize: 900_000 }], [fileRow]]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      limit: 24,
      page: 2,
      projectId: "project-1",
    });

    expect(result.totalSize).toBe(900_000);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 24,
      total: 45,
      totalPages: 2,
    });
  });

  it("caps the page size so a caller cannot ask for the whole project at once", async () => {
    queueSelectResults([[summaryRow], []]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      limit: 5_000,
      projectId: "project-1",
    });

    expect(result.pagination.pageSize).toBe(100);
  });

  it("defaults to the first page when the page number is unusable", async () => {
    queueSelectResults([[summaryRow], []]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      page: 0,
      projectId: "project-1",
    });

    expect(result.pagination.page).toBe(1);
  });

  it("drops the task and uploader once the task or the account is gone", async () => {
    queueSelectResults([
      [{ total: 1, totalSize: 10 }],
      [
        {
          ...fileRow,
          activityId: "activity-1",
          surface: "comment",
          taskId: null,
          taskNumber: null,
          taskTitle: null,
          uploaderEmail: null,
          uploaderId: null,
          uploaderName: null,
        },
      ],
    ]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      projectId: "project-1",
    });

    expect(result.data[0]?.task).toBeNull();
    expect(result.data[0]?.uploadedBy).toBeNull();
    expect(result.data[0]?.activityId).toBe("activity-1");
    expect(result.data[0]?.surface).toBe("comment");
  });

  it("folds unrecognised kind and surface values into the safe defaults", async () => {
    queueSelectResults([
      [{ total: 1, totalSize: 10 }],
      [{ ...fileRow, kind: "video", surface: "somewhere-else" }],
    ]);

    const result = await getProjectFiles({
      apiBaseUrl: API_BASE,
      projectId: "project-1",
    });

    expect(result.data[0]?.kind).toBe("attachment");
    expect(result.data[0]?.surface).toBe("description");
  });
});
