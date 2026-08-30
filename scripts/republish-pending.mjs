// Republish event order.fulfilled ke n8n untuk package_orders yang masih
// menunggu voucher MikroTik (mikrotik_status = 'pending' dan belum ada
// mikrotik_vouchers). Dipakai sekali/dua kali setelah n8n aktif untuk
// memproses order lama (mis. order 4-6).
//
// Jalankan dari root repo:
//   node scripts/republish-pending.mjs
//
// Membaca .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// N8N_ORDER_FULFILLED_URL, N8N_WEBHOOK_TOKEN).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnvFile() {
  const file = path.join(root, ".env.local");
  const raw = fs.readFileSync(file, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");

    if (idx === -1) continue;

    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }

  return env;
}

const env = loadEnvFile();

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const n8nUrl = env.N8N_ORDER_FULFILLED_URL;
const n8nToken = env.N8N_WEBHOOK_TOKEN || "";

// Opsional: republish hanya satu order, mis. node scripts/republish-pending.mjs 4
const onlyOrderId = process.argv[2] ? String(process.argv[2]).trim() : null;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!n8nUrl) {
  console.error(
    "N8N_ORDER_FULFILLED_URL belum diset di .env.local — tidak ada tujuan pengiriman.",
  );
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: orders, error } = await service
  .from("package_orders")
  .select(
    `
      id,
      user_id,
      ref_key,
      price,
      start_at,
      end_at,
      mikrotik_status,
      packages ( id, name ),
      profiles ( full_name, phone, device_mac ),
      mikrotik_vouchers ( id )
    `,
  )
  .eq("mikrotik_status", "pending");

if (error) {
  console.error("Gagal membaca package_orders:", error.message);
  process.exit(1);
}

const pending = (orders ?? []).filter(
  (o) =>
    (!o.mikrotik_vouchers || o.mikrotik_vouchers.length === 0) &&
    (!onlyOrderId || String(o.id) === onlyOrderId),
);

console.log(
  `Total pending=${(orders ?? []).length}, tanpa voucher=${pending.length}`,
);

for (const order of pending) {
  const payload = {
    event: "order.fulfilled",
    merchant_ref: order.ref_key ?? `PO-${order.id}`,
    package_order_id: order.id,
    user_id: order.user_id,
    package: {
      id: order.packages?.id ?? 0,
      name: order.packages?.name ?? "Paket",
      price: order.price ?? 0,
    },
    customer: {
      name: order.profiles?.full_name ?? null,
      phone: order.profiles?.phone ?? null,
      email: null,
      device_mac: order.profiles?.device_mac ?? null,
    },
    transaction: {
      amount_received: order.price ?? 0,
      paid_at: order.start_at,
      payment_type: "wallet",
    },
    source: "republish",
  };

  const res = await fetch(n8nUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(n8nToken ? { Authorization: `Bearer ${n8nToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  console.log(
    `${order.id} (${order.ref_key ?? "-"}) -> ${res.status} ${res.ok ? "OK" : (await res.text()).slice(0, 200)}`,
  );
}
