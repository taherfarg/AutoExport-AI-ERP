import { CalendarDays, Megaphone, Plus, Share2, Target } from "lucide-react";
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
  createMarketingListing,
  createSocialPost,
  upsertLeadSourceMetrics,
} from "@/features/marketing/actions";
import { getMarketingDashboardData, getMarketingPermissions } from "@/features/marketing/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatMarketingStatus } from "@/lib/marketing/format";
import { formatMoney } from "@/lib/vehicles/format";
import { campaignStatuses, marketingChannelTypes, marketingListingStatuses, socialPostStatuses } from "@/lib/validations/marketing";

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Active listings" value={String(data.stats.activeListings)} hint="Live website/market listings" />
        <KpiCard title="Draft posts" value={String(data.stats.draftPosts)} hint="Social content awaiting review" />
        <KpiCard title="Scheduled" value={String(data.stats.scheduledPosts)} hint="Posts on the calendar" />
        <KpiCard title="Campaigns" value={String(data.stats.activeCampaigns)} hint="Active campaigns" />
        <KpiCard title="Lead sources" value={String(data.stats.leadSources)} hint="Tracked acquisition channels" />
        <KpiCard title="Spend" value={formatMoney(data.stats.totalSpend, currencyCode)} hint="Current campaign spend" />
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
