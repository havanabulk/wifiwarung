# PRD — Warung28 Hotspot

| | |
|---|---|
| **Produk** | Warung28 — Sistem penjualan voucher/paket hotspot WiFi berbasis wallet |
| **Versi dokumen** | 1.0 (draft awal) |
| **Tanggal** | 24 Agustus 2026 |
| **Status** | Draft untuk review pemilik produk |
| **Sumber** | Audit kodebase existing + wawancara kebutuhan bisnis (mengikuti) |

---

## 1. Ringkasan Produk

Warung28 adalah platform penjualan paket internet hotspot untuk usaha WiFi warungan (RT/RW net, hotspot desa, warnet mini). Pelanggan membeli akses WiFi per jam/malam/hari/minggu/bulan atau per kuota menggunakan **saldo wallet** yang diisi tunai melalui admin. Sistem terdiri dari:

1. **Situs publik** — katalog paket, informasi usaha, form bantuan.
2. **Portal pelanggan** — login, cek saldo, riwayat pembelian, beli paket.
3. **Panel admin** — kelola pelanggan, deposit saldo, CRUD paket, tiket bantuan, integrasi router MikroTik untuk aktivasi akun hotspot secara otomatis.

## 2. Latar Belakang & Masalah

Kondisi saat ini (bisnis manual):
- Admin mencatat pembelian paket dan deposit pelanggan di buku/catatan HP → rawan salah hitung dan tidak ada riwayat yang bisa diaudit.
- Aktivasi akun hotspot dilakukan manual lewat Winbox/AdminMikroTik satu per satu → lambat saat ramai.
- Pelanggan tidak bisa mengecek sisa kuota/saldo/kadaluarsa tanpa bertanya ke admin.

Peluang: satu sistem terpusat yang menghubungkan **wallet pelanggan ↔ katalog paket ↔ router MikroTik**, sehingga aktivasi jadi otomatis, pencatatan otomatis, dan pelanggan mandiri.

## 3. Sasaran & Metrik Keberhasilan

| Sasaran | Metrik | Target (6 bulan pasca-rilis) |
|---|---|---|
| Kurangi kerja manual admin | % aktivasi paket yang otomatis via sistem | ≥ 90% |
| Akurasi keuangan | Selisih rekonsiliasi kas vs `wallet_transactions` per bulan | Rp 0 |
| Adopsi pelanggan | % transaksi harian lewat portal (bukan minta admin) | ≥ 60% |
| Kecepatan layanan | Waktu dari "beli" hingga akun hotspot aktif | < 30 detik |

## 4. Persona

### P1 — Admin/Pemilik Warung
Pemilik usaha, melek teknologi tingkat menengah, mengelola 50–500 pelanggan. Kebutuhan: input deposit tunai cepat, lihat siapa saja pelanggan aktif/expired, kelola harga paket, balas pertanyaan pelanggan.

### P2 — Pelanggan Langganan
Warga sekitar, mayoritas akses via HP, sering top-up tunai. Kebutuhan: tahu sisa saldo & masa aktif, beli ulang paket kapan pun tanpa nunggu admin, terima bukti pembelian.

### P3 — Calon Pelanggan
Melihat brosur/QR code di warung, ingin tahu harga & cara daftar sebelum bayar. Kebutuhan: halaman katalog yang jelas di HP, cara hubungi admin.

## 5. Ruang Lingkup (Prioritas MoSCoW)

### Must have (M1 — stabilisasi & rilis inti)
Semua yang sudah dibangun, difinalisasi + celah keamanan ditutup:
1. Auth (login username/email, logout, proteksi sesi)
2. Wallet & deposit oleh admin (atomic, tervalidasi)
3. CRUD paket (hourly, night, daily, weekly, monthly, quota)
4. Daftar pelanggan + status langganan
5. Tiket bantuan (support messages)
6. Situs publik (katalog, FAQ, kontak, legal)

### Should have (M2 — nilai bisnis utama)
7. **Pembelian paket via saldo** — potong wallet, buat order, aktifkan akun hotspot di MikroTik otomatis (API MikroTik server-side)
8. **Riwayat transaksi pelanggan** — ledger deposit & pembelian di portal pelanggan
9. **Voucher** — generate kode voucher (durasi/kuota), redeem di portal atau captive portal
10. Logout UI + notifikasi status akun (aktif/dinonaktifkan)

