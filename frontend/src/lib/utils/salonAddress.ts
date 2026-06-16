export type SalonAddressInput = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

/** Street lines separate from locality; last line is city, region · postal · country. */
export function formatSalonAddressLines(salon: SalonAddressInput): string[] {
  const lines: string[] = [];
  const a1 = String(salon.addressLine1 || '').trim();
  const a2 = String(salon.addressLine2 || '').trim();
  if (a1) lines.push(a1);
  if (a2) lines.push(a2);
  const locality = [salon.city, salon.region]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ');
  const zip = String(salon.postalCode || '').trim();
  const cc = String(salon.country || '').trim().toUpperCase();
  const tail = [locality, zip, cc].filter(Boolean);
  if (tail.length) lines.push(tail.join(' · '));
  return lines;
}
