export type AppearanceTheme = "forest" | "lavender" | "peach";
export type ReaderFont = "rounded" | "serif" | "sans";

export type AppearancePreferences = {
  theme: AppearanceTheme;
  glassOpacity: number;
  glassBlur: number;
  readerFont: ReaderFont;
  readerScale: number;
  readerLineHeight: number;
};

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "forest",
  glassOpacity: 0.58,
  glassBlur: 26,
  readerFont: "serif",
  readerScale: 1,
  readerLineHeight: 1.86
};

const SETTINGS_KEY = "ll:appearance:v1";
const BACKGROUND_KEY = "ll:appearance-background:v1";
const FONT_STACKS: Record<ReaderFont, string> = {
  rounded: 'ui-rounded, "SF Pro Rounded", "PingFang SC", system-ui, sans-serif',
  serif: '"Songti SC", "Noto Serif CJK SC", Georgia, serif',
  sans: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
};

export function loadAppearancePreferences(
  storage: Pick<Storage, "getItem"> = window.localStorage
): AppearancePreferences {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePreferences>;
    return normalizeAppearance(parsed);
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearancePreferences(
  preferences: AppearancePreferences,
  storage: Pick<Storage, "setItem"> = window.localStorage
): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeAppearance(preferences)));
    return true;
  } catch {
    return false;
  }
}

export function loadAppearanceBackground(
  storage: Pick<Storage, "getItem"> = window.localStorage
): string | undefined {
  try {
    const value = storage.getItem(BACKGROUND_KEY);
    return value?.startsWith("data:image/") ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveAppearanceBackground(
  dataUrl: string | undefined,
  storage: Pick<Storage, "setItem" | "removeItem"> = window.localStorage
): boolean {
  try {
    if (dataUrl) storage.setItem(BACKGROUND_KEY, dataUrl);
    else storage.removeItem(BACKGROUND_KEY);
    return true;
  } catch {
    return false;
  }
}

export function applyAppearance(
  preferences: AppearancePreferences,
  backgroundImage?: string,
  root: HTMLElement = document.documentElement
) {
  const normalized = normalizeAppearance(preferences);
  root.dataset.llTheme = normalized.theme;
  root.style.setProperty("--glass-opacity", normalized.glassOpacity.toFixed(2));
  root.style.setProperty(
    "--glass-panel-opacity",
    Math.min(0.96, normalized.glassOpacity + 0.26).toFixed(2)
  );
  root.style.setProperty("--glass-blur", `${normalized.glassBlur}px`);
  root.style.setProperty("--reader-font-family", FONT_STACKS[normalized.readerFont]);
  root.style.setProperty("--reader-font-scale", normalized.readerScale.toFixed(2));
  root.style.setProperty("--reader-line-height", normalized.readerLineHeight.toFixed(2));
  if (backgroundImage?.startsWith("data:image/")) {
    root.style.setProperty("--custom-background-image", `url("${backgroundImage}")`);
    root.dataset.llCustomBackground = "true";
  } else {
    root.style.removeProperty("--custom-background-image");
    delete root.dataset.llCustomBackground;
  }
}

export function normalizeAppearance(
  value: Partial<AppearancePreferences>
): AppearancePreferences {
  return {
    theme: isTheme(value.theme) ? value.theme : DEFAULT_APPEARANCE.theme,
    glassOpacity: clamp(value.glassOpacity, 0.36, 0.92, DEFAULT_APPEARANCE.glassOpacity),
    glassBlur: clamp(value.glassBlur, 8, 38, DEFAULT_APPEARANCE.glassBlur),
    readerFont: isReaderFont(value.readerFont) ? value.readerFont : DEFAULT_APPEARANCE.readerFont,
    readerScale: clamp(value.readerScale, 0.9, 1.3, DEFAULT_APPEARANCE.readerScale),
    readerLineHeight: clamp(
      value.readerLineHeight,
      1.55,
      2.2,
      DEFAULT_APPEARANCE.readerLineHeight
    )
  };
}

function isTheme(value: unknown): value is AppearanceTheme {
  return value === "forest" || value === "lavender" || value === "peach";
}

function isReaderFont(value: unknown): value is ReaderFont {
  return value === "rounded" || value === "serif" || value === "sans";
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