### Could have (M3 — pertumbuhan)
11. Top-up mandiri via QRIS/payment gateway dengan verifikasi otomatis
12. Notifikasi WhatsApp (kadaluarsa mendekat, bukti transaksi) via API WA bisnis
13. Dashboard statistik real (pendapatan harian/bulanan, pelanggan aktif, pemakaian per paket)
14. Multi-router / multi-lokasi

### Won't have (v1)
Billing postpaid/langganan bulanan auto-debet, aplikasi mobile native, marketplace voucher eksternal.

## 6. Fitur Detail & Acceptance Criteria

### F1 — Autentikasi & Sesi
- Login dengan username ATAU email; password Supabase Auth.
- AC:
  - [ ] Setelah login, admin diarahkan ke `/admin`, pelanggan ke `/dashboard`.
  - [ ] Semua halaman `/admin/**` dan `/api/admin/**` ditolak (redirect/401) untuk tamu & non-admin — diverifikasi server-side pada **setiap** entry point (layout + tiap route handler), proxy hanya lapisan optimis.
  - [ ] Akun `status ≠ 'active'` tidak dapat login DAN sesi aktifnya ditolak di dashboard/admin (re-check per request).
  - [ ] Tersedia tombol logout di portal pelanggan & sidebar admin.
  - [ ] Tidak ada endpoint mutasi yang bisa dipanggil tanpa sesi valid.

### F2 — Wallet & Deposit
- Saldo hanya berubah melalui fungsi database atomik (RPC), tidak pernah read-modify-write dari aplikasi.
- AC:
  - [ ] Deposit oleh admin: nominal bilangan bulat rupiah ≥ Rp 1.000, dicatat sebagai `wallet_transactions` dalam transaksi DB yang sama dengan perubahan saldo.
  - [ ] Gagal di tengah proses = tidak ada perubahan saldo maupun catatan transaksi.
  - [ ] Riwayat deposit tampil di portal pelanggan bersangkutan.
  - [ ] (M2) Pembelian paket memotong saldo dengan mekanisme atomic yang sama; saldo kurang = transaksi ditolak dengan pesan jelas.

### F3 — Katalog Paket
- Tipe: hourly, night (jam mulai–selesai), daily, weekly, monthly, quota.
- AC:
  - [ ] Paket aktif tampil di situs publik tanpa login.
  - [ ] Harga bilangan bulat rupiah ≥ 0; durasi/kuota > 0 jika diisi.
  - [ ] Nonaktif = hilang dari katalog publik, tetap ada datanya.
  - [ ] Perubahan harga tidak mengubah order yang sudah ada (harga disalin ke order saat pembelian).

### F4 — Pembelian & Aktivasi Hotspot (M2)
- AC:
  - [ ] Pelanggan pilih paket → konfirmasi → saldo dipotong → order dibuat (`status=pending` → `active`).
  - [ ] Sistem membuat/mengaktifkan user hotspot di MikroTik (username/password/profile sesuai paket, batas waktu & kuota sesuai tipe paket) via API server-side dengan kredensial router di environment variable server-only.
  - [ ] Jika MikroTik gagal dijangkau: order masuk antrean retry, saldo TIDAK dipotong sebelum aktivitas sukses (atau direfund otomatis), admin melihat daftar gagal aktivasi.
  - [ ] Portal pelanggan menampilkan paket aktif: nama, sisa waktu/kuota, tanggal kadaluarsa.

### F5 — Voucher (M2)
- AC:
  - [ ] Admin generate batch voucher (jumlah, tipe, nilai) → kode unik.
  - [ ] Redeem voucher menambah durasi/kuota/saldo sesuai jenis voucher, sekali pakai, kedaluwarsa bisa diatur.

### F6 — Bantuan (Support)
- AC:
  - [ ] Form publik: nama, WA (opsional), pesan; rate-limited; validasi panjang.
  - [ ] Kotak masuk admin: baca, ubah status (baru/diproses/selesai).
  - [ ] Data pribadi pelanggan hanya bisa dibaca admin (dijamin RLS, bukan cuma UI).

