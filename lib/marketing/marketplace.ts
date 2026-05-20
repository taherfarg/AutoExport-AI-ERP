export type MarketplaceVehiclePayload = {
  stockNumber: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  exportAvailable: boolean;
};

export type BuildMarketplacePayloadInput = {
  listingNumber: string;
  title: string;
  price: number;
  currencyCode: string;
  channelKey: string;
  vehicle: MarketplaceVehiclePayload;
  overridePrice?: number | null;
  notes?: string | null;
};

export type SyncJobLike = {
  status: string;
};

export type MarketplaceLeadContactInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
};

const SYNC_STATUSES = ["queued", "running", "completed", "failed", "cancelled"] as const;

export function buildMarketplacePayload({
  listingNumber,
  title,
  price,
  currencyCode,
  channelKey,
  vehicle,
  overridePrice,
  notes,
}: BuildMarketplacePayloadInput) {
  return {
    externalReference: `${channelKey}-${listingNumber}`,
    title,
    price: overridePrice && overridePrice > 0 ? overridePrice : price,
    currencyCode: currencyCode.toUpperCase(),
    channelKey,
    notes: notes ?? null,
    vehicle,
  };
}

export function summarizeSyncJobs(jobs: SyncJobLike[]) {
  const summary = {
    total: jobs.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const job of jobs) {
    if (SYNC_STATUSES.includes(job.status as (typeof SYNC_STATUSES)[number])) {
      summary[job.status as keyof typeof summary] += 1;
    }
  }

  return summary;
}

export function hasMarketplaceContact({ phone, email, whatsapp }: MarketplaceLeadContactInput) {
  return Boolean(phone?.trim() || email?.trim() || whatsapp?.trim());
}
