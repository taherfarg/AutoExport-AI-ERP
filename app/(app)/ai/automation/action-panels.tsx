"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Check, 
  Play, 
  UploadCloud, 
  AlertCircle,
  FileCheck,
  Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  toggleAutomationAgent, 
  triggerAutonomousScan, 
  triggerDocumentOcr, 
  commitDocumentOcr, 
  resolveAiProposal 
} from "@/features/ai/actions";
import type { AiAutomationAgentRow, AiAutomationProposalRow } from "@/features/ai/queries";

type OcrExtractionResult = {
  id: string;
  documentType: "vehicle_title" | "supplier_invoice";
  data: Record<string, unknown>;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function fieldValue(value: unknown, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

// Helpers for formatted display
function formatAgentName(type: string) {
  if (type === "crm_follow_up") return "CRM Lead Follow-Up Agent";
  if (type === "parts_reorder") return "Smart Parts Reorder Agent";
  if (type === "vehicle_marketing") return "Autonomous Marketing Listing Agent";
  return type;
}

export function AgentSwitchboard({ 
  agents, 
  defaultBranchId
}: { 
  agents: AiAutomationAgentRow[];
  defaultBranchId?: string;
}) {
  const router = useRouter();
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
        router.refresh();
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
        router.refresh();
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "Autonomous scan failed."));
    } finally {
      setScanningAgentType(null);
    }
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 backdrop-blur-md transition-all duration-300">
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400 backdrop-blur-md transition-all duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {agents.map((agent) => {
          const isScanning = scanningAgentType === agent.agent_type;
          const isLoading = loadingAgentId === agent.id;
          
          let description = "";
          let icon = <Workflow className="h-6 w-6 text-indigo-400" />;
          
          if (agent.agent_type === "crm_follow_up") {
            description = "Scans idle CRM leads with no outbound touchpoints and drafts messaging follow-ups via WhatsApp.";
            icon = <Bot className="h-6 w-6 text-cyan-400" />;
          } else if (agent.agent_type === "parts_reorder") {
            description = "Monitors low-stock thresholds in parts and prepares purchase orders for preferred suppliers.";
            icon = <Workflow className="h-6 w-6 text-emerald-400" />;
          } else if (agent.agent_type === "vehicle_marketing") {
            description = "Finds unlisted available vehicles, compiles marketplace pricing and prepares social posts.";
            icon = <Sparkles className="h-6 w-6 text-purple-400" />;
          }

          return (
            <div 
              key={agent.id} 
              className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-indigo-500/5 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-50 transition-all duration-300 group-hover:opacity-100" />
              
              <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-slate-850 p-2 border border-slate-800">
                        {icon}
                      </div>
                      <h3 className="font-semibold text-slate-100">{formatAgentName(agent.agent_type)}</h3>
                    </div>
                    <Badge className={`px-2.5 py-0.5 border ${
                      agent.is_enabled 
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" 
                        : "border-slate-800 bg-slate-850 text-slate-400"
                    }`}>
                      {agent.is_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-850 pt-3">
                    <span>Status: <span className="font-semibold text-slate-300 capitalize">{agent.status}</span></span>
                    <span>Last run: <span className="font-semibold text-slate-300">
                      {agent.last_scan_at ? new Date(agent.last_scan_at).toLocaleDateString() : "Never"}
                    </span></span>
                  </div>

                  <div className="flex gap-2.5">
                    <Button 
                      id={`${agent.agent_type}-toggle-btn`}
                      onClick={() => handleToggle(agent)}
                      disabled={isLoading || isScanning}
                      variant="outline"
                      className={`w-full text-xs font-semibold py-2 transition-all duration-300 border ${
                        agent.is_enabled 
                          ? "border-rose-500/20 text-rose-400 hover:bg-rose-500/10" 
                          : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      {isLoading ? "Updating..." : agent.is_enabled ? "Disable Agent" : "Enable Agent"}
                    </Button>

                    <Button 
                      id={`${agent.agent_type}-scan-btn`}
                      onClick={() => handleScan(agent.agent_type)}
                      disabled={isLoading || isScanning}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold py-2 shadow-md shadow-indigo-600/10"
                    >
                      {isScanning ? (
                        "Scanning..."
                      ) : (
                        <>
                          <Play className="mr-1.5 h-3 w-3" />
                          Run Scan
                        </>
                      )}
                    </Button>
                  </div>
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
  defaultBranchId 
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
      // Pre-fill mock parsing values based on name triggers to facilitate E2E
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
        setSuccessMsg(`Extracted fields committed perfectly! Added ${
          extractionResult.documentType === "vehicle_title" 
            ? "Vehicle Stock Record" 
            : "Purchase Order Record"
        }.`);
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
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Upload Column */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-50" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-850 p-2 border border-slate-800 text-indigo-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">OCR Document Intake</h3>
              <p className="text-xs text-slate-400">Upload title certificate or parts supplier invoice</p>
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 backdrop-blur-md">
              <Check className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400 backdrop-blur-md">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleOcrSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="documentType" className="text-xs text-slate-400 font-semibold">Document Type</Label>
              <select 
                id="documentType"
                name="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as "vehicle_title" | "supplier_invoice")}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="vehicle_title">Vehicle Title Certificate (.pdf / .png)</option>
                <option value="supplier_invoice">Supplier Purchase Invoice (.pdf / .png)</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentFile" className="text-xs text-slate-400 font-semibold">Document File</Label>
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="documentFile" 
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-xl cursor-pointer hover:bg-slate-950 transition-all duration-300"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <UploadCloud className="h-8 w-8 text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">
                      {fileSelected ? fileSelected.name : "Drag & Drop or Click to Select File"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">PDF, PNG, JPG (Max 5MB)</p>
                  </div>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customOcrText" className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Simulated Raw OCR Text (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">Overrides parser heuristics</span>
              </Label>
              <textarea
                id="customOcrText"
                value={customOcrText}
                onChange={(e) => setCustomOcrText(e.target.value)}
                placeholder={
                  documentType === "vehicle_title"
                    ? "VIN: 1FTFW1EF5GFA99999\nYEAR: 2016\nMAKE: FORD\nMODEL: F-150 SUPERCREW\nCOLOR: BLACK"
                    : "INVOICE\nSUPPLIER: AutoParts Depot Ltd\nINVOICE #: INV-2026-0520\nPART NUMBER: BP-202X\nQTY: 25\nTOTAL AMOUNT DUE: AED 3,000.00"
                }
                rows={3}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <Button 
              id="ocrSubmitButton"
              type="submit" 
              disabled={parsing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold py-2.5 shadow-md shadow-indigo-600/10 transition-all duration-300"
            >
              {parsing ? "Parsing Document with AI..." : "Run AI OCR Extraction"}
            </Button>
          </form>
        </div>
      </div>

      {/* Extracted Fields Column */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
              <div className="rounded-xl bg-slate-850 p-2 border border-slate-800 text-indigo-400">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 font-sans">AI OCR Extraction Verification</h3>
                <p className="text-xs text-slate-400">Inspect and refine extracted values prior to DB commit</p>
              </div>
            </div>

            {extractionResult ? (
              <form onSubmit={handleCommit} className="space-y-4" id="ocrCommitForm">
                {extractionResult.documentType === "vehicle_title" ? (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor="vin" className="text-xs text-slate-400 font-semibold">Extracted VIN</Label>
                      <Input 
                        id="vin" 
                        name="vin" 
                        defaultValue={fieldValue(extractionResult.data.vin)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="make" className="text-xs text-slate-400 font-semibold">Make / Brand</Label>
                      <Input 
                        id="make" 
                        name="make" 
                        defaultValue={fieldValue(extractionResult.data.make)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="model" className="text-xs text-slate-400 font-semibold">Model Name</Label>
                      <Input 
                        id="model" 
                        name="model" 
                        defaultValue={fieldValue(extractionResult.data.model)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="year" className="text-xs text-slate-400 font-semibold">Year</Label>
                      <Input 
                        id="year" 
                        name="year" 
                        type="number" 
                        defaultValue={fieldValue(extractionResult.data.year, String(new Date().getFullYear()))}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="color" className="text-xs text-slate-400 font-semibold">Exterior Color</Label>
                      <Input 
                        id="color" 
                        name="color" 
                        defaultValue={fieldValue(extractionResult.data.color)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="purchasePrice" className="text-xs text-slate-400 font-semibold">Simulated Value (AED)</Label>
                      <Input 
                        id="purchasePrice" 
                        name="purchasePrice" 
                        type="number" 
                        defaultValue={65000} 
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor="supplierName" className="text-xs text-slate-400 font-semibold">Supplier Name</Label>
                      <Input 
                        id="supplierName" 
                        name="supplierName" 
                        defaultValue={fieldValue(extractionResult.data.supplierName)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="invoiceNumber" className="text-xs text-slate-400 font-semibold">Invoice Number</Label>
                      <Input 
                        id="invoiceNumber" 
                        name="invoiceNumber" 
                        defaultValue={fieldValue(extractionResult.data.invoiceNumber)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="partNumber" className="text-xs text-slate-400 font-semibold">Part Number</Label>
                      <Input 
                        id="partNumber" 
                        name="partNumber" 
                        defaultValue={fieldValue(extractionResult.data.partNumber)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="partName" className="text-xs text-slate-400 font-semibold">Part Name</Label>
                      <Input 
                        id="partName" 
                        name="partName" 
                        defaultValue={fieldValue(extractionResult.data.partName)}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="quantity" className="text-xs text-slate-400 font-semibold">Quantity</Label>
                      <Input 
                        id="quantity" 
                        name="quantity" 
                        type="number" 
                        defaultValue={fieldValue(extractionResult.data.quantity, "1")}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="amount" className="text-xs text-slate-400 font-semibold">Total Amount (AED)</Label>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        defaultValue={fieldValue(extractionResult.data.amount, "0")}
                        className="h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                )}
                
                <Button 
                  id="ocrCommitButton"
                  type="submit" 
                  disabled={committing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold py-2 shadow-md shadow-emerald-600/10 transition-all duration-300 mt-2"
                >
                  {committing ? "Committing Entry..." : "Confirm & Commit to System"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No active extraction record parsed yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                  Submit a document invoice or title certificate to view extracted attributes here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProposalsApprovalFeed({ 
  proposals 
}: { 
  proposals: AiAutomationProposalRow[];
}) {
  const router = useRouter();
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
        setSuccessMsg(`Proposal resolved perfectly! ${decision === "approved" ? "Executed autonomous pipeline." : "Dismissed proposal successfully."}`);
        router.refresh();
      }
    } catch (e: unknown) {
      setErrorMsg(errorMessage(e, "Failed to resolve proposal."));
    } finally {
      setResolvingId(null);
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 backdrop-blur-md">
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400 backdrop-blur-md">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {pendingProposals.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center backdrop-blur-xl">
          <FileCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">All caught up! Manager Approval Console is clear.</p>
          <p className="text-xs text-slate-500 mt-1">Autonomous scanning agents will post actionable recommendations here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingProposals.map((proposal) => {
            const isLoading = resolvingId === proposal.id;
            const payload = proposal.proposed_payload || {};
            
            return (
              <div 
                key={proposal.id} 
                className="relative overflow-hidden rounded-2xl border border-slate-800/85 bg-slate-900/60 p-6 backdrop-blur-xl hover:border-slate-700 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-40" />

                <div className="relative z-10 flex flex-col justify-between space-y-4 md:flex-row md:items-start md:space-y-0 md:space-x-6">
                  {/* Proposal Details */}
                  <div className="flex-1 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 font-medium px-2 py-0.5 text-[10px] capitalize">
                        {proposal.proposal_type.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Generated {new Date(proposal.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-semibold text-slate-100">{proposal.title}</h4>
                      <p className="text-sm text-slate-300 mt-1 font-sans">{proposal.description}</p>
                    </div>

                    <div className="rounded-lg bg-slate-950/70 p-3.5 border border-slate-900 text-xs space-y-2">
                      <p className="text-slate-400 font-semibold">Justification / Audit Context:</p>
                      <p className="text-slate-300 italic leading-relaxed font-serif">&ldquo;{proposal.justification}&rdquo;</p>
                    </div>

                    {/* Payload Details */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-slate-400">Proposed Action Details:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {proposal.proposal_type === "lead_follow_up" && (
                          <>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800">
                              Channel: {fieldValue(payload.messageChannel, "WhatsApp")}
                            </span>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800 line-clamp-1">
                              Message: {fieldValue(payload.messageBody)}
                            </span>
                          </>
                        )}
                        {proposal.proposal_type === "parts_reorder" && (
                          <>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800">
                              Part: {fieldValue(payload.partName || payload.partNumber)}
                            </span>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800">
                              Qty: {fieldValue(payload.quantity)}
                            </span>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800">
                              Est Cost: {fieldValue(payload.estimatedUnitCost)} {fieldValue(payload.currencyCode, "AED")}
                            </span>
                          </>
                        )}
                        {proposal.proposal_type === "vehicle_marketing" && (
                          <>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800">
                              Market: {fieldValue(payload.askingPrice)} {fieldValue(payload.currencyCode, "AED")}
                            </span>
                            <span className="rounded bg-slate-850 px-2 py-1 text-slate-300 border border-slate-800 line-clamp-1">
                              Headline: {fieldValue(payload.headline)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 pt-2 min-w-[140px]">
                    <Button 
                      id={`approve-${proposal.id}`}
                      onClick={() => handleResolve(proposal.id, "approved")}
                      disabled={isLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold py-2 shadow-md shadow-emerald-600/10 text-xs shrink-0 transition-all duration-300"
                    >
                      {isLoading ? "Executing..." : "Approve & Execute"}
                    </Button>
                    
                    <Button 
                      id={`dismiss-${proposal.id}`}
                      onClick={() => handleResolve(proposal.id, "dismissed")}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full border-slate-800 text-rose-400 hover:bg-rose-500/10 text-xs shrink-0 transition-all duration-300"
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
