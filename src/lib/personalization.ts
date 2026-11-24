import { useEffect, useState } from "react";

export const PALETTES = [
  { id: "nexo", label: "NEXO HUB", colors: ["nexo-base", "nexo-panel", "nexo-accent"] },
  { id: "enterprise", label: "01 · Enterprise Premium", colors: ["enterprise-base", "enterprise-panel", "enterprise-ink", "enterprise-accent", "enterprise-success"] },
  { id: "technology", label: "02 · Dark Technology", colors: ["technology-base", "technology-panel", "technology-card", "technology-accent"] },
  { id: "modern", label: "03 · Modern SaaS", colors: ["modern-base", "modern-panel", "modern-ink", "modern-accent", "modern-success"] },
  { id: "apple", label: "Apple", colors: ["apple-base", "apple-panel", "apple-ink", "apple-accent"] },
  { id: "spacex", label: "SpaceX", colors: ["spacex-base", "spacex-ink", "spacex-panel", "spacex-accent"] },
  { id: "aramco", label: "Saudi Aramco", colors: ["aramco-base", "aramco-accent", "aramco-blue", "aramco-panel"] },
  { id: "meta", label: "Meta", colors: ["meta-base", "meta-panel", "meta-accent", "meta-ink"] },
  { id: "tesla", label: "Tesla", colors: ["tesla-base", "tesla-ink", "tesla-accent", "tesla-panel"] },
] as const;
export type Palette = typeof PALETTES[number]["id"];
export function resolvePalette(value: string | null): Palette {
  return PALETTES.find(p => p.id === value)?.id ?? "nexo";
}
export function usePalette(userId?: string) {
  const [palette, setPalette] = useState<Palette>("nexo");
  useEffect(() => {
    if (!userId) return;
    const read = () => setPalette(resolvePalette(localStorage.getItem(`nexo-palette:${userId}`)));
    read();
    window.addEventListener("nexo-palette", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("nexo-palette", read); window.removeEventListener("storage", read); };
  }, [userId]);
  const choose = (next: Palette) => {
    if (!userId) return;
    localStorage.setItem(`nexo-palette:${userId}`, next);
    setPalette(next);
    window.dispatchEvent(new Event("nexo-palette"));
  };
  return { palette, choose };
}