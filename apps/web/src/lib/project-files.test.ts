import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  getFileCategory,
  getFileExtension,
} from "./project-files";

describe("getFileExtension", () => {
  it("reads the extension from the last dot", () => {
    expect(getFileExtension("quarterly.report.pdf")).toBe("pdf");
  });

  it("lowercases the extension so extensions compare equally", () => {
    expect(getFileExtension("Screenshot.PNG")).toBe("png");
  });

  it("ignores path separators", () => {
    expect(getFileExtension("uploads/2026/budget.xlsx")).toBe("xlsx");
    expect(getFileExtension("C:\\Users\\ana\\notes.txt")).toBe("txt");
  });

  it("treats a dotfile as having no extension", () => {
    expect(getFileExtension(".env")).toBe("");
  });

  it("treats a trailing dot as having no extension", () => {
    expect(getFileExtension("report.")).toBe("");
  });

  it("returns an empty string when there is no dot", () => {
    expect(getFileExtension("README")).toBe("");
  });
});

describe("getFileCategory", () => {
  it("classifies by mime type when it is informative", () => {
    expect(getFileCategory("image/webp")).toBe("image");
    expect(getFileCategory("video/mp4")).toBe("video");
    expect(getFileCategory("application/pdf")).toBe("pdf");
    expect(
      getFileCategory(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("spreadsheet");
  });

  it("ignores mime type parameters", () => {
    expect(getFileCategory("text/plain; charset=utf-8")).toBe("text");
  });

  it("falls back to the extension for a generic content type", () => {
    // Browsers report this for anything they cannot identify, which is exactly
    // when the filename is the only useful signal left.
    expect(getFileCategory("application/octet-stream", "slides.pptx")).toBe(
      "presentation",
    );
    expect(getFileCategory("", "archive.zip")).toBe("archive");
  });

  it("returns other when neither signal is recognised", () => {
    expect(getFileCategory("application/octet-stream", "firmware.bin")).toBe(
      "other",
    );
    expect(getFileCategory(null)).toBe("other");
  });
});

describe("formatFileSize", () => {
  it("reports whole bytes without a decimal", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("scales through the binary units", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
  });

  it("drops the decimal once it stops carrying information", () => {
    expect(formatFileSize(200 * 1024 * 1024)).toBe("200 MB");
  });

  it("handles empty and invalid input without printing NaN", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });
});
