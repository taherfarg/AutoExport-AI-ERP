import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TARGET_EMAIL = process.env.DEMO_USER_EMAIL ?? "taherfarg50@gmail.com";
const TARGET_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "12345678";
const DEMO_PREFIX = "DEMO";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local/.env.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date("2026-05-21T09:00:00.000Z");
const iso = (days = 0) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const date = (days = 0) => iso(days).slice(0, 10);

async function ensure(table, match, values, select = "*") {
  const query = supabase.from(table).select(select).match(match).limit(1);
  const { data: existing, error: selectError } = await query.maybeSingle();
  if (selectError) throw new Error(`${table} select failed: ${selectError.message}`);

  if (existing?.id) {
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .eq("id", existing.id)
      .select(select)
      .single();
    if (error) throw new Error(`${table} update failed: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase.from(table).insert({ ...match, ...values }).select(select).single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}

async function upsert(table, rows, onConflict, select = "*") {
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select(select);
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return data ?? [];
}

async function count(companyId, table) {
  const { count: total, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return total ?? 0;
}

async function getAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Auth user lookup failed: ${error.message}`);

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  return null;
}

async function ensureDemoUserAndWorkspace() {
  const metadata = {
    full_name: "Taher Farg",
    business_role: "company_owner",
  };
  const existingUser = await getAuthUserByEmail(TARGET_EMAIL);
  const { data: authData, error: authError } = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    })
    : await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });

  if (authError || !authData.user) {
    throw new Error(`Demo auth user could not be prepared: ${authError?.message ?? "Missing user"}`);
  }

  const profile = await ensure(
    "profiles",
    { id: authData.user.id },
    {
      auth_user_id: authData.user.id,
      full_name: metadata.full_name,
      email: TARGET_EMAIL,
      business_role: metadata.business_role,
      status: "active",
    },
    "id, email, full_name",
  );

  const company = await ensure(
    "companies",
    { slug: "pollux-motors-it" },
    {
      name: "Pollux Motors IT",
      legal_name: "Pollux Motors IT",
      primary_country_code: "AE",
      primary_currency_code: "AED",
      default_language: "en",
      timezone: "Asia/Dubai",
      status: "trial",
    },
    "id, name, slug",
  );

  const ownerRole = await ensure(
    "roles",
    { company_id: company.id, role_key: "company_owner" },
    {
      name: "Company Owner",
      description: "Full administrative access to the company workspace.",
      scope: "company",
      is_system_role: true,
      created_by: profile.id,
      updated_by: profile.id,
    },
    "id, company_id, role_key",
  );

  const { data: permissions, error: permissionsError } = await supabase.from("permissions").select("id");
  if (permissionsError || !permissions?.length) {
    throw new Error(`Permissions are not configured: ${permissionsError?.message ?? "No permissions"}`);
  }

  await upsert(
    "role_permissions",
    permissions.map((permission) => ({
      company_id: company.id,
      role_id: ownerRole.id,
      permission_id: permission.id,
    })),
    "role_id,permission_id",
    "id",
  );

  const membership = await ensure(
    "company_memberships",
    { company_id: company.id, profile_id: profile.id },
    { status: "active", joined_at: new Date().toISOString() },
    "id, company_id, status, companies(id, name, slug)",
  );

  await ensure(
    "user_roles",
    { company_id: company.id, profile_id: profile.id, role_id: ownerRole.id },
    {},
    "id",
  );

  const { data: enterprisePackage, error: packageError } = await supabase
    .from("packages")
    .select("id")
    .eq("package_key", "enterprise_dealer_group")
    .single();
  if (packageError || !enterprisePackage) {
    throw new Error(`Enterprise package is not configured: ${packageError?.message ?? "Missing package"}`);
  }

  await ensure(
    "subscriptions",
    { company_id: company.id },
    {
      package_id: enterprisePackage.id,
      status: "active",
      created_by: profile.id,
      updated_by: profile.id,
    },
    "id",
  );

  return { profile, membership };
}

