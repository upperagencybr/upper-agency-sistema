/** Platform admin is the Upper owner, not a company's admin member. */
export function canTestNexoContent(isPlatformAdmin: boolean | undefined): boolean {
  return isPlatformAdmin === true;
}