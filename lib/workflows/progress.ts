export type WorkflowStepStatus = "complete" | "active" | "attention" | "idle";

type WorkflowMetricOptions = {
  zeroState?: WorkflowStepStatus;
  positiveState?: WorkflowStepStatus;
};

export function workflowStatusFromMetric(
  value: number,
  { zeroState = "idle", positiveState = "active" }: WorkflowMetricOptions = {},
): WorkflowStepStatus {
  return value > 0 ? positiveState : zeroState;
}

