import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      user_id,
      amount,
      note,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        {
          error: "User ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    const depositAmount = Number(amount);

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Jumlah deposit tidak valid.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    /*
     * Pastikan pelanggan benar-benar ada
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "Pelanggan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    /*
     * Cari wallet pelanggan
     */
    const {
      data: wallet,
      error: walletError,
    } = await supabase
      .from("wallets")
      .select("id, user_id, balance")
      .eq("user_id", user_id)
      .maybeSingle();

    if (walletError) {
      console.error(
        "WALLET GET ERROR:",
        walletError
      );

      return NextResponse.json(
        {
          error: walletError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Jika wallet belum ada,
     * buat wallet baru.
     */
    if (!wallet) {
      const {
        data: newWallet,
        error: createWalletError,
      } = await supabase
        .from("wallets")
        .insert({
          user_id,
          balance: depositAmount,
        })
        .select()
        .single();

      if (createWalletError) {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        return NextResponse.json(
          {
            error:
              createWalletError.message,
          },
          { status: 500 }
        );
      }

      /*
       * Catat transaksi deposit
       */
      const {
        error: transactionError,
      } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id,
          type: "deposit",
          amount: depositAmount,
          note:
            note?.trim() ||
            "Deposit oleh admin",
        });

      if (transactionError) {
        console.error(
          "TRANSACTION ERROR:",
          transactionError
        );

        return NextResponse.json(
          {
            error:
              transactionError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message:
            "Deposit berhasil.",
          wallet: newWallet,
        },
        { status: 201 }
      );
    }

    /*
     * Wallet sudah ada
     */
    const currentBalance =
      Number(wallet.balance) || 0;

    const newBalance =
      currentBalance + depositAmount;

    const {
      data: updatedWallet,
      error: updateError,
    } = await supabase
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "UPDATE WALLET ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Catat transaksi
     */
    const {
      error: transactionError,
    } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id,
        type: "deposit",
        amount: depositAmount,
        note:
          note?.trim() ||
          "Deposit oleh admin",
      });

    if (transactionError) {
      console.error(
        "TRANSACTION INSERT ERROR:",
        transactionError
      );

      return NextResponse.json(
        {
          error:
            transactionError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Deposit berhasil.",
        wallet: updatedWallet,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "DEPOSIT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}