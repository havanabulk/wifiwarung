import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type CustomersSummary = {
  activeCustomers?: number | string;
  activePackages?: number | string;
  totalBalance?: number | string;
};

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

    const [customersRes, summaryRes] = await Promise.all([
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
          {
            count: "exact",
          },
        )
        .neq("role", "admin")
        .order("created_at", {
          ascending: false,
        })
        .range(rangeFrom, rangeTo),
      supabase.rpc("admin_customers_summary"),
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

    if (summaryRes.error) {
      console.error("CUSTOMERS SUMMARY RPC ERROR:", summaryRes.error);
    }

    const summary = (summaryRes.data ?? {}) as CustomersSummary;

    return NextResponse.json({
      customers: customersRes.data ?? [],
      summary: {
        totalCustomers: customersRes.count ?? 0,
        activeCustomers: Number(summary.activeCustomers ?? 0),
        activePackages: Number(summary.activePackages ?? 0),
        totalBalance: Number(summary.totalBalance ?? 0),
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
