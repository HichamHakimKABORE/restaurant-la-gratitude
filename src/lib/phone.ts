/** Utilitaires de formatage et de lien pour les numéros de téléphone du restaurant. */

export function cleanPhoneDisplay(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function toTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : 'tel:+22602809906';
}

export function formatPhoneList(phone1?: string | null, phone2?: string | null, fallback = '+226 02 80 99 06'): string[] {
  const p1 = cleanPhoneDisplay(phone1) || fallback;
  const p2 = cleanPhoneDisplay(phone2);
  if (p2 && p2 !== p1) {
    return [p1, p2];
  }
  return [p1];
}

export function joinPhoneNumbers(phone1?: string | null, phone2?: string | null, separator = ' / '): string {
  return formatPhoneList(phone1, phone2).join(separator);
}
