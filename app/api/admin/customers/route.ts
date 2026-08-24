import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const rawPage = Number(searchParams.get("page"));
    const rawPageSize = Number(searchParams.get("pageSize"));

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

    const pageSize =
      Number.isInteger(rawPageSize) && rawPageSize > 0
        ? Math.min(rawPageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const supabase = await createClient();

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const [customersRes, activeCountRes, walletRowsRes, orderRowsRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
          id,
          username,
          full_name,
          phone,
          role,
          status,
          created_at,
          wallets (
            id,
            balance,
            updated_at
          ),
          package_orders (
            id,
            package_id,
            price,
            status,
            start_at,
            end_at,
            created_at,
            packages (
              id,
              name,
              type
            )
          )
        `,
          )
          .order("created_at", {
            ascending: false,
          })
          .range(rangeFrom, rangeTo),
        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          })
          .neq("role", "admin")
          .eq("status", "active"),
        supabase.from("wallets").select("balance"),
        supabase.from("package_orders").select("user_id, status, end_at"),
      ]);

    if (customersRes.error) {
      console.error("CUSTOMERS GET ERROR:", customersRes.error);

      return NextResponse.json(
        {
          error: "Gagal mengambil data pelanggan.",
        },
        { status: 500 },
      );
    }

    if (walletRowsRes.error) {
      console.error("CUSTOMER WALLETS GET ERROR:", walletRowsRes.error);
    }

    if (orderRowsRes.error) {
      console.error("CUSTOMER ORDERS GET ERROR:", orderRowsRes.error);
    }

    const now = Date.now();

    const activePackageUsers = new Set<string>();

    for (const row of orderRowsRes.data ?? []) {
      if (
        row.status === "active" &&
        (!row.end_at || new Date(row.end_at).getTime() > now)
      ) {
        activePackageUsers.add(row.user_id);
      }
    }

    const totalBalance = (walletRowsRes.data ?? []).reduce(
      (total, wallet) => total + Number(wallet.balance ?? 0),
      0,
    );

    return NextResponse.json({
      customers: customersRes.data ?? [],
      summary: {
        totalCustomers: customersRes.count ?? 0,
        activeCustomers: activeCountRes.count ?? 0,
        activePackages: activePackageUsers.size,
        totalBalance,
      },
      pagination: {
        page,
        pageSize,
        total: customersRes.count ?? 0,
      },
    });
  } catch (error) {
    console.error("CUSTOMERS API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
