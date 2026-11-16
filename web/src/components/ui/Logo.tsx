import Link from "next/link";

/**
 * Logo Nadi Kita: tetes darah dengan garis nadi.
 * Subjudul ditulis sentence case (tanpa huruf kapital penuh).
 */
export function Logo({
  href = "/",
  variant = "light",
  subtitle,
}: {
  href?: string;
  variant?: "light" | "dark";
  subtitle?: string;
}) {
  const isDark = variant === "dark";

  return (
    <Link
      href={href}
      aria-label={subtitle ? `Nadi Kita, ${subtitle}` : "Nadi Kita"}
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-input"
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-8 w-8 shrink-0"
      >
        <path
          d="M16 2.5C16 2.5 5.5 14 5.5 20.5a10.5 10.5 0 0 0 21 0C26.5 14 16 2.5 16 2.5Z"
          fill="#C8102E"
        />
        <path
          d="M9 20h3.5l2-4.5 3 8.5 2-4h3.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span
          className={`text-[19px] font-bold tracking-[-0.01em] ${
            isDark ? "text-white" : "text-ink"
          }`}
        >
          Nadi Kita
        </span>
        {subtitle && (
          <span
            className={`mt-1 text-xs font-medium ${
              isDark ? "text-white/75" : "text-ink-muted"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
