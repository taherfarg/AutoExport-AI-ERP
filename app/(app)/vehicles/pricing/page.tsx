import Link from "next/link";
import { AlertTriangle, Calculator, FileText, Save, Sparkles, Tags } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVehiclePricing } from "@/features/vehicles/actions";
import {
  getVehiclePricingIntelligence,
  getVehiclePermissions,
  getVehiclePricingRows,
} from "@/features/vehicles/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { calculateVehiclePricing } from "@/lib/vehicles/pricing";
import { formatMoney } from "@/lib/vehicles/format";

type PricingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined, fallback: number) {
  const raw = firstParam(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function VehiclePricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const permissions = await getVehiclePermissions(workspace.companyId);

  if (!permissions.canViewCost || !permissions.canViewProfit) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Smart Vehicle Pricing</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              You need vehicle cost and profit permissions to use smart pricing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vehicleId = firstParam(params.vehicleId);
  const [vehicles, pricingIntelligence] = await Promise.all([
    getVehiclePricingRows(workspace.companyId),
    getVehiclePricingIntelligence(workspace.companyId),
  ]);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? vehicles[0] ?? null;
  const selectedIntelligence = selectedVehicle ? pricingIntelligence.get(selectedVehicle.id) : undefined;
  const cost = selectedVehicle?.vehicle_costs?.[0];
  const selectedVehicleId = selectedVehicle?.id ?? "";
  const purchasePrice = numberParam(params.purchasePrice, Number(selectedVehicle?.purchase_price ?? 0));
  const shippingCost = numberParam(params.shippingCost, Number(selectedVehicle?.shipping_cost ?? 0));
  const customsCost = numberParam(params.customsCost, Number(selectedVehicle?.customs_cost ?? 0));
  const registrationCost = numberParam(params.registrationCost, Number(cost?.transport_cost ?? 0));
  const inspectionCost = numberParam(params.inspectionCost, Number(cost?.inspection_cost ?? 0));
  const repairPreparationCost = numberParam(params.repairPreparationCost, Number(cost?.repair_cost ?? selectedVehicle?.preparation_cost ?? 0));
  const detailingCost = numberParam(params.detailingCost, Number(cost?.detailing_cost ?? 0));
  const marketingCost = numberParam(params.marketingCost, Number(selectedVehicle?.marketing_cost ?? 0));
  const salesCommission = numberParam(params.salesCommission, Number(cost?.commission_cost ?? 0));
  const otherExpenses = numberParam(params.otherExpenses, Number(selectedVehicle?.other_expenses ?? 0));
  const currencyConversionRate = numberParam(params.currencyConversionRate, 1);
  const targetProfitMargin = numberParam(params.targetProfitMargin, 12);
  const marketPrice = numberParam(params.marketPrice, selectedIntelligence?.marketAverage ?? Number(selectedVehicle?.selling_price ?? 0));
  const competitorPrice = numberParam(params.competitorPrice, 0);
  const discount = numberParam(params.discount, 0);
  const vatTax = numberParam(params.vatTax, 0);
  const sellingPrice = numberParam(params.sellingPrice, Number(selectedVehicle?.selling_price ?? 0));
  const exportDestination = firstParam(params.exportDestination);
  const currencyCode = firstParam(params.currencyCode) ?? selectedVehicle?.currency_code ?? "AED";

  const result = calculateVehiclePricing({
    purchasePrice,
    shippingCost,
    customsCost,
    registrationCost,
    inspectionCost,
    repairPreparationCost,
    detailingCost,
    marketingCost,
    salesCommission,
    otherExpenses,
    currencyConversionRate,
    targetProfitMargin,
    marketPrice,
    competitorPrice,
    exportDestination,
    discount,
    vatTax,
    sellingPrice,
  });

  async function saveVehiclePricing(formData: FormData) {
    "use server";

    const outcome = await updateVehiclePricing(formData);
    if (outcome?.error) {
      throw new Error(outcome.error);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Smart Vehicle Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Compare landed cost, market references, target margin, discount limits, and export scenarios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/sales/quotations#add-quotation">
              <FileText className="h-4 w-4" />
              Quotation
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/marketing/listings">
              <Tags className="h-4 w-4" />
              Social offer
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Landed Cost" value={formatMoney(result.totalLandedCost, currencyCode)} hint="All costs converted" icon={Calculator} />
        <KpiCard title="Minimum Price" value={formatMoney(result.minimumSellingPrice, currencyCode)} hint="Floor before discount" icon={AlertTriangle} iconColor="text-amber-500" iconBgColor="bg-amber-50" />
        <KpiCard title="Suggested Price" value={formatMoney(result.suggestedSellingPrice, currencyCode)} hint="Target plus market blend" icon={Sparkles} iconColor="text-blue-500" iconBgColor="bg-blue-50" />
        <KpiCard title="Expected Profit" value={formatMoney(result.expectedProfit, currencyCode)} hint="After selected discount" icon={Calculator} iconColor="text-emerald-500" iconBgColor="bg-emerald-50" />
        <KpiCard title="Margin" value={`${result.profitMargin.toFixed(1)}%`} hint={result.lowMarginWarning ? "Below target" : "Healthy"} icon={AlertTriangle} iconColor={result.lowMarginWarning ? "text-rose-500" : "text-emerald-500"} iconBgColor={result.lowMarginWarning ? "bg-rose-50" : "bg-emerald-50"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pricing scenario</CardTitle>
            <CardDescription>Adjust inputs, compare results, then save the approved price to inventory.</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add vehicles before using smart pricing.</p>
            ) : (
              <form className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <select id="vehicleId" name="vehicleId" defaultValue={selectedVehicleId} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.stock_number} · {vehicle.year} {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <Field id="purchasePrice" label="Purchase price" value={purchasePrice} />
                <Field id="shippingCost" label="Shipping" value={shippingCost} />
                <Field id="customsCost" label="Customs" value={customsCost} />
                <Field id="registrationCost" label="Registration/transport" value={registrationCost} />
                <Field id="inspectionCost" label="Inspection" value={inspectionCost} />
                <Field id="repairPreparationCost" label="Repair/preparation" value={repairPreparationCost} />
                <Field id="detailingCost" label="Detailing" value={detailingCost} />
                <Field id="marketingCost" label="Marketing" value={marketingCost} />
                <Field id="salesCommission" label="Sales commission" value={salesCommission} />
                <Field id="otherExpenses" label="Other expenses" value={otherExpenses} />
                <Field id="currencyConversionRate" label="Currency conversion" value={currencyConversionRate} step="0.0001" />
                <Field id="targetProfitMargin" label="Target margin %" value={targetProfitMargin} />
                <Field id="marketPrice" label="Market price" value={marketPrice} />
                <Field id="competitorPrice" label="Competitor price" value={competitorPrice} />
                <Field id="sellingPrice" label="Selling price" value={sellingPrice} />
                <Field id="discount" label="Discount" value={discount} />
                <Field id="vatTax" label="VAT/tax" value={vatTax} />
                <div className="grid gap-2">
                  <Label htmlFor="currencyCode">Currency</Label>
                  <Input id="currencyCode" name="currencyCode" defaultValue={currencyCode} maxLength={3} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exportDestination">Export destination</Label>
                  <Input id="exportDestination" name="exportDestination" defaultValue={exportDestination} placeholder="Oman" />
                </div>
                <div className="flex items-end gap-2 md:col-span-4">
                  <Button type="submit">Compare scenario</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market intelligence</CardTitle>
              <CardDescription>Latest valuation record for the selected vehicle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedIntelligence ? (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Market average</span>
                    <span className="font-medium">
                      {formatMoney(selectedIntelligence.marketAverage, selectedIntelligence.currencyCode)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Recommended price</span>
                    <span className="font-medium">
                      {formatMoney(selectedIntelligence.recommendedPrice, selectedIntelligence.currencyCode)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Sample size</span>
                    <span className="font-medium">{selectedIntelligence.sampleSize}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Add a market valuation from the vehicle detail page to enrich this scenario.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI pricing recommendation</CardTitle>
              <CardDescription>Rule-based assistant output ready for provider integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-lg border border-border/50 bg-muted/40 p-4 text-sm leading-6 text-foreground">
                {result.aiRecommendation}
              </p>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Discount limit</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatMoney(result.recommendedDiscountLimit, currencyCode)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Save approved price</CardTitle>
              <CardDescription>Updates inventory financials, detailed vehicle costing, and price history.</CardDescription>
            </CardHeader>
            <CardContent>
              {!permissions.canUpdate ? (
                <p className="text-sm text-muted-foreground">You do not have permission to update vehicle pricing.</p>
              ) : !selectedVehicle ? (
                <p className="text-sm text-muted-foreground">Choose a vehicle before saving.</p>
              ) : (
                <form action={saveVehiclePricing} className="space-y-3">
                  <HiddenPricingFields
                    vehicleId={selectedVehicle.id}
                    purchasePrice={purchasePrice}
                    shippingCost={shippingCost}
                    customsCost={customsCost}
                    registrationCost={registrationCost}
                    inspectionCost={inspectionCost}
                    repairPreparationCost={repairPreparationCost}
                    detailingCost={detailingCost}
                    marketingCost={marketingCost}
                    salesCommission={salesCommission}
                    otherExpenses={otherExpenses}
                    sellingPrice={sellingPrice || result.suggestedSellingPrice}
                    currencyCode={currencyCode}
                  />
                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4" />
                    Save price
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, step = "1" }: { id: string; label: string; value: number; step?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type="number" min="0" step={step} defaultValue={value} />
    </div>
  );
}

function HiddenPricingFields(props: {
  vehicleId: string;
  purchasePrice: number;
  shippingCost: number;
  customsCost: number;
  registrationCost: number;
  inspectionCost: number;
  repairPreparationCost: number;
  detailingCost: number;
  marketingCost: number;
  salesCommission: number;
  otherExpenses: number;
  sellingPrice: number;
  currencyCode: string;
}) {
  return (
    <>
      {Object.entries(props).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </>
  );
}