async function main() {
  const { profile, membership } = await ensureDemoUserAndWorkspace();

  const companyId = membership.company_id;
  const actorId = profile.id;

  console.log(`Seeding demo data for ${membership.companies.name} (${companyId}) as ${profile.email}`);

  const branches = await upsert(
    "branches",
    [
      {
        company_id: companyId,
        code: "DEMO-DXB",
        name: "Demo Dubai Showroom",
        country_code: "AE",
        city: "Dubai",
        address: "Sheikh Zayed Road",
        phone: "+971500000100",
        email: "dubai.demo@pollux.test",
        currency_code: "AED",
        timezone: "Asia/Dubai",
        is_head_office: true,
        status: "active",
        created_by: actorId,
        updated_by: actorId,
      },
      {
        company_id: companyId,
        code: "DEMO-BRU",
        name: "Demo Belgium Stock Yard",
        country_code: "BE",
        city: "Antwerp",
        address: "Port stock zone",
        phone: "+3230000100",
        email: "belgium.demo@pollux.test",
        currency_code: "EUR",
        timezone: "Europe/Brussels",
        is_head_office: false,
        status: "active",
        created_by: actorId,
        updated_by: actorId,
      },
    ],
    "company_id,code"
  );

  for (const branch of branches) {
    await ensure("branch_memberships", { branch_id: branch.id, profile_id: actorId }, { company_id: companyId, status: "active" });
  }

  const dxb = branches.find((branch) => branch.code === "DEMO-DXB") ?? branches[0];
  const bru = branches.find((branch) => branch.code === "DEMO-BRU") ?? branches[1] ?? branches[0];

  await upsert(
    "destination_countries",
    [
      { country_code: "DZ", country_name: "Algeria", region: "africa", common_ports: ["Algiers", "Oran"], currency_code: "DZD", active: true },
      { country_code: "EG", country_name: "Egypt", region: "mena", common_ports: ["Alexandria", "Port Said"], currency_code: "EGP", active: true },
      { country_code: "LY", country_name: "Libya", region: "africa", common_ports: ["Tripoli", "Benghazi"], currency_code: "LYD", active: true },
      { country_code: "GH", country_name: "Ghana", region: "africa", common_ports: ["Tema"], currency_code: "GHS", active: true },
      { country_code: "QA", country_name: "Qatar", region: "gcc", common_ports: ["Hamad"], currency_code: "QAR", active: true },
      { country_code: "OM", country_name: "Oman", region: "gcc", common_ports: ["Sohar"], currency_code: "OMR", active: true },
      { country_code: "SA", country_name: "Saudi Arabia", region: "gcc", common_ports: ["Jeddah", "Dammam"], currency_code: "SAR", active: true },
    ],
    "country_code"
  );

  const vehicles = await upsert(
    "vehicles",
    [
      vehicle(companyId, dxb.id, actorId, "DEMO-HILUX-25", "MR0CB9CD0T3310678", "Toyota", "Hilux", 2025, "GR Sport", "available", 138000, 191000, "AE", "AE", true),
      vehicle(companyId, dxb.id, actorId, "DEMO-LX600-25", "JTJGB7CX5S4025101", "Lexus", "LX 600", 2025, "VIP", "available", 405000, 535000, "JP", "AE", true),
      vehicle(companyId, dxb.id, actorId, "DEMO-G63-24", "W1NYC7HJ9RX441001", "Mercedes-Benz", "G-Class", 2024, "G 63 AMG", "sold", 620000, 795000, "DE", "AE", false),
      vehicle(companyId, bru.id, actorId, "DEMO-PATROL-25", "JN8AY2NE2S9122101", "Nissan", "Patrol", 2025, "Platinum", "in_transit", 238000, 315000, "JP", "BE", true),
      vehicle(companyId, bru.id, actorId, "DEMO-LC300-25", "JTMAB7BJ4S4022102", "Toyota", "Land Cruiser 300", 2025, "VX-R", "under_customs_clearance", 286000, 382000, "JP", "BE", true),
      vehicle(companyId, dxb.id, actorId, "DEMO-RAPTOR-25", "1FTER4LR8SLE41001", "Ford", "Ranger Raptor", 2025, "Bi-Turbo", "under_preparation", 177000, 242000, "TH", "AE", true),
    ],
    "company_id,stock_number"
  );

  for (const item of vehicles) {
    await ensure(
      "vehicle_costs",
      { company_id: companyId, vehicle_id: item.id },
      {
        purchase_price: item.purchase_price,
        shipping_cost: item.shipping_cost,
        customs_cost: item.customs_cost,
        transport_cost: 3500,
        inspection_cost: 1500,
        repair_cost: 4500,
        detailing_cost: 1200,
        marketing_cost: item.marketing_cost,
        commission_cost: 2500,
        other_expenses: item.other_expenses,
        total_landed_cost: item.total_landed_cost,
        selling_price: item.selling_price,
        gross_profit: item.expected_profit,
        net_profit: Math.max(Number(item.expected_profit) - 2500, 0),
        profit_margin: item.profit_margin,
        currency_code: "AED",
        notes: "Demo cost sheet for end-to-end feature testing.",
        created_by: actorId,
        updated_by: actorId,
      }
    );
  }

  const hilux = vehicles.find((item) => item.stock_number === "DEMO-HILUX-25");
  const lx = vehicles.find((item) => item.stock_number === "DEMO-LX600-25");
  const g63 = vehicles.find((item) => item.stock_number === "DEMO-G63-24");
  const patrol = vehicles.find((item) => item.stock_number === "DEMO-PATROL-25");
  const lc300 = vehicles.find((item) => item.stock_number === "DEMO-LC300-25");
  const raptor = vehicles.find((item) => item.stock_number === "DEMO-RAPTOR-25");

  const customers = [];
  for (const data of [
    customer(companyId, dxb.id, actorId, "Algeria Auto Dealer", "dealer", "demo.algeria@autosphere.test", "DZ", "Algiers"),
    customer(companyId, dxb.id, actorId, "Dubai Towers Contracting", "company", "demo.dubai@autosphere.test", "AE", "Dubai"),
    customer(companyId, bru.id, actorId, "Sahara Motors DZ", "export_buyer", "demo.sahara@autosphere.test", "DZ", "Oran"),
    customer(companyId, dxb.id, actorId, "Gulf Fleet Buyers", "company", "demo.fleet@autosphere.test", "QA", "Doha"),
    customer(companyId, dxb.id, actorId, "Private Export Customer", "individual", "demo.private@autosphere.test", "OM", "Muscat"),
  ]) {
    customers.push(await ensure("customers", { company_id: companyId, email: data.email }, data));
  }

  const algeria = customers[0];
  const dubai = customers[1];
  const sahara = customers[2];
  const gulf = customers[3];

  const leads = [];
  for (const data of [
    lead(companyId, dxb.id, actorId, algeria, "Toyota Hilux export inquiry", "Toyota", "Hilux", 205000, "export_inquiry", "interested", 88),
    lead(companyId, dxb.id, actorId, dubai, "G-Class corporate purchase", "Mercedes-Benz", "G-Class", 820000, "whatsapp", "quotation_sent", 76),
    lead(companyId, bru.id, actorId, sahara, "Land Cruiser Algeria shipment", "Toyota", "Land Cruiser 300", 390000, "website", "negotiation", 91),
    lead(companyId, dxb.id, actorId, gulf, "Fleet Patrol purchase", "Nissan", "Patrol", 330000, "instagram", "contacted", 67),
  ]) {
    leads.push(await ensure("leads", { company_id: companyId, email: data.email }, data));
  }

  await ensure("lead_messages", { company_id: companyId, lead_id: leads[0].id, subject: "Demo WhatsApp inquiry" }, {
    branch_id: dxb.id,
    customer_id: algeria.id,
    direction: "inbound",
    channel: "whatsapp",
    body: "Customer requested CIF Algiers price and export documents checklist.",
    message_at: iso(-2),
    created_by: actorId,
  });
  await ensure("follow_ups", { company_id: companyId, lead_id: leads[0].id, title: "Send Hilux export quotation" }, {
    branch_id: dxb.id,
    customer_id: algeria.id,
    assigned_to: actorId,
    notes: "Include shipping estimate, proforma terms, and certificate of origin.",
    due_at: iso(1),
    status: "open",
    priority: "urgent",
    created_by: actorId,
    updated_by: actorId,
  });

  const quotation = await ensure("quotations", { company_id: companyId, quotation_number: "DEMO-Q-0001" }, {
    branch_id: dxb.id,
    customer_id: algeria.id,
    lead_id: leads[0].id,
    vehicle_id: hilux.id,
    price: 191000,
    discount: 2500,
    tax: 9425,
    total: 197925,
    currency_code: "AED",
    valid_until: date(7),
    notes: "Demo export quotation for Toyota Hilux GR Sport.",
    salesperson_id: actorId,
    status: "sent",
    created_by: actorId,
    updated_by: actorId,
  });

  const reservation = await ensure("reservations", { company_id: companyId, reservation_number: "DEMO-RSV-0001" }, {
    branch_id: dxb.id,
    quotation_id: quotation.id,
    lead_id: leads[0].id,
    customer_id: algeria.id,
    vehicle_id: lx.id,
    deposit_amount: 30000,
    currency_code: "AED",
    reservation_date: date(-1),
    expiry_date: date(5),
    payment_status: "deposit_paid",
    agreement_signature_status: "sent",
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });

  const proforma = await ensure("proforma_invoices", { company_id: companyId, proforma_number: "DEMO-PI-0001" }, {
    branch_id: dxb.id,
    quotation_id: quotation.id,
    reservation_id: reservation.id,
    customer_id: algeria.id,
    lead_id: leads[0].id,
    vehicle_id: hilux.id,
    export_destination: "Algeria - Algiers Port",
    vehicle_price: 188500,
    shipping_estimate: 8500,
    additional_fees: 1800,
    tax: 9425,
    total: 208225,
    currency_code: "AED",
    payment_terms: "30% deposit, balance before BL release.",
    signature_status: "sent",
    status: "sent",
    created_by: actorId,
    updated_by: actorId,
  });

  const invoice = await ensure("sales_invoices", { company_id: companyId, invoice_number: "DEMO-SI-0001" }, {
    branch_id: dxb.id,
    quotation_id: quotation.id,
    reservation_id: reservation.id,
    proforma_invoice_id: proforma.id,
    customer_id: algeria.id,
    lead_id: leads[0].id,
    vehicle_id: g63.id,
    final_price: 795000,
    tax: 39750,
    total: 834750,
    paid_amount: 500000,
    balance_due: 334750,
    currency_code: "AED",
    due_date: date(10),
    payment_method: "bank_transfer",
    invoice_status: "partial_payment",
    created_by: actorId,
    updated_by: actorId,
  });

  await ensure("payments", { company_id: companyId, payment_number: "DEMO-PAY-0001" }, {
    branch_id: dxb.id,
    customer_id: algeria.id,
    vehicle_id: g63.id,
    related_invoice_id: invoice.id,
    reservation_id: reservation.id,
    payment_type: "partial_payment",
    amount: 500000,
    currency_code: "AED",
    payment_method: "bank_transfer",
    payment_date: date(-1),
    status: "completed",
    received_by: actorId,
    notes: "Demo bank transfer receipt.",
    created_by: actorId,
    updated_by: actorId,
  });

  const shipper = await ensure("logistics_partners", { company_id: companyId, name: "Demo Gulf Ocean Lines", partner_type: "shipping_company" }, {
    country_code: "AE",
    city: "Dubai",
    contact_name: "Mina Rahman",
    phone: "+971500001111",
    email: "ops@gulfocean.demo",
    active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const broker = await ensure("logistics_partners", { company_id: companyId, name: "Demo ClearPort Customs", partner_type: "customs_broker" }, {
    country_code: "AE",
    city: "Jebel Ali",
    contact_name: "Omar Nasser",
    phone: "+971500002222",
    email: "clearance@clearport.demo",
    active: true,
    created_by: actorId,
    updated_by: actorId,
  });

  const exportOrder = await ensure("export_orders", { company_id: companyId, export_order_number: "DEMO-EXP-0001" }, {
    branch_id: dxb.id,
    customer_id: algeria.id,
    vehicle_id: hilux.id,
    sales_invoice_id: invoice.id,
    proforma_invoice_id: proforma.id,
    destination_country_code: "DZ",
    destination_port: "Algiers",
    shipping_method: "container",
    shipping_company_id: shipper.id,
    logistics_partner_id: shipper.id,
    booking_number: "BK-DEMO-7788",
    container_number: "MSCU1234567",
    bl_number: "BL-DEMO-2026-001",
    estimated_departure_date: date(5),
    estimated_arrival_date: date(21),
    shipping_status: "booked",
    customs_status: "submitted",
    payment_status: "partial_payment",
    document_status: "uploaded",
    status: "active",
    notes: "Demo export order for Algeria testing.",
    created_by: actorId,
    updated_by: actorId,
  });

  const importOrder = await ensure("import_orders", { company_id: companyId, import_order_number: "DEMO-IMP-0001" }, {
    branch_id: bru.id,
    supplier_name: "Demo Antwerp Vehicle Source",
    origin_country_code: "BE",
    origin_port: "Antwerp",
    destination_country_code: "AE",
    destination_port: "Jebel Ali",
    shipping_method: "ro_ro",
    logistics_partner_id: shipper.id,
    vehicle_count: 3,
    estimated_departure_date: date(3),
    estimated_arrival_date: date(18),
    shipping_status: "vehicle_delivered_to_port",
    customs_status: "pending_documents",
    status: "in_transit",
    notes: "Demo inbound stock shipment.",
    created_by: actorId,
    updated_by: actorId,
  });

  await ensure("shipping_events", { company_id: companyId, export_order_id: exportOrder.id, event_status: "booked" }, {
    branch_id: dxb.id,
    event_date: iso(-1),
    location: "Jebel Ali",
    notes: "Carrier booking confirmed for demo shipment.",
    created_by: actorId,
  });
  await ensure("customs_clearance", { company_id: companyId, export_order_id: exportOrder.id }, {
    branch_id: dxb.id,
    broker_id: broker.id,
    customs_status: "submitted",
    declaration_number: "DEC-DEMO-4451",
    inspection_date: date(2),
    duties_amount: 6200,
    currency_code: "AED",
    notes: "Demo customs declaration under review.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("export_documents", { company_id: companyId, export_order_id: exportOrder.id, document_type: "certificate_of_origin" }, {
    branch_id: dxb.id,
    title: "Certificate of Origin",
    status: "uploaded",
    is_required: true,
    storage_bucket: "documents",
    storage_path: `${companyId}/demo/export-certificate-origin.pdf`,
    verified_by: actorId,
    verified_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("shipment_costs", { company_id: companyId, export_order_id: exportOrder.id, description: "Demo ocean freight to Algiers" }, {
    branch_id: dxb.id,
    cost_type: "ocean_freight",
    amount: 8500,
    currency_code: "AED",
    cost_date: date(0),
    supplier_name: "Demo Gulf Ocean Lines",
    created_by: actorId,
    updated_by: actorId,
  });

  await seedFinance(companyId, dxb, actorId, hilux, g63, algeria, invoice, exportOrder, importOrder);
  const marketing = await seedMarketing(companyId, dxb, actorId, hilux, leads[0]);
  await seedDocuments(companyId, dxb, actorId, hilux, algeria, reservation, proforma, invoice);
  const service = await seedService(companyId, dxb, actorId, raptor, dubai);
  await seedParts(companyId, dxb, bru, actorId, service.order, service.job);
  await seedDealDesk(companyId, dxb, actorId, lx, algeria, quotation, reservation, invoice);
  await seedAccounting(companyId, dxb, actorId, invoice, algeria, g63);
  await seedOps(companyId, dxb, actorId, hilux, algeria, exportOrder, marketing.listing);
  await seedAi(companyId, dxb, actorId, hilux, marketing.listing);
  await seedBilling(companyId, actorId);

  const tables = [
    "branches",
    "vehicles",
    "customers",
    "leads",
    "quotations",
    "reservations",
    "proforma_invoices",
    "sales_invoices",
    "payments",
    "export_orders",
    "import_orders",
    "marketing_listings",
    "marketplace_leads",
    "service_orders",
    "parts",
    "part_stock",
    "deals",
    "gl_accounts",
    "ai_requests",
    "alerts",
    "chat_threads",
    "billing_customers",
  ];

  console.log("\nDemo data counts:");
  for (const table of tables) {
    console.log(`${table.padEnd(22)} ${await count(companyId, table)}`);
  }
}

function vehicle(company_id, branch_id, actorId, stock_number, vin, brand, model, year, trim, status, cost, price, origin, current, exportAvailable) {
  const shipping = Math.round(cost * 0.035);
  const customs = Math.round(cost * 0.05);
  const preparation = 4500;
  const marketing = 1800;
  const other = 1200;
  const total = cost + shipping + customs + preparation + marketing + other;
  const profit = price - total;
  const margin = price > 0 ? Math.round((profit / price) * 10000) / 100 : 0;
  return {
    company_id,
    branch_id,
    stock_number,
    vin,
    brand,
    model,
    year,
    trim,
    condition: year >= 2025 ? "new" : "used",
    mileage: year >= 2025 ? 35 : 8200,
    exterior_color: brand === "Toyota" ? "Pearl White" : brand === "Lexus" ? "Sonic Titanium" : "Obsidian Black",
    interior_color: "Black",
    engine: "Turbo petrol",
    transmission: "Automatic",
    drivetrain: "4WD",
    fuel_type: "Petrol",
    body_type: "SUV / Pickup",
    seats: brand === "Toyota" && model === "Hilux" ? 5 : 7,
    doors: 5,
    origin_country_code: origin,
    current_country_code: current,
    current_location: branch_id ? "Demo stock zone" : null,
    purchase_price: cost,
    shipping_cost: shipping,
    customs_cost: customs,
    preparation_cost: preparation,
    marketing_cost: marketing,
    other_expenses: other,
    total_landed_cost: total,
    selling_price: price,
    expected_profit: profit,
    profit_margin: margin,
    currency_code: "AED",
    status,
    export_available: exportAvailable,
    website_listing_status: "draft",
    social_media_status: "draft",
    documents_status: "partial",
    photos_status: "partial",
    acquired_at: date(-18),
    created_by: actorId,
    updated_by: actorId,
  };
}

function customer(company_id, branch_id, actorId, name, customer_type, email, country_code, city) {
  return {
    company_id,
    branch_id,
    customer_type,
    name,
    phone: "+97150000" + String(Math.floor(Math.random() * 9000 + 1000)),
    whatsapp: "+97150000" + String(Math.floor(Math.random() * 9000 + 1000)),
    email,
    country_code,
    city,
    preferred_language: country_code === "DZ" ? "ar" : "en",
    notes: "Demo customer for cross-module testing.",
    created_by: actorId,
    updated_by: actorId,
  };
}

function lead(company_id, branch_id, actorId, customerRow, title, brand, model, budget, source, status, score) {
  return {
    company_id,
    branch_id,
    customer_id: customerRow.id,
    name: `${customerRow.name} - ${title}`,
    customer_type: customerRow.customer_type,
    phone: customerRow.phone,
    whatsapp: customerRow.whatsapp,
    email: `lead.${customerRow.email}`,
    country_code: customerRow.country_code,
    city: customerRow.city,
    preferred_brand: brand,
    preferred_model: model,
    budget,
    currency_code: "AED",
    language: customerRow.preferred_language,
    lead_source: source,
    assigned_salesperson_id: actorId,
    status,
    lead_score: score,
    last_contact_at: iso(-1),
    next_follow_up_at: iso(1),
    notes: "Demo lead with active pipeline data.",
    created_by: actorId,
    updated_by: actorId,
  };
}

async function seedFinance(companyId, branch, actorId, hilux, g63, customer, invoice, exportOrder, importOrder) {
  const paymentMethod = await ensure("payment_methods", { company_id: companyId, method_key: "demo-bank-transfer" }, {
    name: "Demo Bank Transfer",
    payment_method: "bank_transfer",
    active: true,
    sort_order: 1,
    created_by: actorId,
    updated_by: actorId,
  });
  const bank = await ensure("bank_accounts", { company_id: companyId, account_name: "Demo Emirates Operating Account" }, {
    branch_id: branch.id,
    bank_name: "Demo Emirates Bank",
    iban: "AE070331234567890123456",
    account_number: "DEMO-ACC-1001",
    currency_code: "AED",
    status: "active",
    notes: "Demo operating account.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("cash_accounts", { company_id: companyId, branch_id: branch.id, account_name: "Demo Showroom Cash" }, {
    currency_code: "AED",
    opening_balance: 25000,
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("expenses", { company_id: companyId, expense_number: "DEMO-EXPENSE-0001" }, {
    branch_id: branch.id,
    vehicle_id: hilux.id,
    export_order_id: exportOrder.id,
    import_order_id: null,
    category: "shipping",
    description: "Demo shipping and port handling expense.",
    amount: 8500,
    currency_code: "AED",
    expense_date: date(-1),
    supplier_name: "Demo Gulf Ocean Lines",
    payment_method_id: paymentMethod.id,
    bank_account_id: bank.id,
    status: "paid",
    notes: "Demo finance expense.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("receivables", { company_id: companyId, sales_invoice_id: invoice.id }, {
    branch_id: branch.id,
    customer_id: customer.id,
    vehicle_id: g63.id,
    receivable_number: "DEMO-AR-0001",
    description: "Demo outstanding balance for sales invoice.",
    amount: 834750,
    paid_amount: 500000,
    balance_due: 334750,
    currency_code: "AED",
    due_date: date(10),
    status: "partial",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("payables", { company_id: companyId, payable_number: "DEMO-AP-0001" }, {
    branch_id: branch.id,
    vehicle_id: hilux.id,
    export_order_id: exportOrder.id,
    import_order_id: importOrder.id,
    supplier_name: "Demo Antwerp Vehicle Source",
    description: "Demo supplier balance for imported stock.",
    amount: 120000,
    paid_amount: 50000,
    balance_due: 70000,
    currency_code: "AED",
    due_date: date(14),
    status: "partial",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("salesperson_commissions", { company_id: companyId, commission_number: "DEMO-COM-0001" }, {
    branch_id: branch.id,
    salesperson_id: actorId,
    sales_invoice_id: invoice.id,
    vehicle_id: g63.id,
    basis_amount: 795000,
    commission_rate: 1.25,
    commission_amount: 9937.5,
    currency_code: "AED",
    status: "approved",
    approved_by: actorId,
    approved_at: iso(0),
    notes: "Demo commission for sales workflow.",
    created_by: actorId,
    updated_by: actorId,
  });
}

async function seedMarketing(companyId, branch, actorId, vehicleRow, leadRow) {
  const channel = await ensure("listing_channels", { company_id: companyId, channel_key: "demo-website" }, {
    name: "Demo Website",
    channel_type: "website",
    base_url: "https://demo.autosphere.test/inventory",
    utm_source: "demo_website",
    active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const listing = await ensure("marketing_listings", { company_id: companyId, listing_number: "DEMO-LIST-0001" }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    channel_id: channel.id,
    title: "Toyota Hilux GR Sport 2025 - Export Ready",
    short_description: "GCC-ready pickup with export documents prepared.",
    full_description: "Demo listing for website, marketplace, social media, and lead source testing.",
    specifications: { brand: "Toyota", model: "Hilux", year: 2025, trim: "GR Sport", exportReady: true },
    price: 191000,
    currency_code: "AED",
    export_available: true,
    status: "active",
    external_url: "https://demo.autosphere.test/inventory/demo-hilux",
    lead_count: 4,
    published_at: iso(-1),
    created_by: actorId,
    updated_by: actorId,
  });
  const campaign = await ensure("campaigns", { company_id: companyId, campaign_number: "DEMO-CAMP-0001" }, {
    branch_id: branch.id,
    channel_id: channel.id,
    name: "Demo Ramadan Export Offers",
    objective: "lead_generation",
    status: "active",
    budget: 12000,
    spend: 3400,
    currency_code: "AED",
    start_date: date(-7),
    end_date: date(21),
    impressions: 24500,
    clicks: 920,
    leads: 38,
    conversions: 4,
    notes: "Demo campaign performance data.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("social_posts", { company_id: companyId, post_number: "DEMO-SOC-0001" }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    listing_id: listing.id,
    campaign_id: campaign.id,
    channel_id: channel.id,
    channel_type: "instagram",
    caption: "Toyota Hilux GR Sport 2025 available for GCC and export buyers.",
    hashtags: ["ToyotaHilux", "GCCCars", "ExportReady"],
    call_to_action: "Message us for CIF pricing.",
    script: "Short walkaround video script for the Hilux exterior and export documents.",
    media_notes: "Use front 3/4, interior, odometer, and VIN plate shots.",
    status: "scheduled",
    scheduled_at: iso(1),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("content_calendar", { company_id: companyId, title: "Demo Hilux Instagram reel", calendar_date: date(1) }, {
    branch_id: branch.id,
    listing_id: listing.id,
    campaign_id: campaign.id,
    start_time: "10:00",
    status: "scheduled",
    owner_profile_id: actorId,
    notes: "Demo social calendar item.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("lead_sources", { company_id: companyId, source_key: "demo-instagram" }, {
    name: "Demo Instagram",
    channel_type: "instagram",
    monthly_leads: 42,
    monthly_spend: 3100,
    monthly_conversions: 5,
    currency_code: "AED",
    active: true,
    notes: "Demo lead source analytics.",
    created_by: actorId,
    updated_by: actorId,
  });
  const marketplace = await ensure("marketplace_channels", { company_id: companyId, channel_key: "demo-dubizzle" }, {
    name: "Demo Dubizzle",
    provider: "manual",
    channel_type: "marketplace",
    base_url: "https://dubizzle.example.test",
    external_account_id: "demo-account",
    sync_enabled: true,
    settings: { mode: "sandbox", region: "AE" },
    active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("listing_price_overrides", { company_id: companyId, listing_id: listing.id, marketplace_channel_id: marketplace.id }, {
    branch_id: branch.id,
    override_price: 189500,
    currency_code: "AED",
    reason: "Marketplace launch discount",
    notes: "Demo channel-specific price.",
    starts_at: date(0),
    ends_at: date(14),
    active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const syncJob = await ensure("listing_sync_jobs", { company_id: companyId, listing_id: listing.id, marketplace_channel_id: marketplace.id, operation: "publish" }, {
    branch_id: branch.id,
    status: "completed",
    requested_payload: { listingNumber: "DEMO-LIST-0001", price: 189500 },
    external_reference: "DUB-DEMO-1001",
    completed_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("listing_sync_logs", { company_id: companyId, sync_job_id: syncJob.id, message: "Demo listing published to marketplace sandbox." }, {
    branch_id: branch.id,
    listing_id: listing.id,
    marketplace_channel_id: marketplace.id,
    severity: "info",
    provider_code: "200",
    external_reference: "DUB-DEMO-1001",
    payload: { status: "accepted" },
    created_by: actorId,
  });
  await ensure("marketplace_leads", { company_id: companyId, source_lead_id: "DEMO-MKT-LEAD-0001" }, {
    branch_id: branch.id,
    marketplace_channel_id: marketplace.id,
    listing_id: listing.id,
    vehicle_id: vehicleRow.id,
    lead_name: "Demo Marketplace Buyer",
    phone: "+971501234567",
    whatsapp: "+971501234567",
    email: "demo.marketplace.buyer@autosphere.test",
    country_code: "AE",
    city: "Dubai",
    message: "Is this Hilux available for export to Oman?",
    budget: 195000,
    currency_code: "AED",
    status: "new",
    captured_at: iso(-1),
    converted_lead_id: leadRow.id,
    raw_payload: { channel: "demo-dubizzle" },
    created_by: actorId,
    updated_by: actorId,
  });
  return { listing, channel, marketplace };
}

async function seedDocuments(companyId, branch, actorId, vehicleRow, customer, reservation, proforma, invoice) {
  const doc = await ensure("documents", { company_id: companyId, document_number: "DEMO-DOC-0001" }, {
    branch_id: branch.id,
    category: "vehicle_title",
    title: "Demo Vehicle Title",
    description: "Demo title document metadata.",
    file_name: "demo-title.pdf",
    mime_type: "application/pdf",
    file_size: 128000,
    storage_bucket: "documents",
    storage_path: `${companyId}/demo/demo-title.pdf`,
    status: "verified",
    expires_at: date(365),
    verified_by: actorId,
    verified_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("document_links", { company_id: companyId, document_id: doc.id, entity_type: "vehicle", entity_id: vehicleRow.id }, {
    created_by: actorId,
  });
  await ensure("signature_requests", { company_id: companyId, request_number: "DEMO-SIGN-0001" }, {
    branch_id: branch.id,
    document_id: doc.id,
    document_type: "reservation_agreement",
    related_entity_type: "reservation",
    related_entity_id: reservation.id,
    sent_to: customer.email,
    signer_name: customer.name,
    signer_email: customer.email,
    status: "sent",
    sent_at: iso(-1),
    created_by: actorId,
    updated_by: actorId,
  });
}

async function seedService(companyId, branch, actorId, vehicleRow, customer) {
  const tech = await ensure("technicians", { company_id: companyId, display_name: "Demo Senior Technician" }, {
    branch_id: branch.id,
    specialization: "4x4 inspection and preparation",
    phone: "+971500003333",
    hourly_rate: 180,
    currency_code: "AED",
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });
  const order = await ensure("service_orders", { company_id: companyId, order_number: "DEMO-SO-0001" }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    customer_id: customer.id,
    title: "Demo pre-delivery inspection",
    complaint: "Prepare vehicle for delivery and export photos.",
    odometer: 40,
    priority: "high",
    status: "in_progress",
    advisor_id: actorId,
    opened_at: iso(-1),
    due_at: iso(2),
    labor_total: 900,
    parts_total: 420,
    total_amount: 1320,
    currency_code: "AED",
    notes: "Demo workshop order.",
    created_by: actorId,
    updated_by: actorId,
  });
  const job = await ensure("service_jobs", { company_id: companyId, job_number: "DEMO-JOB-0001" }, {
    branch_id: branch.id,
    service_order_id: order.id,
    technician_id: tech.id,
    title: "Demo PDI inspection",
    description: "Full pre-delivery inspection and road test.",
    labor_type: "inspection",
    status: "assigned",
    estimated_hours: 3,
    actual_hours: 1.5,
    labor_rate: 180,
    labor_amount: 540,
    started_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("service_labor_lines", { company_id: companyId, line_number: "DEMO-LAB-0001" }, {
    branch_id: branch.id,
    service_order_id: order.id,
    service_job_id: job.id,
    technician_id: tech.id,
    labor_type: "inspection",
    description: "Demo inspection labor line.",
    hours: 3,
    hourly_rate: 180,
    amount: 540,
    performed_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  const checklist = await ensure("inspection_checklists", { company_id: companyId, name: "Demo Export Readiness Checklist" }, {
    branch_id: branch.id,
    checklist_type: "export_readiness",
    items: [
      { key: "vin", label: "VIN plate photographed" },
      { key: "title", label: "Title document verified" },
      { key: "fluid", label: "Fluid levels inspected" },
    ],
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("inspection_results", { company_id: companyId, result_number: "DEMO-INSP-0001" }, {
    branch_id: branch.id,
    service_order_id: order.id,
    checklist_id: checklist.id,
    vehicle_id: vehicleRow.id,
    technician_id: tech.id,
    overall_status: "attention",
    score_percent: 86,
    results: { vin: "pass", title: "attention", fluid: "pass" },
    notes: "Demo checklist result.",
    inspected_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("warranty_claims", { company_id: companyId, claim_number: "DEMO-WAR-0001" }, {
    branch_id: branch.id,
    service_order_id: order.id,
    vehicle_id: vehicleRow.id,
    customer_id: customer.id,
    provider_name: "Demo Warranty Provider",
    claim_amount: 2500,
    approved_amount: 1800,
    paid_amount: 0,
    currency_code: "AED",
    status: "approved",
    submitted_at: iso(-2),
    decided_at: iso(-1),
    notes: "Demo approved warranty claim.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("service_appointments", { company_id: companyId, appointment_number: "DEMO-APT-0001" }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    customer_id: customer.id,
    title: "Demo customer handover check",
    scheduled_start: iso(2),
    scheduled_end: iso(2.125),
    status: "scheduled",
    advisor_id: actorId,
    notes: "Demo service appointment.",
    created_by: actorId,
    updated_by: actorId,
  });
  return { order, job, tech };
}

async function seedParts(companyId, dxb, bru, actorId, serviceOrder, serviceJob) {
  const supplier = await ensure("part_suppliers", { company_id: companyId, supplier_name: "Demo Genuine Parts UAE" }, {
    country_code: "AE",
    contact_name: "Rami Saleh",
    email: "parts@genuine.demo",
    phone: "+971500004444",
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });
  const filter = await ensure("parts", { company_id: companyId, part_number: "DEMO-PART-FILTER-001" }, {
    sku: "DPF-001",
    name: "Demo oil filter kit",
    category: "Maintenance",
    brand: "Toyota",
    compatible_brands: ["Toyota", "Lexus"],
    compatible_models: ["Hilux", "Land Cruiser", "LX 600"],
    unit_cost: 85,
    selling_price: 145,
    currency_code: "AED",
    status: "active",
    reorder_point: 6,
    reorder_quantity: 24,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("part_stock", { company_id: companyId, branch_id: dxb.id, part_id: filter.id }, {
    quantity_on_hand: 12,
    quantity_reserved: 2,
    average_cost: 85,
    currency_code: "AED",
    bin_location: "A1-03",
    status: "in_stock",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("part_stock", { company_id: companyId, branch_id: bru.id, part_id: filter.id }, {
    quantity_on_hand: 3,
    quantity_reserved: 0,
    average_cost: 83,
    currency_code: "AED",
    bin_location: "B2-10",
    status: "low_stock",
    created_by: actorId,
    updated_by: actorId,
  });
  const po = await ensure("part_purchase_orders", { company_id: companyId, purchase_order_number: "DEMO-PO-0001" }, {
    branch_id: dxb.id,
    supplier_id: supplier.id,
    status: "ordered",
    order_date: date(-1),
    expected_date: date(5),
    subtotal: 2040,
    tax_amount: 102,
    total_amount: 2142,
    currency_code: "AED",
    notes: "Demo reorder PO.",
    created_by: actorId,
    updated_by: actorId,
  });
  const poItem = await ensure("part_purchase_order_items", { company_id: companyId, purchase_order_id: po.id, part_id: filter.id }, {
    description: "Demo oil filter kit",
    quantity_ordered: 24,
    quantity_received: 6,
    unit_cost: 85,
    line_total: 2040,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("part_receipts", { company_id: companyId, receipt_number: "DEMO-REC-0001" }, {
    branch_id: dxb.id,
    purchase_order_id: po.id,
    status: "posted",
    received_at: iso(0),
    posted_at: iso(0),
    notes: "Demo partial receipt.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("part_transfers", { company_id: companyId, transfer_number: "DEMO-TRF-0001" }, {
    part_id: filter.id,
    from_branch_id: dxb.id,
    to_branch_id: bru.id,
    quantity: 4,
    status: "in_transit",
    shipped_at: iso(0),
    notes: "Demo inter-branch transfer.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("service_parts_lines", { company_id: companyId, line_number: "DEMO-SPL-0001" }, {
    branch_id: dxb.id,
    service_order_id: serviceOrder.id,
    service_job_id: serviceJob.id,
    part_id: filter.id,
    description: "Demo oil filter used on service order.",
    quantity: 2,
    unit_cost: 85,
    selling_price: 145,
    line_cost: 170,
    line_total: 290,
    gross_profit: 120,
    status: "used",
    used_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("part_reorder_alerts", { company_id: companyId, alert_number: "DEMO-PART-ALERT-0001" }, {
    branch_id: bru.id,
    part_id: filter.id,
    current_quantity: 3,
    reorder_point: 6,
    status: "open",
    created_by: actorId,
    updated_by: actorId,
  });
}

async function seedDealDesk(companyId, branch, actorId, vehicleRow, customer, quotation, reservation, invoice) {
  const lender = await ensure("lenders", { company_id: companyId, name: "Demo Emirates Finance" }, {
    branch_id: branch.id,
    lender_type: "bank",
    country_code: "AE",
    contact_name: "Sara Finance",
    contact_email: "sara@finance.demo",
    contact_phone: "+971500005555",
    min_amount: 50000,
    max_amount: 900000,
    base_rate: 4.75,
    integration_status: "manual",
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const insurance = await ensure("insurance_products", { company_id: companyId, name: "Demo Comprehensive Insurance" }, {
    provider_name: "Demo Insurance Co",
    product_type: "insurance",
    premium_amount: 9500,
    cost_amount: 7400,
    commission_amount: 1200,
    currency_code: "AED",
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const warranty = await ensure("warranty_products", { company_id: companyId, name: "Demo 3 Year Export Warranty" }, {
    provider_name: "Demo Warranty Provider",
    coverage_months: 36,
    coverage_km: 100000,
    retail_amount: 12500,
    cost_amount: 7800,
    commission_amount: 1800,
    currency_code: "AED",
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  const deal = await ensure("deals", { company_id: companyId, deal_number: "DEMO-DEAL-0001" }, {
    branch_id: branch.id,
    quotation_id: quotation.id,
    reservation_id: reservation.id,
    sales_invoice_id: invoice.id,
    customer_id: customer.id,
    lead_id: quotation.lead_id,
    vehicle_id: vehicleRow.id,
    deal_type: "finance",
    status: "submitted",
    vehicle_price: 535000,
    product_total: 22000,
    down_payment: 100000,
    trade_in_value: 0,
    finance_amount: 457000,
    term_months: 60,
    annual_interest_rate: 4.75,
    monthly_payment: 8580,
    balloon_payment: 0,
    total_payable: 614800,
    currency_code: "AED",
    approval_status: "pending",
    notes: "Demo F&I deal for lender and products testing.",
    salesperson_id: actorId,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("deal_products", { company_id: companyId, deal_id: deal.id, name: "Demo Comprehensive Insurance" }, {
    insurance_product_id: insurance.id,
    warranty_product_id: null,
    product_type: "insurance",
    selling_price: 9500,
    cost_amount: 7400,
    gross_profit: 2100,
    taxable: true,
    status: "quoted",
    created_by: actorId,
  });
  await ensure("deal_products", { company_id: companyId, deal_id: deal.id, name: "Demo 3 Year Export Warranty" }, {
    insurance_product_id: null,
    warranty_product_id: warranty.id,
    product_type: "warranty",
    selling_price: 12500,
    cost_amount: 7800,
    gross_profit: 4700,
    taxable: true,
    status: "accepted",
    created_by: actorId,
  });
  const application = await ensure("finance_applications", { company_id: companyId, application_number: "DEMO-FIN-APP-0001" }, {
    branch_id: branch.id,
    deal_id: deal.id,
    lender_id: lender.id,
    applicant_name: customer.name,
    applicant_email: customer.email,
    applicant_phone: customer.phone,
    employment_status: "company_owner",
    annual_income: 720000,
    requested_amount: 457000,
    down_payment: 100000,
    term_months: 60,
    annual_interest_rate: 4.75,
    status: "submitted",
    risk_score: 78,
    notes: "Demo lender application.",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("lender_submissions", { company_id: companyId, submission_number: "DEMO-LEND-SUB-0001" }, {
    finance_application_id: application.id,
    lender_id: lender.id,
    status: "acknowledged",
    external_reference: "LEND-DEMO-221",
    request_payload: { requestedAmount: 457000 },
    response_payload: { decision: "under_review" },
    sent_at: iso(0),
    created_by: actorId,
  });
}

async function seedAccounting(companyId, branch, actorId, invoice, customer, vehicleRow) {
  const ar = await ensure("gl_accounts", { company_id: companyId, account_code: "DEMO-1100" }, {
    account_name: "Demo Accounts Receivable",
    account_type: "asset",
    normal_balance: "debit",
    currency_code: "AED",
    description: "Demo AR control account.",
    system_key: "demo_ar",
    is_system_account: false,
    created_by: actorId,
    updated_by: actorId,
  });
  const revenue = await ensure("gl_accounts", { company_id: companyId, account_code: "DEMO-4100" }, {
    account_name: "Demo Vehicle Sales Revenue",
    account_type: "revenue",
    normal_balance: "credit",
    currency_code: "AED",
    description: "Demo vehicle sales revenue account.",
    system_key: "demo_vehicle_sales",
    is_system_account: false,
    created_by: actorId,
    updated_by: actorId,
  });
  const period = await ensure("accounting_periods", { company_id: companyId, period_name: "Demo May 2026" }, {
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    status: "open",
    created_by: actorId,
    updated_by: actorId,
  });
  const journal = await ensure("journal_entries", { company_id: companyId, entry_number: "DEMO-JE-0001" }, {
    branch_id: branch.id,
    period_id: period.id,
    entry_date: date(0),
    source_type: "sales_invoice",
    source_record_id: invoice.id,
    memo: "Demo sales invoice posting.",
    status: "posted",
    currency_code: "AED",
    posted_at: iso(0),
    posted_by: actorId,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("journal_entry_lines", { company_id: companyId, journal_entry_id: journal.id, gl_account_id: ar.id, line_order: 1 }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    customer_id: customer.id,
    description: "Demo AR debit",
    debit_amount: 834750,
    credit_amount: 0,
    currency_code: "AED",
    created_by: actorId,
  });
  await ensure("journal_entry_lines", { company_id: companyId, journal_entry_id: journal.id, gl_account_id: revenue.id, line_order: 2 }, {
    branch_id: branch.id,
    vehicle_id: vehicleRow.id,
    customer_id: customer.id,
    description: "Demo sales revenue credit",
    debit_amount: 0,
    credit_amount: 834750,
    currency_code: "AED",
    created_by: actorId,
  });
}

async function seedOps(companyId, branch, actorId, vehicleRow, customer, exportOrder, listing) {
  const savedReport = await ensure("saved_reports", { company_id: companyId, report_number: "DEMO-REP-0001" }, {
    branch_id: branch.id,
    name: "Demo Inventory and Export Pipeline",
    report_type: "inventory",
    description: "Demo saved report for inventory and export testing.",
    filters: { branchId: branch.id, status: ["available", "ready_for_export"] },
    columns: ["stock_number", "brand", "model", "status", "selling_price"],
    is_shared: true,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("report_exports", { company_id: companyId, export_number: "DEMO-REX-0001" }, {
    branch_id: branch.id,
    saved_report_id: savedReport.id,
    report_type: "inventory",
    export_format: "csv",
    status: "completed",
    filters: { branchId: branch.id },
    result_summary: "Demo CSV export completed.",
    file_path: `${companyId}/demo/reports/inventory.csv`,
    requested_by: actorId,
    completed_at: iso(0),
  });
  await ensure("report_schedules", { company_id: companyId, schedule_number: "DEMO-RSCH-0001" }, {
    branch_id: branch.id,
    saved_report_id: savedReport.id,
    name: "Demo weekly sales digest",
    frequency: "weekly",
    day_of_week: 1,
    run_time: "09:00",
    timezone: "Asia/Dubai",
    recipients: ["manager@pollux.demo"],
    active: true,
    next_run_at: iso(4),
    created_by: actorId,
    updated_by: actorId,
  });
  const alert = await ensure("alerts", { company_id: companyId, alert_number: "DEMO-ALERT-0001" }, {
    branch_id: branch.id,
    alert_type: "export_documents_missing",
    title: "Demo export document needs verification",
    description: "Certificate of origin uploaded but final manager verification is pending.",
    priority: "high",
    status: "assigned",
    related_entity_type: "export_order",
    related_entity_id: exportOrder.id,
    due_at: iso(1),
    assigned_to: actorId,
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("tasks", { company_id: companyId, task_number: "DEMO-TASK-0001" }, {
    branch_id: branch.id,
    alert_id: alert.id,
    title: "Demo verify export documents",
    description: "Review certificate of origin and BL draft.",
    status: "in_progress",
    priority: "high",
    assigned_to: actorId,
    due_at: iso(1),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("reminders", { company_id: companyId, reminder_number: "DEMO-REM-0001" }, {
    branch_id: branch.id,
    title: "Demo follow up on deposit balance",
    description: "Call customer before vessel cutoff.",
    status: "pending",
    remind_at: iso(1),
    related_entity_type: "customer",
    related_entity_id: customer.id,
    assigned_to: actorId,
    created_by: actorId,
    updated_by: actorId,
  });
  const thread = await ensure("chat_threads", { company_id: companyId, thread_number: "DEMO-CHAT-0001" }, {
    branch_id: branch.id,
    thread_type: "vehicle",
    title: "Demo Hilux export readiness",
    related_entity_type: "vehicle",
    related_entity_id: vehicleRow.id,
    last_message_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("chat_participants", { company_id: companyId, thread_id: thread.id, profile_id: actorId }, {
    last_read_at: iso(0),
  });
  await ensure("chat_messages", { company_id: companyId, message_number: "DEMO-MSG-0001" }, {
    branch_id: branch.id,
    thread_id: thread.id,
    message_type: "text",
    body: "Demo chat message: export documents are ready for manager review.",
    payload: { listingId: listing.id },
    created_by: actorId,
  });
}

async function seedAi(companyId, branch, actorId, vehicleRow, listing) {
  const convo = await ensure("ai_conversations", { company_id: companyId, title: "Demo AI stock and export assistant" }, {
    branch_id: branch.id,
    status: "open",
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("ai_messages", { company_id: companyId, conversation_id: convo.id, role: "user", content: "Which cars are ready for export to Algeria?" }, {
    payload: { demo: true },
    created_by: actorId,
  });
  await ensure("ai_messages", { company_id: companyId, conversation_id: convo.id, role: "assistant", content: "The demo Hilux is available and has an active Algeria export order." }, {
    payload: { metricCards: [{ label: "Ready for export", value: 1 }] },
    created_by: actorId,
  });
  const request = await ensure("ai_requests", { company_id: companyId, request_number: "DEMO-AI-REQ-0001" }, {
    branch_id: branch.id,
    conversation_id: convo.id,
    prompt: "Generate a pricing and export readiness summary for the demo Hilux.",
    response: "Demo AI summary generated with pricing, missing documents, and suggested actions.",
    answer_payload: { vehicleId: vehicleRow.id, recommendedAction: "Verify export certificate" },
    provider: "gemini",
    model: "gemini-3.1-flash-lite",
    status: "completed",
    created_by: actorId,
    updated_by: actorId,
  });
  const action = await ensure("ai_actions", { company_id: companyId, action_number: "DEMO-AI-ACT-0001" }, {
    branch_id: branch.id,
    conversation_id: convo.id,
    request_id: request.id,
    tool_name: "generateSocialPostDraft",
    action_type: "tool_call",
    status: "approval_required",
    sensitive: true,
    requires_approval: true,
    input_payload: { listingId: listing.id },
    output_payload: { caption: "Demo Hilux export offer draft" },
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("ai_approvals", { company_id: companyId, approval_number: "DEMO-AI-APR-0001" }, {
    branch_id: branch.id,
    action_id: action.id,
    request_id: request.id,
    title: "Approve demo social post draft",
    status: "pending",
    requested_by: actorId,
    expires_at: iso(3),
    payload: { actionNumber: "DEMO-AI-ACT-0001" },
  });
  await ensure("ai_automation_agents", { company_id: companyId, agent_type: "vehicle_marketing", branch_id: branch.id }, {
    is_enabled: true,
    status: "idle",
    config: { cadence: "daily", approvalRequired: true },
    last_scan_at: iso(0),
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("ai_document_extractions", { company_id: companyId, file_path: `${companyId}/demo/ocr/demo-title.jpg` }, {
    branch_id: branch.id,
    file_name: "demo-title.jpg",
    file_type: "image/jpeg",
    document_type: "vehicle_title",
    status: "completed",
    extracted_data: { vin: vehicleRow.vin, brand: vehicleRow.brand, model: vehicleRow.model, year: vehicleRow.year },
    raw_text: `VIN ${vehicleRow.vin} ${vehicleRow.brand} ${vehicleRow.model}`,
    created_by: actorId,
    updated_by: actorId,
  });
}

async function seedBilling(companyId, actorId) {
  await ensure("billing_customers", { company_id: companyId, provider: "stripe" }, {
    provider_customer_id: `cus_demo_${companyId.slice(0, 8)}`,
    billing_email: TARGET_EMAIL,
    billing_name: "Pollux Motors IT",
    status: "active",
    default_currency_code: "USD",
    metadata: { demo: true, package: "enterprise_dealer_group" },
    created_by: actorId,
    updated_by: actorId,
  });
  await ensure("billing_events", { provider: "stripe", provider_event_id: `evt_demo_${companyId.slice(0, 8)}` }, {
    company_id: companyId,
    event_type: "customer.subscription.updated",
    event_status: "processed",
    payload: { demo: true },
    processed_at: iso(0),
  });
  await ensure("usage_counters", { company_id: companyId, metric_key: "vehicles", period_start: "2026-05-01", period_end: "2026-05-31" }, {
    current_value: 8,
    limit_value: 500,
    source_table: "vehicles",
  });
  await ensure("usage_limit_events", { company_id: companyId, metric_key: "ai_requests", message: "Demo AI usage is below the package limit." }, {
    event_type: "resolved",
    current_value: 42,
    limit_value: 5000,
    entity_type: "company",
    entity_id: companyId,
    created_by: actorId,
    resolved_at: iso(0),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
