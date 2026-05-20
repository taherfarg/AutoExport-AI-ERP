import { CalendarDays, Globe2, Megaphone, Plus, RefreshCw, Share2, Target } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MarketingStatusBadge } from "@/components/marketing/marketing-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import {
  createCampaign,
  createContentCalendarEntry,
  captureMarketplaceLead,
  createListingSyncLog,
  createMarketingListing,
  createMarketplaceChannel,
  createSocialPost,
  queueListingSyncJob,
  upsertListingPriceOverride,
  upsertLeadSourceMetrics,
} from "@/features/marketing/actions";
import { getMarketingDashboardData, getMarketingPermissions } from "@/features/marketing/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMarketingStatus } from "@/lib/marketing/format";
import { formatMoney } from "@/lib/vehicles/format";
import { campaignStatuses, listingSyncLogSeverities, listingSyncOperations, listingSyncStatuses, marketingChannelTypes, marketingListingStatuses, marketplaceLeadStatuses, socialPostStatuses } from "@/lib/validations/marketing";

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

export default async function MarketingListingsPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getMarketingDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getMarketingPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const defaultVehicle = data.vehicles[0];
  const defaultChannel = data.channels.find((channel) => channel.channel_key === "website") ?? data.channels[0];
  const defaultSocialChannel = data.channels.find((channel) => channel.channel_key === "instagram") ?? data.channels[0];
  const defaultCampaign = data.campaigns[0];
  const defaultListing = data.listings[0];
  const defaultMarketplaceChannel = data.marketplaceChannels.find((channel) => channel.channel_key === "dubizzle") ?? data.marketplaceChannels[0];
  const defaultSyncJob = data.syncJobs[0];
  const currencyCode = defaultVehicle?.currency_code ?? branches[0]?.currency_code ?? "AED";

  async function createListingFromForm(formData: FormData) {
    "use server";

    await createMarketingListing(formData);
  }

  async function createSocialPostFromForm(formData: FormData) {
    "use server";

    await createSocialPost(formData);
  }

  async function createCampaignFromForm(formData: FormData) {
    "use server";

    await createCampaign(formData);
  }

  async function createCalendarFromForm(formData: FormData) {
    "use server";

    await createContentCalendarEntry(formData);
  }

  async function saveLeadSourceFromForm(formData: FormData) {
    "use server";

    await upsertLeadSourceMetrics(formData);
  }

  async function createMarketplaceChannelFromForm(formData: FormData) {
    "use server";

    await createMarketplaceChannel(formData);
  }

  async function savePriceOverrideFromForm(formData: FormData) {
    "use server";

    await upsertListingPriceOverride(formData);
  }

  async function queueSyncJobFromForm(formData: FormData) {
    "use server";

    await queueListingSyncJob(formData);
  }

  async function createSyncLogFromForm(formData: FormData) {
    "use server";

    await createListingSyncLog(formData);
  }

  async function captureMarketplaceLeadFromForm(formData: FormData) {
    "use server";

    await captureMarketplaceLead(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Marketing & Listings</h2>
          <p className="text-sm text-slate-500">
            Vehicle listings, social drafts, campaigns, content calendar, and lead-source performance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <KpiCard title="Active listings" value={String(data.stats.activeListings)} hint="Live website/market listings" />
        <KpiCard title="Draft posts" value={String(data.stats.draftPosts)} hint="Social content awaiting review" />
        <KpiCard title="Scheduled" value={String(data.stats.scheduledPosts)} hint="Posts on the calendar" />
        <KpiCard title="Campaigns" value={String(data.stats.activeCampaigns)} hint="Active campaigns" />
        <KpiCard title="Lead sources" value={String(data.stats.leadSources)} hint="Tracked acquisition channels" />
        <KpiCard title="Spend" value={formatMoney(data.stats.totalSpend, currencyCode)} hint="Current campaign spend" />
        <KpiCard title="Marketplaces" value={String(data.stats.marketplaceChannels)} hint="Publishing channels" />
        <KpiCard title="Sync jobs" value={String(data.syncSummary.total)} hint={`${data.stats.failedSyncJobs} failed`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Listings</CardTitle>
              <CardDescription>Channel-ready vehicle listing records linked to inventory.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Listing</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3">Leads</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.listings.map((listing) => (
                      <tr key={listing.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{listing.title}</p>
                          <p className="text-xs text-slate-500">{listing.listing_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          {listing.vehicles ? `${listing.vehicles.stock_number} - ${listing.vehicles.brand} ${listing.vehicles.model}` : "Vehicle"}
                        </td>
                        <td className="px-4 py-3">{listing.listing_channels?.name ?? "No channel"}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(listing.price, listing.currency_code)}</td>
                        <td className="px-4 py-3">{listing.lead_count}</td>
                        <td className="px-4 py-3"><MarketingStatusBadge status={listing.status} /></td>
                      </tr>
                    ))}
                    {data.listings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No listings yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketplace sync</CardTitle>
              <CardDescription>Website and marketplace publishing control with provider-ready logs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                {data.marketplaceChannels.slice(0, 6).map((channel) => (
                  <div key={channel.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{channel.name}</p>
                        <p className="text-xs text-slate-500">{channel.provider} / {formatMarketingStatus(channel.channel_type)}</p>
                      </div>
                      <Globe2 className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {channel.sync_enabled ? "Sync enabled" : "Manual/provider-ready"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">Queued</p>
                  <p className="mt-1 text-2xl font-semibold">{data.syncSummary.queued}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">Completed</p>
                  <p className="mt-1 text-2xl font-semibold">{data.syncSummary.completed}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs uppercase text-slate-500">Failed</p>
                  <p className="mt-1 text-2xl font-semibold">{data.syncSummary.failed}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Job</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Operation</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.syncJobs.slice(0, 8).map((job) => (
                      <tr key={job.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{job.marketing_listings?.listing_number ?? "Listing"}</p>
                          <p className="text-xs text-slate-500">{job.external_reference ?? "No external ref"}</p>
                        </td>
                        <td className="px-4 py-3">{job.marketplace_channels?.name ?? "Channel"}</td>
                        <td className="px-4 py-3">{formatMarketingStatus(job.operation)}</td>
                        <td className="px-4 py-3">{formatMarketingStatus(job.status)}</td>
                      </tr>
                    ))}
                    {data.syncJobs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No sync jobs queued yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-950">Price overrides</h3>
                  {data.priceOverrides.slice(0, 5).map((override) => (
                    <div key={override.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{override.marketplace_channels?.name ?? "Marketplace"}</p>
                        <span className="text-xs text-slate-500">{formatMoney(override.override_price, override.currency_code)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{override.reason ?? override.marketing_listings?.listing_number ?? "Channel price"}</p>
                    </div>
                  ))}
                  {data.priceOverrides.length === 0 ? <p className="text-sm text-slate-500">No channel price overrides yet.</p> : null}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-950">Latest logs</h3>
                  {data.syncLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{log.message}</p>
                        <span className="text-xs text-slate-500">{formatMarketingStatus(log.severity)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{log.marketplace_channels?.name ?? "Marketplace"} / {new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {data.syncLogs.length === 0 ? <p className="text-sm text-slate-500">No sync logs yet.</p> : null}
                </div>

                <div className="space-y-3 xl:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-950">Marketplace leads</h3>
                  {data.marketplaceLeads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{lead.lead_name ?? lead.phone ?? lead.email}</p>
                        <span className="text-xs text-slate-500">{formatMarketingStatus(lead.status)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{lead.marketplace_channels?.name ?? "Marketplace"} / {lead.marketing_listings?.listing_number ?? "No listing"}</p>
                    </div>
                  ))}
                  {data.marketplaceLeads.length === 0 ? <p className="text-sm text-slate-500">No marketplace leads captured yet.</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Social drafts</CardTitle>
                <CardDescription>Saved captions, broadcasts, and video script drafts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.posts.slice(0, 8).map((post) => (
                  <div key={post.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{post.post_number}</p>
                        <p className="text-xs text-slate-500">{formatMarketingStatus(post.channel_type)}</p>
                      </div>
                      <MarketingStatusBadge status={post.status} />
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs text-slate-600">{post.caption}</p>
                  </div>
                ))}
                {data.posts.length === 0 ? <p className="text-sm text-slate-500">No social drafts yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign performance</CardTitle>
                <CardDescription>Manual campaign metrics until external APIs are connected.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.campaigns.slice(0, 8).map((campaign) => {
                  const performance = data.campaignPerformance.find((item) => item.campaignId === campaign.id);

                  return (
                    <div key={campaign.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{campaign.name}</p>
                          <p className="text-xs text-slate-500">{campaign.campaign_number}</p>
                        </div>
                        <MarketingStatusBadge status={campaign.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>Spend: {formatMoney(campaign.spend, campaign.currency_code)}</span>
                        <span>Remaining: {formatMoney(performance?.remainingBudget ?? 0, campaign.currency_code)}</span>
                        <span>CTR: {performance?.clickThroughRate ?? 0}%</span>
                        <span>CPL: {formatMoney(performance?.costPerLead ?? 0, campaign.currency_code)}</span>
                      </div>
                    </div>
                  );
                })}
                {data.campaigns.length === 0 ? <p className="text-sm text-slate-500">No campaigns yet.</p> : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content calendar</CardTitle>
                <CardDescription>Upcoming marketing work and scheduled posts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.calendar.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{entry.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(entry.calendar_date)} {entry.start_time ?? ""}</p>
                      </div>
                      <MarketingStatusBadge status={entry.status} />
                    </div>
                  </div>
                ))}
                {data.calendar.length === 0 ? <p className="text-sm text-slate-500">No calendar entries yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead source performance</CardTitle>
                <CardDescription>Manual acquisition performance by source.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.leadSources.slice(0, 8).map((source) => (
                  <div key={source.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{source.name}</p>
                        <p className="text-xs text-slate-500">{formatMarketingStatus(source.channel_type)}</p>
                      </div>
                      <Share2 className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <span>{source.monthly_leads} leads</span>
                      <span>{source.monthly_conversions} won</span>
                      <span>{formatMoney(source.monthly_spend, source.currency_code)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {permissions.canManageMarketing ? (
            <Card>
              <CardHeader>
                <CardTitle>Create marketplace channel</CardTitle>
                <CardDescription>Add provider-ready channels for website or marketplace publishing.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createMarketplaceChannelFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <div className="grid gap-2">
                    <Label htmlFor="marketplaceChannelName">Name</Label>
                    <Input id="marketplaceChannelName" name="name" defaultValue="Custom Marketplace" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="marketplaceChannelKey">Channel key</Label>
                    <Input id="marketplaceChannelKey" name="channelKey" defaultValue={`custom_marketplace_${today().replaceAll("-", "_")}`} required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceProvider">Provider</Label>
                      <Input id="marketplaceProvider" name="provider" defaultValue="manual" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceChannelType">Type</Label>
                      <select id="marketplaceChannelType" name="channelType" defaultValue="marketplace" className="h-9 rounded-md border bg-white px-3 text-sm">
                        {marketingChannelTypes.map((type) => (
                          <option key={type} value={type}>{formatMarketingStatus(type)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" variant="outline">
                    <Globe2 className="h-4 w-4" />
                    Save channel
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultListing && defaultMarketplaceChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Channel price override</CardTitle>
                <CardDescription>Set marketplace-specific prices without changing inventory price.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={savePriceOverrideFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultListing.branch_id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="overrideListingId">Listing</Label>
                    <select id="overrideListingId" name="listingId" defaultValue={defaultListing.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.listings.map((listing) => (
                        <option key={listing.id} value={listing.id}>{listing.listing_number} - {listing.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="overrideMarketplaceChannelId">Marketplace channel</Label>
                    <select id="overrideMarketplaceChannelId" name="marketplaceChannelId" defaultValue={defaultMarketplaceChannel.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.marketplaceChannels.map((channel) => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="overridePrice">Override price</Label>
                      <Input id="overridePrice" name="overridePrice" type="number" min="0" defaultValue={defaultListing.price} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="overrideCurrencyCode">Currency</Label>
                      <Input id="overrideCurrencyCode" name="currencyCode" defaultValue={defaultListing.currency_code} maxLength={3} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="overrideReason">Reason</Label>
                    <Input id="overrideReason" name="reason" defaultValue="Marketplace campaign price" />
                  </div>
                  <Button type="submit" variant="outline">
                    <Target className="h-4 w-4" />
                    Save price override
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultListing && defaultMarketplaceChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Queue sync job</CardTitle>
                <CardDescription>Create a provider-ready publish/update/unpublish request.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={queueSyncJobFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultListing.branch_id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="syncListingId">Listing</Label>
                    <select id="syncListingId" name="listingId" defaultValue={defaultListing.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.listings.map((listing) => (
                        <option key={listing.id} value={listing.id}>{listing.listing_number} - {listing.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="syncMarketplaceChannelId">Marketplace channel</Label>
                    <select id="syncMarketplaceChannelId" name="marketplaceChannelId" defaultValue={defaultMarketplaceChannel.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.marketplaceChannels.map((channel) => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="syncOperation">Operation</Label>
                    <select id="syncOperation" name="operation" defaultValue="publish" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {listingSyncOperations.map((operation) => (
                        <option key={operation} value={operation}>{formatMarketingStatus(operation)}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="outline">
                    <RefreshCw className="h-4 w-4" />
                    Queue sync job
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultSyncJob ? (
            <Card>
              <CardHeader>
                <CardTitle>Add sync log</CardTitle>
                <CardDescription>Record provider result, warning, or manual publishing note.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createSyncLogFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultListing?.branch_id ?? ""} />
                  <input type="hidden" name="syncJobId" value={defaultSyncJob.id} />
                  <input type="hidden" name="listingId" value={defaultSyncJob.listing_id} />
                  <input type="hidden" name="marketplaceChannelId" value={defaultSyncJob.marketplace_channel_id} />
                  <div className="grid gap-2">
                    <Label htmlFor="syncMessage">Message</Label>
                    <textarea id="syncMessage" name="message" rows={3} className="rounded-md border px-3 py-2 text-sm" defaultValue="Provider accepted the listing payload." />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="syncSeverity">Severity</Label>
                      <select id="syncSeverity" name="severity" defaultValue="info" className="h-9 rounded-md border bg-white px-3 text-sm">
                        {listingSyncLogSeverities.map((severity) => (
                          <option key={severity} value={severity}>{formatMarketingStatus(severity)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="syncJobStatus">Job status</Label>
                      <select id="syncJobStatus" name="jobStatus" defaultValue="completed" className="h-9 rounded-md border bg-white px-3 text-sm">
                        {listingSyncStatuses.map((status) => (
                          <option key={status} value={status}>{formatMarketingStatus(status)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" variant="outline">
                    <RefreshCw className="h-4 w-4" />
                    Add sync log
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultMarketplaceChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Capture marketplace lead</CardTitle>
                <CardDescription>Record incoming marketplace buyer inquiries before CRM conversion.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={captureMarketplaceLeadFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultListing?.branch_id ?? defaultBranchId ?? ""} />
                  <input type="hidden" name="marketplaceChannelId" value={defaultMarketplaceChannel.id} />
                  <input type="hidden" name="listingId" value={defaultListing?.id ?? ""} />
                  <input type="hidden" name="vehicleId" value={defaultListing?.vehicle_id ?? defaultVehicle?.id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="marketplaceLeadName">Lead name</Label>
                    <Input id="marketplaceLeadName" name="leadName" defaultValue="Marketplace Buyer" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceLeadPhone">Phone</Label>
                      <Input id="marketplaceLeadPhone" name="phone" defaultValue="+971500000000" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceLeadEmail">Email</Label>
                      <Input id="marketplaceLeadEmail" name="email" type="email" placeholder="buyer@example.com" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="marketplaceLeadMessage">Message</Label>
                    <textarea id="marketplaceLeadMessage" name="message" rows={3} className="rounded-md border px-3 py-2 text-sm" defaultValue="Interested in this vehicle and export availability." />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceLeadBudget">Budget</Label>
                      <Input id="marketplaceLeadBudget" name="budget" type="number" min="0" defaultValue={defaultListing?.price ?? 0} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="marketplaceLeadStatus">Status</Label>
                      <select id="marketplaceLeadStatus" name="status" defaultValue="new" className="h-9 rounded-md border bg-white px-3 text-sm">
                        {marketplaceLeadStatuses.map((status) => (
                          <option key={status} value={status}>{formatMarketingStatus(status)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input type="hidden" name="currencyCode" value={currencyCode} />
                  <Button type="submit" variant="outline">
                    <Share2 className="h-4 w-4" />
                    Capture marketplace lead
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultVehicle && defaultChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Create listing</CardTitle>
                <CardDescription>Generate a listing from inventory and select a publishing channel.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createListingFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <div className="grid gap-2">
                    <Label htmlFor="vehicleId">Vehicle</Label>
                    <select id="vehicleId" name="vehicleId" defaultValue={defaultVehicle.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.stock_number} - {vehicle.year} {vehicle.brand} {vehicle.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="channelId">Channel</Label>
                    <select id="channelId" name="channelId" defaultValue={defaultChannel.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>
                  <input type="hidden" name="branchId" value={defaultVehicle.branch_id ?? defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="listingTitle">Title</Label>
                    <Input id="listingTitle" name="title" defaultValue={`${defaultVehicle.year} ${defaultVehicle.brand} ${defaultVehicle.model}`} required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price</Label>
                      <Input id="price" name="price" type="number" min="0" defaultValue={defaultVehicle.selling_price} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="currencyCode">Currency</Label>
                      <Input id="currencyCode" name="currencyCode" defaultValue={defaultVehicle.currency_code} maxLength={3} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="listingStatus">Status</Label>
                    <select id="listingStatus" name="status" defaultValue="active" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {marketingListingStatuses.map((status) => (
                        <option key={status} value={status}>{formatMarketingStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input name="exportAvailable" type="checkbox" defaultChecked={defaultVehicle.export_available} />
                    Export available
                  </label>
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Create listing
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultVehicle && defaultSocialChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Create social draft</CardTitle>
                <CardDescription>Save channel-specific copy for social or WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createSocialPostFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultVehicle.branch_id ?? defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="socialVehicleId">Vehicle</Label>
                    <select id="socialVehicleId" name="vehicleId" defaultValue={defaultVehicle.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.stock_number} - {vehicle.brand} {vehicle.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="socialChannelId">Channel</Label>
                    <select id="socialChannelId" name="channelId" defaultValue={defaultSocialChannel.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="channelType">Channel type</Label>
                    <select id="channelType" name="channelType" defaultValue="instagram" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {marketingChannelTypes.map((type) => (
                        <option key={type} value={type}>{formatMarketingStatus(type)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="caption">Caption</Label>
                    <textarea id="caption" name="caption" rows={4} className="rounded-md border px-3 py-2 text-sm" defaultValue={`${defaultVehicle.year} ${defaultVehicle.brand} ${defaultVehicle.model} available now.`} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hashtags">Hashtags</Label>
                    <Input id="hashtags" name="hashtags" defaultValue={`#${defaultVehicle.brand} #${defaultVehicle.model} #AutoSphere`} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="postStatus">Status</Label>
                    <select id="postStatus" name="status" defaultValue="draft" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {socialPostStatuses.map((status) => (
                        <option key={status} value={status}>{formatMarketingStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="outline">
                    <Megaphone className="h-4 w-4" />
                    Create social draft
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing && defaultChannel ? (
            <Card>
              <CardHeader>
                <CardTitle>Create campaign</CardTitle>
                <CardDescription>Track budget, spend, and lead metrics manually.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCampaignFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="campaignName">Name</Label>
                    <Input id="campaignName" name="name" defaultValue={`Export campaign ${today()}`} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="campaignChannelId">Channel</Label>
                    <select id="campaignChannelId" name="channelId" defaultValue={defaultChannel.id} className="h-9 rounded-md border bg-white px-3 text-sm">
                      {data.channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="campaignStatus">Status</Label>
                    <select id="campaignStatus" name="status" defaultValue="active" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {campaignStatuses.map((status) => (
                        <option key={status} value={status}>{formatMarketingStatus(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget</Label>
                      <Input id="budget" name="budget" type="number" min="0" defaultValue="10000" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="spend">Spend</Label>
                      <Input id="spend" name="spend" type="number" min="0" defaultValue="2500" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start date</Label>
                      <Input id="startDate" name="startDate" type="date" defaultValue={today()} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End date</Label>
                      <Input id="endDate" name="endDate" type="date" defaultValue={dateIn(30)} />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="currencyCode" defaultValue={currencyCode} maxLength={3} aria-label="Campaign currency" />
                    <Input id="leads" name="leads" type="number" min="0" defaultValue="25" aria-label="Campaign leads" />
                  </div>
                  <Button type="submit" variant="outline">
                    <Target className="h-4 w-4" />
                    Create campaign
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing ? (
            <Card>
              <CardHeader>
                <CardTitle>Add calendar item</CardTitle>
                <CardDescription>Schedule marketing work around listings and campaigns.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCalendarFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <input type="hidden" name="listingId" value={defaultListing?.id ?? ""} />
                  <input type="hidden" name="campaignId" value={defaultCampaign?.id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="calendarTitle">Title</Label>
                    <Input id="calendarTitle" name="title" defaultValue="Publish weekly vehicle spotlight" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="calendarDate">Date</Label>
                      <Input id="calendarDate" name="calendarDate" type="date" defaultValue={dateIn(3)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">Time</Label>
                      <Input id="startTime" name="startTime" type="time" defaultValue="10:30" />
                    </div>
                  </div>
                  <Button type="submit" variant="outline">
                    <CalendarDays className="h-4 w-4" />
                    Add calendar item
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageMarketing ? (
            <Card>
              <CardHeader>
                <CardTitle>Update lead source</CardTitle>
                <CardDescription>Manual source performance until Meta/WhatsApp APIs are connected.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={saveLeadSourceFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <div className="grid gap-2">
                    <Label htmlFor="sourceKey">Source key</Label>
                    <Input id="sourceKey" name="sourceKey" defaultValue="instagram" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sourceName">Name</Label>
                    <Input id="sourceName" name="name" defaultValue="Instagram" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sourceChannelType">Channel type</Label>
                    <select id="sourceChannelType" name="channelType" defaultValue="instagram" className="h-9 rounded-md border bg-white px-3 text-sm">
                      {marketingChannelTypes.map((type) => (
                        <option key={type} value={type}>{formatMarketingStatus(type)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input id="monthlyLeads" name="monthlyLeads" type="number" min="0" defaultValue="20" aria-label="Monthly leads" />
                    <Input id="monthlySpend" name="monthlySpend" type="number" min="0" defaultValue="1500" aria-label="Monthly spend" />
                    <Input id="monthlyConversions" name="monthlyConversions" type="number" min="0" defaultValue="3" aria-label="Monthly conversions" />
                  </div>
                  <input type="hidden" name="currencyCode" value={currencyCode} />
                  <Button type="submit" variant="outline">
                    <Share2 className="h-4 w-4" />
                    Save source metrics
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
