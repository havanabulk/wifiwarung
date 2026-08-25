const USERNAME_PATTERN = /^[a-z0-9._]+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "kasir",
  "root",
  "support",
  "operator",
]);

const MAX_FULL_NAME_LENGTH = 100;

const MAX_PHONE_LENGTH = 20;

const PHONE_PATTERN = /^[0-9+\-()\s]*$/;

export const MIN_PASSWORD_LENGTH = 6;

export const MAX_PASSWORD_LENGTH = 72;

export type CustomerInputData = {
  username: string;
  email: string;
  password: string;
  fullName: string | null;
  phone: string | null;
};

export type ParseCustomerResult =
  { ok: true; data: CustomerInputData } | { ok: false; error: string };

export const CUSTOMER_EMAIL_DOMAIN = "warung28.my.id";

export function parseCustomerInput(body: unknown): ParseCustomerResult {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      error: "Data pelanggan tidak valid.",
    };
  }

  const b = body as Record<string, unknown>;

  const { username, password } = b;

  if (typeof username !== "string" || username.trim() === "") {
    return {
      ok: false,
      error: "Username wajib diisi.",
    };
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return {
      ok: false,
      error: "Username harus 3-30 karakter.",
    };
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return {
      ok: false,
      error: "Username hanya boleh huruf kecil, angka, titik, dan underscore.",
    };
  }

  if (normalizedUsername.startsWith(".") || normalizedUsername.endsWith(".")) {
    return {
      ok: false,
      error: "Username tidak boleh diawali/diakhiri titik.",
    };
  }

  if (RESERVED_USERNAMES.has(normalizedUsername)) {
    return {
      ok: false,
      error: "Username tersebut tidak boleh digunakan.",
    };
  }

  if (typeof password !== "string" || password.length === 0) {
    return {
      ok: false,
      error: "Password awal wajib diisi.",
    };
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      ok: false,
      error: `Password harus ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter.`,
    };
  }

  let fullName: string | null = null;

  if (
    b.fullName !== null &&
    b.fullName !== undefined &&
    String(b.fullName).trim() !== ""
  ) {
    if (typeof b.fullName !== "string") {
      return {
        ok: false,
        error: "Nama lengkap tidak valid.",
      };
    }

    fullName = b.fullName.trim();

    if (fullName.length > MAX_FULL_NAME_LENGTH) {
      return {
        ok: false,
        error: `Nama lengkap maksimal ${MAX_FULL_NAME_LENGTH} karakter.`,
      };
    }
  }

  let phone: string | null = null;

  if (
    b.phone !== null &&
    b.phone !== undefined &&
    String(b.phone).trim() !== ""
  ) {
    if (typeof b.phone !== "string") {
      return {
        ok: false,
        error: "Nomor WhatsApp tidak valid.",
      };
    }

    phone = b.phone.trim();

    if (phone.length > MAX_PHONE_LENGTH || !PHONE_PATTERN.test(phone)) {
      return {
        ok: false,
        error: "Nomor WhatsApp tidak valid.",
      };
    }
  }

  return {
    ok: true,
    data: {
      username: normalizedUsername,
      email: `${normalizedUsername}@${CUSTOMER_EMAIL_DOMAIN}`,
      password,
      fullName,
      phone,
    },
  };
}
