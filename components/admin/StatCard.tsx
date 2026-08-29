type StatCardProps = {
  label: string;
  value: string;
  description: string;
  icon: string;
  accent?: "gold" | "green" | "blue" | "red";
};

const accents = {
  gold: "text-[#c8ad72] bg-[#b89b5e]/8 border-[#b89b5e]/15",
  green: "text-emerald-300 bg-emerald-500/5 border-emerald-500/10",
  blue: "text-sky-300 bg-sky-500/5 border-sky-500/10",
  red: "text-red-300 bg-red-500/5 border-red-500/10",
};

const accentKeys = new Set(["gold", "green", "blue", "red"]);

export default function StatCard({
  label,
  value,
  description,
  icon,
  accent = "gold",
}: StatCardProps) {
  const safeAccent = accentKeys.has(accent) ? accent : "gold";

  return (
    <div
      className="
        rounded-2xl
        border
        border-white/6
        bg-[#11110f]
        p-5
        transition
        hover:border-[#b89b5e]/20
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40">{label}</p>

          <p
            className="
              mt-3
              text-2xl
              font-black
              tracking-tight
              text-[#f2f0ea]
            "
          >
            {value}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            text-sm
            ${accents[safeAccent]}
          `}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-white/30">{description}</p>
    </div>
  );
}
