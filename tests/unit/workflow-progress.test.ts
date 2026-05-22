import { describe, expect, it } from "vitest";
import { workflowStatusFromMetric } from "@/lib/workflows/progress";

describe("workflowStatusFromMetric", () => {
  it("marks zero-value checkpoint work as complete when zero is healthy", () => {
    expect(workflowStatusFromMetric(0, { zeroState: "complete" })).toBe("complete");
  });

  it("marks positive operational work as active by default", () => {
    expect(workflowStatusFromMetric(3)).toBe("active");
  });

  it("marks positive risk metrics as attention when configured", () => {
    expect(workflowStatusFromMetric(2, { positiveState: "attention" })).toBe("attention");
  });
});

