import type { SVGProps } from "react";

export type IconName = keyof typeof paths;

const paths = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M10 21v-6h4v6" />,
  dumbbell: (
    <>
      <path d="M2 9v6M5 7v10M19 7v10M22 9v6M5 12h14" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4A2.5 2.5 0 0 0 7 6.5 2.5 2.5 0 0 0 5 9c0 1 .4 1.8 1 2.4A2.8 2.8 0 0 0 5.5 13c0 1.5 1.2 2.7 2.7 2.9.2 1.8 1.6 3.1 3.3 3.1V4.6C11.5 4.2 10.6 4 9.5 4Z" />
      <path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19 9c0 1-.4 1.8-1 2.4.3.5.5 1 .5 1.6 0 1.5-1.2 2.7-2.7 2.9-.2 1.8-1.6 3.1-3.3 3.1V4.6c.5-.4 1.4-.6 2.5-.6Z" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M9.5 20h5M12 14v6" />
    </>
  ),
  message: <path d="M20 15a3 3 0 0 1-3 3H9l-4 3v-4.5A3 3 0 0 1 4 14V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 10a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 14 18 10Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />,
  heart: <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />,
  arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  chevronDown: <path d="m6 10 6 6 6-6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M2.5 19.5c0-3 2.9-5 6.5-5s6.5 2 6.5 5" />
      <path d="M16 5.6a3 3 0 0 1 0 5.8M18 14.9c2.1.6 3.5 2.2 3.5 4.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 13H3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 5 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.5 3.6V3a2 2 0 1 1 4 0v.2A1.6 1.6 0 0 0 17 5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flame: <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S8.5 11 10 11c0-3.5 2-8 2-8Z" />,
  apple: (
    <>
      <path d="M12 7.5c-1-1.5-3-2-4.5-1C5.5 8 5 11 6.5 14s4 6 5.5 6 4-3 5.5-6 1-6-1-7.5c-1.5-1-3.5-.5-4.5 1Z" />
      <path d="M12 7.5c0-2 1.5-3.5 3.5-3.5" />
    </>
  ),
  chart: <path d="M4 20h16M7 16V9m5 7V5m5 11v-4" />,
  bolt: <path d="M13.5 3 5 13.5h5L9.5 21 18 10.5h-5L13.5 3Z" />,
  bookmark: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4v-17Z" />,
  share: (
    <>
      <path d="M12 3.5v11M8 7l4-3.5L16 7" />
      <path d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" />
    </>
  ),
  send: <path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7Z" />,
  camera: (
    <>
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h1.5l1.5-2h7l1.5 2H19a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 19 19H6a2.5 2.5 0 0 1-2.5-2.5v-8Z" />
      <circle cx="12.5" cy="12.5" r="3.5" />
    </>
  ),
  edit: <path d="M4 20h4L20 8l-4-4L4 16v4Zm10-14 4 4" />,
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="3" />
      <path d="M9 3h6v3H9zM9 11h6M9 15h4" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="12.5" rx="2.5" />
      <path d="M3.5 13h17M12 8.5V21M8.5 8.5A2.5 2.5 0 1 1 12 5a2.5 2.5 0 1 1 3.5 3.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </>
  ),
  shield: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  sparkles: <path d="M12 3.5 13.5 8 18 9.5 13.5 11 12 15.5 10.5 11 6 9.5 10.5 8 12 3.5ZM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />,
  pin: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  graduation: (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
      <path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14 0 17-2.5-3-2.5-14.5 0-17Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  activity: <path d="M3 12h4l3 7 4-14 3 7h4" />,
  layers: <path d="M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16.5 14.5h1.5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20.5v-15A1.5 1.5 0 0 1 6.5 3.5Z" />
      <path d="M13 3.5V9h5" />
    </>
  ),
  box: <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Zm0 0L12 12l8.5-4.5M12 12v9" />,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />,
  google: (
    <path
      d="M21.35 11.1H12v2.98h5.34c-.23 1.4-1.66 4.1-5.34 4.1a5.9 5.9 0 0 1 0-11.8c1.68 0 2.8.72 3.44 1.33l2.34-2.26C16.3 3.96 14.36 3 12 3a9 9 0 1 0 0 18c5.2 0 8.63-3.65 8.63-8.79 0-.6-.06-1.05-.28-1.11Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  appleBrand: (
    <path
      d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.8-1.2 1.2-2.4 1.2-2.4s-2.1-.8-2.1-3.6ZM14.2 5.6c.6-.8 1-1.8.9-2.9-1 0-2.1.6-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.2-.6 2.8-1.4Z"
      fill="currentColor"
      stroke="none"
    />
  ),
} as const;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

/** KAYAR wordmark — geometric display logo */
export function Logo({
  className = "",
  size = "md",
  tagline = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tagline?: boolean;
}) {
  const s = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl sm:text-6xl",
  }[size];
  const track = { sm: "0.16em", md: "0.2em", lg: "0.24em", xl: "0.26em" }[size];
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`}>
      <span
        className={`font-display font-extrabold ${s} text-neon`}
        style={{ letterSpacing: track }}
        dir="ltr"
      >
        KAYAR
      </span>
      {tagline && (
        <span
          className="mt-1.5 font-display text-[0.55rem] uppercase text-muted/80 sm:text-[0.62rem]"
          style={{ letterSpacing: "0.34em" }}
          dir="ltr"
        >
          More Than A Sports App
        </span>
      )}
    </span>
  );
}
