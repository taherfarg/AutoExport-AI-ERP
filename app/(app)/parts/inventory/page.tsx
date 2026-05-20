import { KpiCard } from "@/components/dashboard/kpi-card";
import { FinanceStatusBadge } from "@/components/finance/finance-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getPartsInventoryData, getPartsPermissions } from "@/features/parts/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatPartStatus } from "@/lib/parts/format";
import { formatMoney } from "@/lib/vehicles/format";
import {
  PartForm,
  PartPurchaseOrderForm,
  PartPurchaseOrderItemForm,
  PartReceiptForm,
  PartSupplierForm,
  PartTransferForm,
  ServicePartLineForm,
} from "./parts-action-forms";

export default async function PartsInventoryPage() {
  const workspace = await getCurrentWorkspace();
  const [parts, branches, permissions] = await Promise.all([
    getPartsInventoryData(workspace.companyId),
    getBranches(workspace.companyId),
    getPartsPermissions(workspace.companyId),
  ]);
  const currencyCode = parts.parts[0]?.currency_code ?? branches[0]?.currency_code ?? "AED";

  if (!permissions.canViewParts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parts access required</CardTitle>
          <CardDescription>Ask an administrator for `view_parts` or `manage_parts` permission.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Parts Inventory</h2>
        <p className="text-sm text-slate-500">Catalog, branch stock, suppliers, purchasing, receiving, transfers, service consumption, and reorder alerts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Catalog parts" value={String(parts.summary.catalogParts)} hint="Active and inactive SKUs" />
        <KpiCard title="Stock units" value={String(parts.summary.stockUnits)} hint="On hand across branches" />
        <KpiCard title="Low stock" value={String(parts.summary.lowStock)} hint="Low or out of stock rows" />
        <KpiCard title="Open PO value" value={formatMoney(parts.summary.openPurchaseValue, currencyCode)} hint="Not fully received" />
        <KpiCard title="Parts profit" value={formatMoney(parts.summary.servicePartsProfit, currencyCode)} hint="Service parts gross profit" />
        <KpiCard title="Reorder alerts" value={String(parts.summary.openReorderAlerts)} hint="Open reorder signals" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parts catalog</CardTitle>
              <CardDescription>Company-level parts, costs, pricing, and reorder rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Part</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.parts.slice(0, 10).map((part) => (
                      <tr key={part.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{part.part_number}</p>
                          <p className="text-xs text-slate-500">{part.name}</p>
                        </td>
                        <td className="px-4 py-3">{part.category ?? "General"}</td>
                        <td className="px-4 py-3"><FinanceStatusBadge status={part.status} /></td>
                        <td className="px-4 py-3 text-right">{formatMoney(part.unit_cost, part.currency_code)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(part.selling_price, part.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Branch stock</CardTitle>
                <CardDescription>Availability and reorder posture by branch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parts.stock.slice(0, 8).map((stock) => (
                  <div key={stock.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{stock.parts?.part_number}</p>
                        <p className="text-xs text-slate-500">{stock.parts?.name} - {stock.branches?.name}</p>
                      </div>
                      <FinanceStatusBadge status={stock.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{Number(stock.quantity_available).toFixed(0)} available</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Approved parts suppliers and contacts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parts.suppliers.slice(0, 8).map((supplier) => (
                  <div key={supplier.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{supplier.supplier_name}</p>
                        <p className="text-xs text-slate-500">{supplier.contact_name ?? "Contact"} - {supplier.country_code ?? "Global"}</p>
                      </div>
                      <FinanceStatusBadge status={supplier.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{supplier.email ?? supplier.phone ?? "No contact details"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchasing and receipts</CardTitle>
              <CardDescription>Supplier orders, received stock, and branch transfers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-3">
                {parts.purchaseOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{order.purchase_order_number}</p>
                    <p className="text-xs text-slate-500">{order.part_suppliers?.supplier_name ?? "Supplier"} - {order.branches?.name}</p>
                    <p className="mt-2 text-right font-medium">{formatMoney(order.total_amount, order.currency_code)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {parts.receipts.slice(0, 5).map((receipt) => (
                  <div key={receipt.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{receipt.receipt_number}</p>
                    <p className="text-xs text-slate-500">{receipt.part_purchase_orders?.purchase_order_number ?? "Direct receipt"} - {receipt.branches?.name}</p>
                    <p className="mt-2">{formatPartStatus(receipt.status)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {parts.transfers.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{transfer.transfer_number}</p>
                    <p className="text-xs text-slate-500">{transfer.parts?.name} - {Number(transfer.quantity).toFixed(0)} units</p>
                    <p className="mt-2">{formatPartStatus(transfer.status)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Service parts usage</CardTitle>
                <CardDescription>Parts consumed on workshop repair orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parts.serviceParts.slice(0, 6).map((line) => (
                  <div key={line.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-950">{line.line_number}</p>
                    <p className="text-xs text-slate-500">{line.description}</p>
                    <p className="text-xs text-slate-500">{line.parts?.name} - {line.service_orders?.order_number}</p>
                    <p className="mt-2 text-right font-medium">{formatMoney(line.line_total, currencyCode)} - {formatMoney(line.gross_profit, currencyCode)} profit</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reorder alerts</CardTitle>
                <CardDescription>Low-stock signals generated from branch availability.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {parts.reorderAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{alert.alert_number}</p>
                        <p className="text-xs text-slate-500">{alert.parts?.name} - {alert.branches?.name}</p>
                      </div>
                      <FinanceStatusBadge status={alert.status} />
                    </div>
                    <p className="mt-2 text-right font-medium">{Number(alert.current_quantity).toFixed(0)} / {Number(alert.reorder_point).toFixed(0)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {permissions.canManageParts ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Create part</CardTitle>
                  <CardDescription>Add a catalog SKU with pricing and reorder rules.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PartForm companyId={workspace.companyId} currencyCode={currencyCode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create supplier</CardTitle>
                  <CardDescription>Add supplier contact data for purchasing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PartSupplierForm companyId={workspace.companyId} />
                </CardContent>
              </Card>
            </>
          ) : null}

          {permissions.canManagePartOrders ? (
            <Card>
              <CardHeader>
                <CardTitle>Purchasing</CardTitle>
                <CardDescription>Create purchase orders, add lines, and post receipts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PartPurchaseOrderForm companyId={workspace.companyId} branches={branches} suppliers={parts.suppliers} currencyCode={currencyCode} />
                <PartPurchaseOrderItemForm companyId={workspace.companyId} purchaseOrders={parts.purchaseOrders} parts={parts.parts} />
                <PartReceiptForm companyId={workspace.companyId} purchaseItems={parts.purchaseItems} />
              </CardContent>
            </Card>
          ) : null}

          {permissions.canTransferParts ? (
            <Card>
              <CardHeader>
                <CardTitle>Branch transfer</CardTitle>
                <CardDescription>Move stock between two branches.</CardDescription>
              </CardHeader>
              <CardContent>
                <PartTransferForm companyId={workspace.companyId} branches={branches} parts={parts.parts} />
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageParts ? (
            <Card>
              <CardHeader>
                <CardTitle>Service usage</CardTitle>
                <CardDescription>Consume parts on workshop orders and update order totals.</CardDescription>
              </CardHeader>
              <CardContent>
                <ServicePartLineForm companyId={workspace.companyId} parts={parts.parts} serviceOrders={parts.serviceOrders} serviceJobs={parts.serviceJobs} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
