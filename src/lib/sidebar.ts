/** Navigation preferences change visibility, never access rights or business records. */
export const REQUIRED_SIDEBAR_PATHS = ["/dashboard", "/financeiro", "/empresas", "/feedbacks", "/conteudo", "/adquira"] as const;

export function isRequiredSidebarItem(path: string): boolean {
  return REQUIRED_SIDEBAR_PATHS.some((required) => required === path);
}

export function optionalHiddenSections(hidden: readonly string[]): string[] {
  return hidden.filter((path) => !isRequiredSidebarItem(path));
}

export function visibleSidebarItems<T extends { to: string }>(items: T[], hidden: readonly string[] | null | undefined): T[] {
  const paths = new Set(optionalHiddenSections(hidden ?? []));
  return items.filter((item) => !paths.has(item.to));
}

export function toggleHiddenSection(hidden: readonly string[], path: string): string[] {
  if (isRequiredSidebarItem(path)) return optionalHiddenSections(hidden);
  return hidden.includes(path) ? hidden.filter((item) => item !== path) : [...hidden, path];
}