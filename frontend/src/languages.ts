export const LANGUAGE_LABELS: Record<string, string> = {
  de: 'Немецкий',
  en: 'Английский',
  es: 'Испанский',
  fr: 'Французский',
  it: 'Итальянский',
  ru: 'Русский',
  cz: 'Чешский',
  cs: 'Чешский',
  tr: 'Турецкий',
  pt: 'Португальский',
  nl: 'Нидерландский',
  pl: 'Польский',
  no: 'Норвежский',
  nb: 'Норвежский',
  nn: 'Норвежский',
  se: 'Шведский',
  sv: 'Шведский',
  dk: 'Датский',
  da: 'Датский',
};

export function formatLanguageLabel(code: string, fallback?: string): string {
  return LANGUAGE_LABELS[code.toLowerCase()] || fallback || 'этот язык';
}
