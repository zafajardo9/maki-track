import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LabelChip, labelChipColor } from "./label-chip";

afterEach(cleanup);

describe("LabelChip", () => {
  it("tints the chip with the resolved palette colour and titles it", () => {
    render(
      <LabelChip label={{ name: "Bug", color: "red", projectId: null }} />,
    );

    const chip = screen.getByText("Bug").closest("[data-slot='badge']");
    expect(chip).toHaveStyle({ "--label-color": "var(--color-red-600)" });
    expect(chip).toHaveAttribute("title", "Bug");
  });

  it("marks a project tag with the tag icon and a label with the bookmark icon", () => {
    const { container } = render(
      <>
        <LabelChip
          label={{ name: "urgent", color: "green", projectId: "project-1" }}
        />
        <LabelChip label={{ name: "bug", color: "red", projectId: null }} />
      </>,
    );

    expect(container.querySelector(".lucide-tag")).not.toBeNull();
    expect(container.querySelector(".lucide-bookmark")).not.toBeNull();
  });

  it("accepts a raw CSS colour and falls back for an unknown value", () => {
    expect(labelChipColor("#ff8800")).toBe("#ff8800");
    expect(labelChipColor("not-a-colour")).toBe("var(--color-neutral-400)");
  });
});
