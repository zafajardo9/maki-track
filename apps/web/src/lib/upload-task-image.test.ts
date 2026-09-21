import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadTaskImage } from "./upload-task-image";

const mocks = vi.hoisted(() => ({
  createImageUpload: vi.fn(),
  finalizeImageUpload: vi.fn(),
}));

vi.mock("@/fetchers/task/create-image-upload", () => ({
  default: mocks.createImageUpload,
  finalizeImageUpload: mocks.finalizeImageUpload,
}));

describe("uploadTaskImage", () => {
  beforeEach(() => {
    mocks.createImageUpload.mockResolvedValue({
      uploadUrl: "https://upload.imagekit.io/v1/files/upload",
      folder: "workspace/w1/project/p1/task/t1/comments",
      fileName: "server-123.conf",
      filePath: "workspace/w1/project/p1/task/t1/comments/server-123.conf",
      publicKey: "public_test",
      signature: "sig",
      token: "token",
      expire: "1234567890",
    });
    mocks.finalizeImageUpload.mockResolvedValue({
      url: "https://maki.test/api/asset/abc123",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          fileId: "file_test",
          filePath: "workspace/w1/project/p1/task/t1/comments/server-123.conf",
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("POSTs the file to ImageKit with the signed upload fields", async () => {
    const file = new File(["server config"], "server.conf");

    await uploadTaskImage({
      taskId: "task-1",
      surface: "comment",
      file,
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://upload.imagekit.io/v1/files/upload");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    expect(body.get("file")).toBe(file);
    expect(body.get("fileName")).toBe("server-123.conf");
    expect(body.get("folder")).toContain("comments");
    expect(body.get("publicKey")).toBe("public_test");
    expect(body.get("signature")).toBe("sig");
    expect(body.get("token")).toBe("token");
    expect(body.get("expire")).toBe("1234567890");
    expect(body.get("useUniqueFileName")).toBe("false");
    expect(body.get("isPrivateFile")).toBe("true");
  });

  it("uses a generic content type when the browser cannot detect one", async () => {
    const file = new File(["server config"], "server.conf");

    const asset = await uploadTaskImage({
      taskId: "task-1",
      surface: "comment",
      file,
    });

    expect(file.type).toBe("");
    expect(mocks.createImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/octet-stream" }),
    );
    expect(mocks.finalizeImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "application/octet-stream",
        fileId: "file_test",
        filePath: "workspace/w1/project/p1/task/t1/comments/server-123.conf",
      }),
    );
    expect(asset.mimeType).toBe("application/octet-stream");
    expect(asset.kind).toBe("attachment");
    expect(asset.url).toBe("https://maki.test/api/asset/abc123");
  });

  it("preserves a browser-provided content type", async () => {
    const file = new File(["image"], "image.png", { type: "image/png" });

    const asset = await uploadTaskImage({
      taskId: "task-1",
      surface: "description",
      file,
    });

    expect(mocks.createImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "image/png" }),
    );
    expect(mocks.finalizeImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "image/png" }),
    );
    expect(asset.mimeType).toBe("image/png");
    expect(asset.kind).toBe("image");
  });
});
