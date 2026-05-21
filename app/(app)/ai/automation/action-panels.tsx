"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Check,
  FileCheck,
  FileText,
  Play,
  Sparkles,
  UploadCloud,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  commitDocumentOcr,
  resolveAiProposal,
  toggleAutomationAgent,
  triggerAutonomousScan,
  triggerDocumentOcr,
} from "@/features/ai/actions";
import type { AiAutomationAgentRow, AiAutomationProposalRow } from "@/features/ai/queries";

type OcrExtractionResult = {
  id: string;
  documentType: "vehicle_title" | "supplier_invoice";
  data: Record<string, unknown>;
};

const inputClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const smallInputClassName =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const labelClassName = "text-xs font-semibold uppercase tracking-wide text-slate-500";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function fieldValue(value: unknown, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function refreshRoute(router: ReturnType<typeof useRouter>, pathname: string) {
  router.replace(`${pathname}?automation=${Date.now()}`, { scroll: false });
  router.refresh();
}

function formatAgentName(type: string) {
  if (type === "crm_follow_up") return "CRM Lead Follow-Up Agent";
  if (type === "parts_reorder") return "Smart Parts Reorder Agent";
  if (type === "vehicle_marketing") return "Autonomous Marketing Listing Agent";
  return type;
}

function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function agentVisual(agentType: string) {
  if (agentType === "crm_follow_up") {
    return {
      icon: <Bot className="h-5 w-5" />,
      iconClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
      description:
        "Scans idle CRM leads with no outbound touchpoints and drafts messaging follow-ups via WhatsApp.",
    };
  }

  if (agentType === "parts_reorder") {
    return {
      icon: <Workflow className="h-5 w-5" />,
      iconClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description:
        "Monitors low-stock thresholds in parts and prepares purchase orders for preferred suppliers.",
    };
  }

  if (agentType === "vehicle_marketing") {
    return {
      icon: <Sparkles className="h-5 w-5" />,
      iconClassName: "border-violet-200 bg-violet-50 text-violet-700",
      description:
        "Finds unlisted available vehicles, compiles marketplace pricing and prepares social posts.",
    };
  }

  return {
    icon: <Workflow className="h-5 w-5" />,
    iconClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
    description: "Runs a controlled automation scan and creates manager-reviewed recommendations.",
  };
}

export function AgentSwitchboard({
  agents,
  defaultBranchId,
}: {
  agents: AiAutomationAgentRow[];
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loadingAgentId, setLoadingAgentId] = useState<string | null>(null);
  const [scanningAgentType, setScanningAgentType] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleToggle(agent: AiAutomationAgentRow) {
    setLoadingAgentId(agent.id);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("agentType", agent.agent_type);
      formData.append("isEnabled", (!agent.is_enabled).toString());
      formData.append("branchId", defaultBranchId ?? "");
      formData.append("config", JSON.stringify(agent.config || {}));

      const res = await toggleAutomationAgent(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Successfully toggled ${formatAgentName(agent.agent_type)}!`);
        refreshRoute(router, pathname);
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "An unexpected error occurred."));
    } finally {
      setLoadingAgentId(null);
    }
  }

  async function handleScan(agentType: string) {
    setScanningAgentType(agentType);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("agentType", agentType);
      formData.append("branchId", defaultBranchId ?? "");

      const res = await triggerAutonomousScan(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Autonomous scan finished! Generated proposal draft.`);
        refreshRoute(router, pathname);
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "Autonomous scan failed."));
    } finally {
      setScanningAgentType(null);
    }
  }

  return (
    <div className="space-y-4">
      {successMsg && <SuccessNotice message={successMsg} />}
      {errorMsg && <ErrorNotice message={errorMsg} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const isScanning = scanningAgentType === agent.agent_type;
          const isLoading = loadingAgentId === agent.id;
          const visual = agentVisual(agent.agent_type);

          return (
            <div
              key={agent.id}
              className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`rounded-lg border p-2 ${visual.iconClassName}`}>{visual.icon}</div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold leading-5 text-slate-950">
                        {formatAgentName(agent.agent_type)}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{visual.description}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      agent.is_enabled
                        ? "shrink-0 border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "shrink-0 border border-slate-200 bg-slate-100 text-slate-600"
                    }
                  >
                    {agent.is_enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 font-bold capitalize text-slate-950">{agent.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold uppercase tracking-wide text-slate-500">Last run</p>
                    <p className="mt-1 font-bold text-slate-950">
                      {agent.last_scan_at ? new Date(agent.last_scan_at).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    id={`${agent.agent_type}-toggle-btn`}
                    onClick={() => handleToggle(agent)}
                    disabled={isLoading || isScanning}
                    variant="outline"
                    className={
                      agent.is_enabled
                        ? "w-full border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        : "w-full border-emerald-200 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    }
                  >
                    {isLoading ? "Updating..." : agent.is_enabled ? "Disable Agent" : "Enable Agent"}
                  </Button>

                  <Button
                    id={`${agent.agent_type}-scan-btn`}
                    onClick={() => handleScan(agent.agent_type)}
                    disabled={isLoading || isScanning}
                    className="w-full bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    {isScanning ? (
                      "Scanning..."
                    ) : (
                      <>
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Run Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OcrDocumentIntake({
  companyId,
  defaultBranchId,
}: {
  companyId: string;
  defaultBranchId?: string;
}) {
  const [documentType, setDocumentType] = useState<"vehicle_title" | "supplier_invoice">("vehicle_title");
  const [customOcrText, setCustomOcrText] = useState("");
  const [fileSelected, setFileSelected] = useState<File | null>(null);

  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractionResult, setExtractionResult] = useState<OcrExtractionResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setFileSelected(file);
      if (file.name.includes("invoice") || documentType === "supplier_invoice") {
        setDocumentType("supplier_invoice");
      }
    }
  }

  async function handleOcrSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParsing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setExtractionResult(null);

    try {
      const formData = new FormData();
      formData.append("companyId", companyId);
      formData.append("branchId", defaultBranchId ?? "");
      formData.append("documentType", documentType);

      if (fileSelected) {
        formData.append("documentFile", fileSelected);
        formData.append("filePath", `uploads/${fileSelected.name}`);
        formData.append("fileName", fileSelected.name);
        formData.append("fileType", fileSelected.type);
      } else {
        formData.append("filePath", `uploads/simulated_${documentType}.pdf`);
        formData.append("fileName", `simulated_${documentType}.pdf`);
        formData.append("fileType", "application/pdf");
      }

      if (customOcrText.trim()) {
        formData.append("rawText", customOcrText);
      }

      const res = await triggerDocumentOcr(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Document parsed successfully!");
        setExtractionResult({
          id: res.extractionId,
          documentType,
          data: res.extractedData ?? {},
        });
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "OCR parsing request failed."));
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit(e: React.FormEvent) {
    e.preventDefault();
    if (!extractionResult) return;
    setCommitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      formData.append("extractionId", extractionResult.id);
      formData.append("branchId", defaultBranchId ?? "");

      const res = await commitDocumentOcr(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(
          `Extracted fields committed perfectly! Added ${
            extractionResult.documentType === "vehicle_title" ? "Vehicle Stock Record" : "Purchase Order Record"
          }.`,
        );
        setExtractionResult(null);
        setCustomOcrText("");
        setFileSelected(null);
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "Failed to commit document data."));
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-700">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-950">OCR Document Intake</h3>
              <p className="mt-1 text-sm text-slate-600">Upload a title certificate or parts supplier invoice.</p>
            </div>
          </div>

          {successMsg && <SuccessNotice message={successMsg} />}
          {errorMsg && <ErrorNotice message={errorMsg} />}

          <form onSubmit={handleOcrSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="documentType" className={labelClassName}>
                Document Type
              </Label>
              <select
                id="documentType"
                name="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as "vehicle_title" | "supplier_invoice")}
                className={inputClassName}
              >
                <option value="vehicle_title">Vehicle Title Certificate (.pdf / .png)</option>
                <option value="supplier_invoice">Supplier Purchase Invoice (.pdf / .png)</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentFile" className={labelClassName}>
                Document File
              </Label>
              <label
                htmlFor="documentFile"
                className="flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <UploadCloud className="mb-2 h-8 w-8 text-slate-500" />
                <p className="max-w-full truncate text-sm font-semibold text-slate-800">
                  {fileSelected ? fileSelected.name : "Drag and drop or click to select file"}
                </p>
                <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPG up to 5 MB</p>
                <input
                  id="documentFile"
                  name="documentFile"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customOcrText" className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Manual OCR Text Override</span>
                <span className="text-[10px] font-medium normal-case tracking-normal text-slate-400">Optional override</span>
              </Label>
              <textarea
                id="customOcrText"
                value={customOcrText}
                onChange={(e) => setCustomOcrText(e.target.value)}
                placeholder={
                  documentType === "vehicle_title"
                    ? "Optional: paste readable text if the image is unclear.\nVIN: ...\nPLATE: ...\nMAKE: ...\nMODEL: ..."
                    : "INVOICE\nSUPPLIER: AutoParts Depot Ltd\nINVOICE #: INV-2026-0520\nPART NUMBER: BP-202X\nQTY: 25\nTOTAL AMOUNT DUE: AED 3,000.00"
                }
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <Button
              id="ocrSubmitButton"
              type="submit"
              disabled={parsing}
              className="w-full bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              {parsing ? "Parsing Document with AI..." : "Run AI OCR Extraction"}
            </Button>
          </form>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-full flex-col space-y-5">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-700">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-950">AI OCR Extraction Verification</h3>
              <p className="mt-1 text-sm text-slate-600">Inspect and refine extracted values before database commit.</p>
            </div>
          </div>

          {extractionResult ? (
            <form onSubmit={handleCommit} className="space-y-4" id="ocrCommitForm">
              {extractionResult.documentType === "vehicle_title" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="vin" className={labelClassName}>
                      Extracted VIN
                    </Label>
                    <Input id="vin" name="vin" defaultValue={fieldValue(extractionResult.data.vin)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="make" className={labelClassName}>
                      Make / Brand
                    </Label>
                    <Input id="make" name="make" defaultValue={fieldValue(extractionResult.data.make)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="model" className={labelClassName}>
                      Model Name
                    </Label>
                    <Input id="model" name="model" defaultValue={fieldValue(extractionResult.data.model)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="year" className={labelClassName}>
                      Year
                    </Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      defaultValue={fieldValue(extractionResult.data.year, String(new Date().getFullYear()))}
                      className={smallInputClassName}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="color" className={labelClassName}>
                      Exterior Color
                    </Label>
                    <Input id="color" name="color" defaultValue={fieldValue(extractionResult.data.color)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="licensePlate" className={labelClassName}>
                      License Plate
                    </Label>
                    <Input
                      id="licensePlate"
                      name="licensePlate"
                      defaultValue={fieldValue(extractionResult.data.licensePlate)}
                      className={smallInputClassName}
                      placeholder="Only if visible"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="purchasePrice" className={labelClassName}>
                      Simulated Value (AED)
                    </Label>
                    <Input id="purchasePrice" name="purchasePrice" type="number" defaultValue={65000} className={smallInputClassName} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="supplierName" className={labelClassName}>
                      Supplier Name
                    </Label>
                    <Input id="supplierName" name="supplierName" defaultValue={fieldValue(extractionResult.data.supplierName)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="invoiceNumber" className={labelClassName}>
                      Invoice Number
                    </Label>
                    <Input id="invoiceNumber" name="invoiceNumber" defaultValue={fieldValue(extractionResult.data.invoiceNumber)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="partNumber" className={labelClassName}>
                      Part Number
                    </Label>
                    <Input id="partNumber" name="partNumber" defaultValue={fieldValue(extractionResult.data.partNumber)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="partName" className={labelClassName}>
                      Part Name
                    </Label>
                    <Input id="partName" name="partName" defaultValue={fieldValue(extractionResult.data.partName)} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="quantity" className={labelClassName}>
                      Quantity
                    </Label>
                    <Input id="quantity" name="quantity" type="number" defaultValue={fieldValue(extractionResult.data.quantity, "1")} className={smallInputClassName} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="amount" className={labelClassName}>
                      Total Amount (AED)
                    </Label>
                    <Input id="amount" name="amount" type="number" defaultValue={fieldValue(extractionResult.data.amount, "0")} className={smallInputClassName} />
                  </div>
                </div>
              )}

              <Button
                id="ocrCommitButton"
                type="submit"
                disabled={committing}
                className="w-full bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                {committing ? "Committing Entry..." : "Confirm & Commit to System"}
              </Button>
            </form>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-bold text-slate-700">No active extraction record parsed yet</p>
              <p className="mt-1 max-w-[300px] text-sm leading-6 text-slate-500">
                Submit a document invoice or title certificate to verify extracted attributes here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProposalsApprovalFeed({
  proposals,
}: {
  proposals: AiAutomationProposalRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleResolve(proposalId: string, decision: "approved" | "dismissed") {
    setResolvingId(proposalId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("proposalId", proposalId);
      formData.append("decision", decision);
      formData.append("notes", `Approved from Advanced AI automation dashboard feed.`);

      const res = await resolveAiProposal(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(
          `Proposal resolved perfectly! ${
            decision === "approved" ? "Executed autonomous pipeline." : "Dismissed proposal successfully."
          }`,
        );
        refreshRoute(router, pathname);
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "Failed to resolve proposal."));
    } finally {
      setResolvingId(null);
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <div className="space-y-4">
      {successMsg && <SuccessNotice message={successMsg} />}
      {errorMsg && <ErrorNotice message={errorMsg} />}

      {pendingProposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <FileCheck className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-bold text-slate-800">All caught up. Manager Approval Console is clear.</p>
          <p className="mt-1 text-sm text-slate-500">Autonomous scanning agents will post actionable recommendations here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingProposals.map((proposal) => {
            const isLoading = resolvingId === proposal.id;
            const payload = proposal.proposed_payload || {};

            return (
              <div key={proposal.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
                        {proposal.proposal_type.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Generated {new Date(proposal.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-950">{proposal.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{proposal.description}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
                      <p className="font-semibold text-slate-700">Justification / Audit Context</p>
                      <p className="mt-1 leading-6 text-slate-600">&ldquo;{proposal.justification}&rdquo;</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proposed Action Details</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {proposal.proposal_type === "lead_follow_up" && (
                          <>
                            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Channel: {fieldValue(payload.messageChannel, "WhatsApp")}
                            </span>
                            <span className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Message: {fieldValue(payload.messageBody)}
                            </span>
                          </>
                        )}
                        {proposal.proposal_type === "parts_reorder" && (
                          <>
                            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Part: {fieldValue(payload.partName || payload.partNumber)}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Qty: {fieldValue(payload.quantity)}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Est Cost: {fieldValue(payload.estimatedUnitCost)} {fieldValue(payload.currencyCode, "AED")}
                            </span>
                          </>
                        )}
                        {proposal.proposal_type === "vehicle_marketing" && (
                          <>
                            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Market: {fieldValue(payload.askingPrice)} {fieldValue(payload.currencyCode, "AED")}
                            </span>
                            <span className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700">
                              Headline: {fieldValue(payload.headline)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:w-44 lg:grid-cols-1">
                    <Button
                      id={`approve-${proposal.id}`}
                      onClick={() => handleResolve(proposal.id, "approved")}
                      disabled={isLoading}
                      className="w-full bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      {isLoading ? "Executing..." : "Approve & Execute"}
                    </Button>

                    <Button
                      id={`dismiss-${proposal.id}`}
                      onClick={() => handleResolve(proposal.id, "dismissed")}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      {isLoading ? "Wait..." : "Dismiss"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
