"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrainCircuit, History, ScanSearch, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createVehicleCompetitorPrice,
  createVehicleHistoryReport,
  createVehicleMarketValue,
  createVinDecodeRequest,
} from "@/features/vehicles/actions";

type ActionResult = {
  success?: string;
  error?: string;
};

type VehicleIntelligenceFormsProps = {
  vehicleId: string;
  vin: string;
  currencyCode: string;
  sellingPrice: number;
};

type IntelligenceFormProps = {
  children: ReactNode;
  action: (formData: FormData) => Promise<ActionResult | undefined>;
  submitLabel: string;
  pendingLabel: string;
  icon: ReactNode;
};

function messageClass(type: "success" | "error") {
  return type === "error"
    ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700";
}

function IntelligenceForm({
  children,
  action,
  submitLabel,
  pendingLabel,
  icon,
}: IntelligenceFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const success = result?.success ?? "Vehicle intelligence saved.";
      setMessage({ type: "success", text: success });
      formRef.current?.reset();
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 rounded-md border p-4">
      {message ? <div className={messageClass(message.type)}>{message.text}</div> : null}
      {children}
      <Button type="submit" variant="outline" disabled={isPending}>
        {icon}
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

export function VehicleIntelligenceForms({
  vehicleId,
  vin,
  currencyCode,
  sellingPrice,
}: VehicleIntelligenceFormsProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4">
      <IntelligenceForm
        action={createVinDecodeRequest}
        submitLabel="Save VIN decode"
        pendingLabel="Saving VIN decode..."
        icon={<ScanSearch className="h-4 w-4" />}
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="vin" value={vin} />
        <input type="hidden" name="status" value="completed" />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="decodedBrand">Decoded brand</Label>
            <Input id="decodedBrand" name="decodedBrand" placeholder="Toyota" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="decodedModel">Decoded model</Label>
            <Input id="decodedModel" name="decodedModel" placeholder="Hilux" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="decodedYear">Decoded year</Label>
            <Input id="decodedYear" name="decodedYear" type="number" min="1900" max="2100" placeholder="2026" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="decodedTrim">Trim</Label>
            <Input id="decodedTrim" name="decodedTrim" placeholder="GR Sport" />
          </div>
        </div>
      </IntelligenceForm>

      <IntelligenceForm
        action={createVehicleMarketValue}
        submitLabel="Save valuation"
        pendingLabel="Saving valuation..."
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="marketCurrencyCode" value={currencyCode} />
        <div className="grid gap-3 md:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="marketLow">Market low</Label>
            <Input id="marketLow" name="marketLow" type="number" min="0" defaultValue={Math.max(Math.round(sellingPrice * 0.92), 0)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="marketAverage">Market average</Label>
            <Input id="marketAverage" name="marketAverage" type="number" min="0" defaultValue={Math.round(sellingPrice)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="marketHigh">Market high</Label>
            <Input id="marketHigh" name="marketHigh" type="number" min="0" defaultValue={Math.round(sellingPrice * 1.08)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recommendedPrice">Recommended</Label>
            <Input id="recommendedPrice" name="recommendedPrice" type="number" min="0" placeholder="Auto if blank" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sampleSize">Sample size</Label>
            <Input id="sampleSize" name="sampleSize" type="number" min="0" defaultValue={3} />
          </div>
        </div>
      </IntelligenceForm>

      <IntelligenceForm
        action={createVehicleCompetitorPrice}
        submitLabel="Save competitor price"
        pendingLabel="Saving competitor..."
        icon={<BrainCircuit className="h-4 w-4" />}
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="currencyCode" value={currencyCode} />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="sourceName">Source</Label>
            <Input id="sourceName" name="sourceName" placeholder="Dubizzle" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="competitorPrice">Price</Label>
            <Input id="competitorPrice" name="price" type="number" min="0" placeholder="145000" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="competitorMileage">Mileage</Label>
            <Input id="competitorMileage" name="mileage" type="number" min="0" defaultValue={0} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="observedAt">Observed at</Label>
            <Input id="observedAt" name="observedAt" type="date" defaultValue={today} />
          </div>
        </div>
      </IntelligenceForm>

      <IntelligenceForm
        action={createVehicleHistoryReport}
        submitLabel="Save history report"
        pendingLabel="Saving history..."
        icon={<History className="h-4 w-4" />}
      >
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="historyProvider">Provider</Label>
            <Input id="historyProvider" name="provider" defaultValue="manual" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="historyRiskSummary">Risk summary</Label>
            <select id="historyRiskSummary" name="riskSummary" defaultValue="low" className="h-9 rounded-md border bg-white px-3 text-sm">
              <option value="unknown">Unknown</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accidentCount">Accidents</Label>
            <Input id="accidentCount" name="accidentCount" type="number" min="0" defaultValue={0} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ownerCount">Owners</Label>
            <Input id="ownerCount" name="ownerCount" type="number" min="0" defaultValue={1} />
          </div>
        </div>
      </IntelligenceForm>
    </div>
  );
}