### F7 — Panel Admin
- AC:
  - [ ] Statistik dashboard menampilkan data nyata (pelanggan aktif, pendapatan hari ini, transaksi terakhir) — bukan placeholder.
  - [ ] Menu yang halamannya belum ada disembunyikan atau dinonaktifkan (tidak boleh 404).

## 7. Persyaratan Non-Fungsional

### Keamanan (wajib sebelum rilis M2)
1. RLS aktif di semua tabel; pola akses: pemilik baris sendiri + admin via helper `is_admin()`. Insert publik hanya untuk `support_messages`. Tabel uang (`wallets`, `wallet_transactions`) tidak punya policy insert/update untuk user biasa — hanya lewat RPC SECURITY DEFINER.
2. Semua operasi uang atomic di level database (fungsi SQL), bukan logika aplikasi.
3. Verifikasi auth+role server-side di setiap route handler & server component sensitif; proxy.ts hanya optimis.
4. Kredensial MikroTik & service key HANYA di env non-publik server (`SUPABASE_SERVICE_ROLE_KEY`, `MIKROTIK_HOST`, dst.) — tidak pernah berawalan `NEXT_PUBLIC_`.
5. Error ke client selalu generik; detail error hanya di server log.
6. Rate limit endpoint publik (support, login).
7. Dependency dipin versi tetap (bukan "latest"); audit dependensi berkala.

### Kinerja
- Halaman publik interaktif < 3 detik di jaringan 3G/H+ (target pengguna HP di area warung).
- Query list admin dipaginasi (customers, transactions, support inbox).

### Keandalan
- Transaksi uang: idempoten di sisi client (double-submit dicegah), konsisten di sisi DB.
- Integrasi MikroTik toleran gangguan: retry + antrean + status yang terlihat admin.

### Privasi & Kepatuhan
- Data yang dikumpulkan minimal: nama, username, WA opsional, riwayat transaksi.
- Halaman kebijakan privasi/syarat/refund sudah ada — isi harus disesuaikan dengan alur pembelian aktual sebelum M2 rilis.

## 8. Model Data

### Existing (sudah dipakai kode)
```
profiles(id, username, full_name, phone, role, status, created_at)
wallets(id, user_id, balance, updated_at)            -- unique(user_id)
wallet_transactions(id?, user_id, type, amount, note, created_at?)
packages(id, name, type, duration_minutes, quota_mb, speed_down_mbps,
         speed_up_mbps, price, start_time, end_time, active, created_at?)
package_orders(id, user_id?, package_id, price, status, start_at, end_at, created_at)
support_messages(id?, name, phone, message, status, created_at?)
```

### Usulan tambahan (M2)
```
purchases          -- pembelian via wallet: id, user_id, package_id, price(salinan),
                   -- payment_type('wallet'|'voucher'), ref_transaction_id, mikrotik_status
                   -- ('pending'|'active'|'failed'), retries, created_at
vouchers           -- id, code(unique), type('duration'|'quota'|'balance'), value,
                   -- batch_id, redeemed_by, redeemed_at, expires_at, active
voucher_batches    -- id, label, count, type, created_by, created_at
mikrotik_users     -- mapping user hotspot: username, router_id, profile_name, last_sync
routers            -- id, name, host, port, api_user(env-ref), location, active
settings           -- key/value: jam operasional, wa admin, dsb.
audit_log          -- siapa melakukan apa pada data uang/paket (actor, action, target, meta)
```
Catatan: `package_orders` existing dipertahankan sebagai sumber status langganan; `purchases` fokus pada aspek pembayaran & aktivasi agar tanggung jawab tabel tidak campur.

## 9. Backlog Teknis (Hasil Audit — urut prioritas)

