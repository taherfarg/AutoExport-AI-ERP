import { FileCheck2, FileClock, FileText, PenLine, Plus, ShieldCheck } from "lucide-react";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import {
  createDocumentRecord,
  createSignatureRequest,
  markSignatureRequestSigned,
  verifyDocument,
} from "@/features/documents/actions";
import { getDocumentDashboardData, getDocumentPermissions } from "@/features/documents/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatDocumentStatus } from "@/lib/documents/format";
import { documentCategories, signatureRequestStatuses, verificationStatuses } from "@/lib/validations/documents";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default async function DocumentsPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getDocumentDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getDocumentPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const firstDocument = data.documents[0];
  const firstSignatureRequest = data.signatureRequests.find((request) => request.status !== "signed");

  async function uploadDocumentFromForm(formData: FormData) {
    "use server";

    await createDocumentRecord(formData);
  }

  async function verifyDocumentFromForm(formData: FormData) {
    "use server";

    await verifyDocument(formData);
  }

  async function createSignatureFromForm(formData: FormData) {
    "use server";

    await createSignatureRequest(formData);
  }

  async function markSignedFromForm(formData: FormData) {
    "use server";

    await markSignatureRequestSigned(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Documents & Digital Signature</h2>
          <p className="text-sm text-slate-500">
            Secure archive, document checklist, verification workflow, and signed document register.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Archive" value={String(data.stats.archiveCount)} hint="Documents stored" />
        <KpiCard title="Verified" value={String(data.stats.verifiedCount)} hint="Confirmed documents" />
        <KpiCard title="Expiring" value={String(data.stats.expiringSoonCount)} hint="Expired or due soon" />
        <KpiCard title="Missing" value={String(data.stats.missingRequiredCount)} hint="Required checklist gaps" />
        <KpiCard title="Open signature" value={String(data.stats.openSignatureCount)} hint="Draft/sent/viewed" />
        <KpiCard title="Signed" value={String(data.stats.signedCount)} hint="Archived signed docs" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document archive</CardTitle>
              <CardDescription>Private Supabase Storage files with tenant-scoped metadata and signed previews.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documents.map((document) => (
                      <tr key={document.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{document.title}</p>
                          <p className="text-xs text-slate-500">{document.document_number}</p>
                        </td>
                        <td className="px-4 py-3">{formatDocumentStatus(document.category)}</td>
                        <td className="px-4 py-3">{document.branches?.name ?? "Company archive"}</td>
                        <td className="px-4 py-3">{formatDate(document.expires_at)}</td>
                        <td className="px-4 py-3"><DocumentStatusBadge status={document.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {document.signed_url ? (
                            <a className="text-sm font-medium text-blue-700 hover:underline" href={document.signed_url} target="_blank">
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No file</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No documents yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Checklist health</CardTitle>
                <CardDescription>{data.stats.checklistCompletionPercentage}% of required linked documents complete.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.checklists.slice(0, 10).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500">{formatDocumentStatus(item.entity_type)} checklist</p>
                      </div>
                      <DocumentStatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.is_required ? "Required" : "Optional"} · due {formatDate(item.due_at)}</p>
                  </div>
                ))}
                {data.checklists.length === 0 ? <p className="text-sm text-slate-500">No checklist records yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verification log</CardTitle>
                <CardDescription>Recent verifier decisions synced into document status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.verifications.map((verification) => (
                  <div key={verification.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{verification.verifier?.full_name ?? verification.verifier?.email ?? "Verifier"}</p>
                        <p className="text-xs text-slate-500">{formatDate(verification.verified_at)}</p>
                      </div>
                      <DocumentStatusBadge status={verification.status} />
                    </div>
                    {verification.notes ? <p className="mt-2 text-xs text-slate-500">{verification.notes}</p> : null}
                  </div>
                ))}
                {data.verifications.length === 0 ? <p className="text-sm text-slate-500">No verification decisions yet.</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Signature requests</CardTitle>
              <CardDescription>Internal digital signature workflow with signed archive records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Signer</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Sent</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.signatureRequests.map((request) => (
                      <tr key={request.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{request.request_number}</p>
                          <p className="text-xs text-slate-500">{request.documents?.title ?? request.notes ?? "Signature request"}</p>
                        </td>
                        <td className="px-4 py-3">{request.signer_name ?? request.sent_to}</td>
                        <td className="px-4 py-3">{formatDocumentStatus(request.document_type)}</td>
                        <td className="px-4 py-3">{formatDate(request.sent_at)}</td>
                        <td className="px-4 py-3"><DocumentStatusBadge status={request.status} /></td>
                      </tr>
                    ))}
                    {data.signatureRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No signature requests yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canUploadDocuments && defaultBranchId ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload document</CardTitle>
                <CardDescription>Store a private file and link it to a vehicle or customer.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={uploadDocumentFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <select id="branchId" name="branchId" defaultValue={defaultBranchId} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentTitle">Title</Label>
                    <Input id="documentTitle" name="title" defaultValue={`Vehicle document ${today()}`} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentCategory">Category</Label>
                    <select id="documentCategory" name="category" defaultValue="vehicle_title" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {documentCategories.map((category) => (
                        <option key={category} value={category}>{formatDocumentStatus(category)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentFile">File</Label>
                    <Input id="documentFile" name="documentFile" type="file" accept="application/pdf,image/*" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="entityType">Link to</Label>
                    <select id="entityType" name="entityType" defaultValue={data.vehicleOptions[0] ? "vehicle" : data.customerOptions[0] ? "customer" : ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">Company archive</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="entityId">Linked record</Label>
                    <select id="entityId" name="entityId" defaultValue={data.vehicleOptions[0]?.id ?? data.customerOptions[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No linked record</option>
                      {data.vehicleOptions.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
                      ))}
                      {data.customerOptions.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiresAt">Expiry date</Label>
                    <Input id="expiresAt" name="expiresAt" type="date" defaultValue={dateIn(180)} />
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Upload document
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canVerifyDocuments && firstDocument ? (
            <Card>
              <CardHeader>
                <CardTitle>Verify document</CardTitle>
                <CardDescription>Verification updates the archive and linked checklist.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={verifyDocumentFromForm} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="documentId">Document</Label>
                    <select id="documentId" name="documentId" defaultValue={firstDocument.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.documents.map((document) => (
                        <option key={document.id} value={document.id}>{document.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="verificationStatus">Decision</Label>
                    <select id="verificationStatus" name="status" defaultValue="verified" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {verificationStatuses.filter((status) => status !== "pending").map((status) => (
                        <option key={status} value={status}>{formatDocumentStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="verificationNotes">Notes</Label>
                    <Input id="verificationNotes" name="notes" defaultValue="Document checked against original file." />
                  </div>
                  <Button type="submit" variant="outline">
                    <ShieldCheck className="h-4 w-4" />
                    Verify document
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageSignatureRequests ? (
            <Card>
              <CardHeader>
                <CardTitle>Create signature request</CardTitle>
                <CardDescription>Prepare an internal signature workflow for contracts and agreements.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createSignatureFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="signatureTitle">Title</Label>
                    <Input id="signatureTitle" name="title" defaultValue={`Reservation agreement ${today()}`} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentType">Document type</Label>
                    <select id="documentType" name="documentType" defaultValue="reservation_agreement" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {documentCategories.map((category) => (
                        <option key={category} value={category}>{formatDocumentStatus(category)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sourceDocumentId">Source document</Label>
                    <select id="sourceDocumentId" name="sourceDocumentId" defaultValue={firstDocument?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No source document</option>
                      {data.documents.map((document) => (
                        <option key={document.id} value={document.id}>{document.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="relatedCustomerId">Customer</Label>
                    <select id="relatedCustomerId" name="relatedCustomerId" defaultValue={data.customerOptions[0]?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No customer link</option>
                      {data.customerOptions.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sentToName">Signer name</Label>
                    <Input id="sentToName" name="sentToName" defaultValue={data.customerOptions[0]?.label.split(" - ")[0] ?? "Export buyer"} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sentToEmail">Signer email</Label>
                    <Input id="sentToEmail" name="sentToEmail" type="email" defaultValue="buyer@example.com" />
                  </div>
                  <Button type="submit">
                    <PenLine className="h-4 w-4" />
                    Create signature request
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageSignatureRequests && firstSignatureRequest ? (
            <Card>
              <CardHeader>
                <CardTitle>Archive signed copy</CardTitle>
                <CardDescription>Attach the signed PDF and signature image to a request.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={markSignedFromForm} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="signatureRequestId">Request</Label>
                    <select id="signatureRequestId" name="signatureRequestId" defaultValue={firstSignatureRequest.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.signatureRequests.filter((request) => request.status !== "signed").map((request) => (
                        <option key={request.id} value={request.id}>{request.request_number} - {request.sent_to}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signedByName">Signed by</Label>
                    <Input id="signedByName" name="signedByName" defaultValue={firstSignatureRequest.sent_to} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signatureImage">Signature image</Label>
                    <Input id="signatureImage" name="signatureImage" type="file" accept="image/*" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signedDocument">Signed document</Label>
                    <Input id="signedDocument" name="signedDocument" type="file" accept="application/pdf,image/*" required />
                  </div>
                  <input type="hidden" name="deviceInfo" value="Internal signature workflow" />
                  <Button type="submit" variant="outline">
                    <FileCheck2 className="h-4 w-4" />
                    Mark signed
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Signed archive</CardTitle>
              <CardDescription>Immutable signed document register.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.signedDocuments.map((document) => (
                <div key={document.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{document.signed_document_number}</p>
                      <p className="text-xs text-slate-500">{document.signature_requests?.request_number ?? "Signature request"}</p>
                    </div>
                    <FileText className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Signed by {document.signed_by}</span>
                    {document.signed_url ? <a className="font-medium text-blue-700 hover:underline" href={document.signed_url} target="_blank">Open</a> : null}
                  </div>
                </div>
              ))}
              {data.signedDocuments.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
                  <FileClock className="mb-2 h-4 w-4 text-slate-400" />
                  Signed copies will appear after a request is completed.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status reference</CardTitle>
              <CardDescription>Signature request lifecycle states.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {signatureRequestStatuses.map((status) => <DocumentStatusBadge key={status} status={status} />)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
