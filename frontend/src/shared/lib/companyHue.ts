/** Stable 0-7 bucket for a company name, used to colour its initial-letter avatar. */
export function companyHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 8;
  return h;
}
