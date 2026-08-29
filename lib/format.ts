export function formatRupiah(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDuration(minutes: number | null) {
  if (minutes == null || minutes <= 0) {
    return "-";
  }

  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    const remaining = minutes % 60;

    return remaining > 0 ? `${hours} jam ${remaining} menit` : `${hours} jam`;
  }

  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${days} hari ${remainingHours} jam`
    : `${days} hari`;
}

export function formatQuota(mb: number | null) {
  if (mb == null || mb <= 0) {
    return "-";
  }

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }

  return `${mb} MB`;
}

export function formatDateTimeWIB(dateStr: string | null | undefined) {
  if (!dateStr) {
    return "-";
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
