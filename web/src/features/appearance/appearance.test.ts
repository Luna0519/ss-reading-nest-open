import { describe, expect, it } from "vitest";
import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  loadAppearancePreferences,
  normalizeAppearance,
  saveAppearanceBackground,
  saveAppearancePreferences
} from "./appearance.js";

describe("appearance preferences", () => {
  it("loads defaults and clamps damaged stored values", () => {
    expect(loadAppearancePreferences({ getItem: () => null })).toEqual(DEFAULT_APPEARANCE);
    expect(
      normalizeAppearance({
        theme: "lavender",
        glassOpacity: 99,
        glassBlur: -1,
        readerScale: 0,
        readerLineHeight: 8
      })
    ).toMatchObject({
      theme: "lavender",
      glassOpacity: 0.92,
      glassBlur: 8,
      readerScale: 0.9,
      readerLineHeight: 2.2
    });
  });

  it("persists settings separately from the private background image", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    };
    expect(saveAppearancePreferences({ ...DEFAULT_APPEARANCE, theme: "peach" }, storage)).toBe(true);
    expect(saveAppearanceBackground("data:image/jpeg;base64,abc", storage)).toBe(true);
    expect(values.size).toBe(2);
    expect(loadAppearancePreferences(storage).theme).toBe("peach");
  });

  it("applies the theme, glass controls, typography and local background", () => {
    const root = document.createElement("html");
    applyAppearance(
      {
        ...DEFAULT_APPEARANCE,
        theme: "lavender",
        glassOpacity: 0.5,
        glassBlur: 18,
        readerFont: "rounded",
        readerScale: 1.15
      },
      "data:image/jpeg;base64,abc",
      root
    );
    expect(root.dataset.llTheme).toBe("lavender");
    expect(root.dataset.llCustomBackground).toBe("true");
    expect(root.style.getPropertyValue("--glass-opacity")).toBe("0.50");
    expect(root.style.getPropertyValue("--glass-blur")).toBe("18px");
    expect(root.style.getPropertyValue("--reader-font-scale")).toBe("1.15");
  });
});
