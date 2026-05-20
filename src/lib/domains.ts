import { DOMAINS, type Domain } from "./types";

export function extractDomain(text: string): Domain | null {
  const lower = text.toLowerCase();
  for (const domain of DOMAINS) {
    if (lower.includes(domain)) return domain;
  }
  return null;
}

export function isValidDomain(d: string): d is Domain {
  return (DOMAINS as readonly string[]).includes(d);
}
