import type { CSSProperties } from "react";
import type { CategoryColor, NamedCategoryColor } from "./types";

/**
 * Tailwind classes for each category color token. Keep in sync with globals.css.
 * `fill` is the plain pastel background (chips). `dot` adds a thin ring so the
 * palest colors stay visible as small dots on white.
 * The color keys are stored in the database, so only the labels were renamed.
 */
const ring = "ring-1 ring-inset ring-border-strong";
export const CATEGORY_COLORS: Record<NamedCategoryColor, { fill: string; dot: string; text: string; label: string }> = {
  gray: { fill: "bg-cat-gray", dot: `bg-cat-gray ${ring}`, text: "text-cat-gray", label: "Lavender" },
  blue: { fill: "bg-cat-blue", dot: `bg-cat-blue ${ring}`, text: "text-cat-blue", label: "Sky" },
  green: { fill: "bg-cat-green", dot: `bg-cat-green ${ring}`, text: "text-cat-green", label: "Sand" },
  pink: { fill: "bg-cat-pink", dot: `bg-cat-pink ${ring}`, text: "text-cat-pink", label: "Pink" },
  orange: { fill: "bg-cat-orange", dot: `bg-cat-orange ${ring}`, text: "text-cat-orange", label: "Peach" },
  purple: { fill: "bg-cat-purple", dot: `bg-cat-purple ${ring}`, text: "text-cat-purple", label: "Orchid" },
  red: { fill: "bg-cat-red", dot: `bg-cat-red ${ring}`, text: "text-cat-red", label: "Blush" },
  yellow: { fill: "bg-cat-yellow", dot: `bg-cat-yellow ${ring}`, text: "text-cat-yellow", label: "Lemon" },
};

export const PRESET_COLORS = Object.keys(CATEGORY_COLORS) as NamedCategoryColor[];

export const isPresetColor = (c: string): c is NamedCategoryColor => c in CATEGORY_COLORS;
export const isHexColor = (c: string): c is `#${string}` => /^#[0-9a-f]{6}$/i.test(c);

type Paint = { className: string; style?: CSSProperties };

/** Perceived brightness 0 (black) to 1 (white). */
function lightness(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Small color dot (badges, headings, pickers). Custom colors are shown exactly. */
export function dotPaint(color: CategoryColor): Paint {
  if (isPresetColor(color)) return { className: CATEGORY_COLORS[color].dot };
  return { className: ring, style: { backgroundColor: isHexColor(color) ? color : undefined } };
}

/**
 * Chip background behind dark text (calendar). Custom colors are used as-is when
 * light enough; darker ones are softened so the text stays readable.
 */
export function fillPaint(color: CategoryColor): Paint {
  if (isPresetColor(color)) return { className: CATEGORY_COLORS[color].fill };
  if (!isHexColor(color)) return { className: "bg-surface" };
  const backgroundColor = lightness(color) >= 0.6 ? color : `color-mix(in srgb, ${color} 35%, white)`;
  return { className: "", style: { backgroundColor } };
}

export const colorLabel = (color: CategoryColor) =>
  isPresetColor(color) ? CATEGORY_COLORS[color].label : `Custom ${color.toUpperCase()}`;