| # | Item | Prioritas | Effort |
|---|------|-----------|--------|
| 1 | Commit file security yang masih untracked: `proxy.ts`, `lib/auth/`, `supabase/migrations/*`, 4 route admin termodifikasi — deploy dari git saat ini TIDAK membawa proteksi apapun | 🔴 Blokir rilis | 5 menit |
| 2 | Jalankan migrasi SQL di Supabase: `admin_deposit` RPC + hardening RLS | 🔴 Blokir rilis | 15 menit |
| 3 | `/admin/support`: hapus client anonim, jadikan server component + guard admin (pola `/admin`) — saat ini halaman PII bisa render publik | 🔴 Blokir rilis | Kecil |
| 4 | Guard server-side di `app/admin/layout.tsx` (sekali untuk semua halaman admin) + re-check `status='active'` | 🔴 Tinggi | Kecil |
| 5 | Tombol logout di sidebar admin & dashboard | 🔴 Tinggi | Kecil |
| 6 | Deposit: paksa bilangan bulat + minimum di RPC (bukan cuma client); PUT packages parity dengan POST (validasi harga/type) | 🟠 Tinggi | Kecil |
| 7 | Hapus file mati: `page.tsx` root, `about/` root, `warung.zip`, `warung-28.zip` (git rm --cached + gitignore `*.zip`), `app/admin/packages/PackagesManager.tsx` (duplikat 856 baris tak terpakai) | 🟠 Tinggi | Kecil |
| 8 | Sidebar admin: sembunyikan menu tanpa halaman (vouchers, transactions, topup, mikrotik, ai, settings) sampai fiturnya ada | 🟠 Sedang | Kecil |
| 9 | Statistik dashboard admin: ganti placeholder dengan data nyata (query agregat) | 🟠 Sedang | Sedang |
| 10 | Error response generik + buang console.log payload; rate limit `/api/support`; pin dependency versi tetap | 🟠 Sedang | Sedang |
| 11 | Workflow GitHub Actions: blok `permissions:` minimal, pin action by SHA, tambah `concurrency:` | 🟡 Sedang | Kecil |
| 12 | AbortController + cleanup fetch client; per-item disable pada toggle paket; cek `result.success` di handleDeposit | 🟡 Rendah | Kecil |

## 10. Di Luar Lingkup v1
- Aplikasi mobile native (portal web mobile-first cukup).
- Pembayaran kartu kredit/e-wallet selain QRIS.
- Manajemen bandwidth per-user granular dari web (tetap lewat profile MikroTik).
- Multi-tenant SaaS untuk warung lain.

## 11. Roadmap Indicatif

| Milestone | Isi | Kriteria selesai |
|---|---|---|
| **M0 — Hardening** (minggu 1) | Backlog #1–#7 + migrasi RLS dijalankan | Penetration-check mandiri: tamu/non-admin tidak bisa baca data apa pun; deploy dari clone bersih berfungsi penuh |
| **M1 — Inti stabil** (minggu 2–3) | #4–#12, statistik nyata, polish UX admin | Semua AC F1–F3, F7 lulus; zero error lint/tsc |
| **M2 — Monetisasi** (minggu 4–7) | F4 pembelian+MikroTik, F5 voucher, riwayat transaksi, notifikasi status | End-to-end: beli paket via saldo → akun hotspot aktif < 30 detik; rekonsiliasi kas nol selisih 2 minggu berturut |
| **M3 — Pertumbuhan** (Q4 2026) | QRIS top-up, notifikasi WA, multi-router | — |

## 12. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| RLS salah konfigurasi → bocor data uang/PII | Fatal | Migrasi RLS wajib dijalankan + uji dengan 3 akun (anon, customer, admin) sebelum rilis |
| Router MikroTik offline saat pembelian | Pelanggan bayar tapi tidak aktif | Status `pending` + refund/retry otomatis + antrean gagal terlihat admin |
| Duplikat/dead code membingungkan developer berikutnya | Bug regresi (contoh: edit night package lewat file duplikat menghapus jam malam) | Bersihkan backlog #7, satu sumber kebenaran per komponen |
| Dependency "latest" merusak build mendadak | Downtime | Pin versi + lockfile, upgrade terjadwal |
| Single admin (bus factor) | Operasi berhenti | Role tetap tunggal di v1; dokumentasikan prosedur recovery akun admin |

## 13. Pertanyaan Terbuka (untuk pemilik produk)
1. Apakah pembelian paket juga perlu bisa dari captive portal MikroTik (tanpa login portal web), atau portal web saja?
2. Refund pembelian salah beli: manual oleh admin (v1) atau otomatis?
3. Voucher dicetak fisik (kartu) atau cukup kode digital via WA?
4. Berapa banyak lokasi/router yang direncanakan dalam 12 bulan? (menentukan desain tabel routers sekarang)
