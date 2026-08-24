const VALID_TYPES = [
  "hourly",
  "night",
  "daily",
  "weekly",
  "monthly",
  "quota",
] as const;

export type PackageType =
  (typeof VALID_TYPES)[number];

export type PackageInputData = {
  name: string;
  type: PackageType;
  duration_minutes: number | null;
  quota_mb: number | null;
  speed_down_mbps: number | null;
  speed_up_mbps: number | null;
  price: number;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
};

export type ParsePackageResult =
  | { ok: true; data: PackageInputData }
  | { ok: false; error: string };

function nullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

export function parsePackageInput(
  body: unknown
): ParsePackageResult {
  if (
    typeof body !== "object" ||
    body === null
  ) {
    return {
      ok: false,
      error:
        "Data paket tidak valid.",
    };
  }

  const b = body as Record<
    string,
    unknown
  >;

  const { name, type, price } = b;

  if (
    typeof name !== "string" ||
    name.trim() === ""
  ) {
    return {
      ok: false,
      error:
        "Nama paket wajib diisi.",
    };
  }

  if (
    typeof type !== "string" ||
    !VALID_TYPES.includes(
      type as PackageType
    )
  ) {
    return {
      ok: false,
      error:
        "Jenis paket tidak valid.",
    };
  }

  const packagePrice =
    Number(price);

  if (
    !Number.isFinite(
      packagePrice
    ) ||
    packagePrice < 0
  ) {
    return {
      ok: false,
      error:
        "Harga paket tidak valid.",
    };
  }

  const durationMinutes =
    nullableNumber(
      b.duration_minutes
    );

  const quotaMb = nullableNumber(
    b.quota_mb
  );

  const speedDown = nullableNumber(
    b.speed_down_mbps
  );

  const speedUp = nullableNumber(
    b.speed_up_mbps
  );

  if (
    durationMinutes !== null &&
    durationMinutes <= 0
  ) {
    return {
      ok: false,
      error:
        "Durasi harus lebih besar dari 0.",
    };
  }

  if (
    quotaMb !== null &&
    quotaMb <= 0
  ) {
    return {
      ok: false,
      error:
        "Kuota harus lebih besar dari 0.",
    };
  }

  if (
    speedDown !== null &&
    speedDown < 0
  ) {
    return {
      ok: false,
      error:
        "Kecepatan download tidak valid.",
    };
  }

  if (
    speedUp !== null &&
    speedUp < 0
  ) {
    return {
      ok: false,
      error:
        "Kecepatan upload tidak valid.",
    };
  }

  let startTime:
    | string
    | null = null;

  let endTime:
    | string
    | null = null;

  if (type === "night") {
    startTime =
      typeof b.start_time ===
        "string" &&
      b.start_time.trim() !== ""
        ? b.start_time
        : null;

    endTime =
      typeof b.end_time ===
        "string" &&
      b.end_time.trim() !== ""
        ? b.end_time
        : null;

    if (!startTime || !endTime) {
      return {
        ok: false,
        error:
          "Jam mulai dan jam selesai paket malam wajib diisi.",
      };
    }
  }

  return {
    ok: true,
    data: {
      name: name.trim(),
      type: type as PackageType,
      duration_minutes:
        durationMinutes,
      quota_mb: quotaMb,
      speed_down_mbps:
        speedDown,
      speed_up_mbps: speedUp,
      price: packagePrice,
      start_time: startTime,
      end_time: endTime,
      active: b.active !== false,
    },
  };
}
