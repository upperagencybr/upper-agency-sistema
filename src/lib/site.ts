// Which address the visitor is on decides what the site shows:
// The main address serves both sales and the authenticated system.

const SALES_HOSTS = ["hub.upperagencycompany.co"];
const SYSTEM_HOSTS = ["sistema.upperagencycompany.co"];
const SHARED_HOSTS = ["nexohub.upperagencycompany.co"];
const KNOWN_HOSTS = [...SALES_HOSTS, ...SYSTEM_HOSTS, ...SHARED_HOSTS];

export const SALES_ORIGIN = "https://nexohub.upperagencycompany.co";
export const SYSTEM_ORIGIN = "https://nexohub.upperagencycompany.co";

export type SiteMode = "sales" | "system" | "both";

/** "https://nexohub.upperagencycompany.co:443/x" -> "nexohub.upperagencycompany.co" */
export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

function urlHost(url: string): string {
  try {
    return normalizeHost(new URL(url).host);
  } catch {
    return "";
  }
}

/** The address the visitor typed, preferring the real one over proxy headers. */
export function hostFromRequest(request: { url: string; headers?: Headers }): string {
  const fromUrl = urlHost(request.url);
  if (KNOWN_HOSTS.includes(fromUrl)) return fromUrl;
  const forwarded = request.headers?.get?.("x-forwarded-host") ?? "";
  return forwarded ? normalizeHost(forwarded) : fromUrl;
}

export function siteMode(host: string): SiteMode {
  const h = normalizeHost(host);
  if (SYSTEM_HOSTS.includes(h)) return "system";
  if (SALES_HOSTS.includes(h)) return "sales";
  // preview, localhost and the *.lovable.app addresses keep both pages reachable
  return "both";
}

/** Pages that live on the sales address; everything else belongs to the system. */
const SALES_PATHS = ["/", "/assinar", "/assinar/obrigado"];

export function isSalesPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return SALES_PATHS.includes(p);
}

/**
 * Origin the visitor should be sent to, or "" when this host already serves
 * the right page. The sales address only shows the sales pages.
 */
export function foreignOriginFor(host: string, pathname: string): string {
  if (siteMode(host) === "sales" && !isSalesPath(pathname)) return SYSTEM_ORIGIN;
  return "";
}
