// The six bright colors every pixel component can be painted with.
// Tailwind only generates classes it can find written out in full, so each
// color's classes are spelled out here instead of built with `bg-${color}`.

export type Accent = "red" | "cyan" | "yellow" | "green" | "blue" | "purple";

/** Solid fill, e.g. a button or icon block background. */
export const accentBg: Record<Accent, string> = {
  red: "bg-red",
  cyan: "bg-cyan",
  yellow: "bg-yellow",
  green: "bg-green",
  blue: "bg-blue",
  purple: "bg-purple",
};

/** The color used as text on a dark panel, e.g. a card title. */
export const accentText: Record<Accent, string> = {
  red: "text-red",
  cyan: "text-cyan",
  yellow: "text-yellow",
  green: "text-green",
  blue: "text-blue",
  purple: "text-purple",
};

/** Readable text color to put on top of the solid fill. */
export const accentOn: Record<Accent, string> = {
  red: "text-cream",
  cyan: "text-ink",
  yellow: "text-ink",
  green: "text-ink",
  blue: "text-cream",
  purple: "text-cream",
};

/** Sets the darker partner color that `shadow-pixel` draws with. */
export const accentShadow: Record<Accent, string> = {
  red: "[--shadow-color:var(--red-deep)]",
  cyan: "[--shadow-color:var(--cyan-deep)]",
  yellow: "[--shadow-color:var(--yellow-deep)]",
  green: "[--shadow-color:var(--green-deep)]",
  blue: "[--shadow-color:var(--blue-deep)]",
  purple: "[--shadow-color:var(--purple-deep)]",
};
