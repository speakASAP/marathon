export const PUBLIC_MARATHON_LANGUAGES = [
  { code: 'en', slug: 'english', label: 'Английский A1' },
  { code: 'de', slug: 'german', label: 'Немецкий A1' },
  { code: 'es', slug: 'spanish', label: 'Испанский A1' },
  { code: 'fr', slug: 'french', label: 'Французский A1' },
  { code: 'it', slug: 'italian', label: 'Итальянский A1' },
  { code: 'cz', slug: 'czech', label: 'Чешский A1' },
  { code: 'tr', slug: 'turkish', label: 'Турецкий A1' },
  { code: 'pt', slug: 'portuguese', label: 'Португальский A1' },
  { code: 'nl', slug: 'dutch', label: 'Нидерландский A1' },
  { code: 'pl', slug: 'polish', label: 'Польский A1' },
  { code: 'no', slug: 'norwegian', label: 'Норвежский A1' },
  { code: 'se', slug: 'swedish', label: 'Шведский A1' },
  { code: 'dk', slug: 'danish', label: 'Датский A1' },
] as const;

export const LANDING_LANGUAGE_SLUGS = PUBLIC_MARATHON_LANGUAGES.map((language) => language.slug);

const LANDING_LANGUAGE_CODE_ALIASES: Record<string, string> = {
  cs: 'cz',
  da: 'dk',
  nb: 'no',
  nn: 'no',
  sv: 'se',
};

export function getMarathonLandingPathFromSlug(slug: string): string {
  return `/${slug.replace(/^\/+|\/+$/g, '')}`;
}

export function getMarathonLandingPath(code: string): string | null {
  const normalized = code.toLowerCase();
  const landingCode = LANDING_LANGUAGE_CODE_ALIASES[normalized] || normalized;
  const language = PUBLIC_MARATHON_LANGUAGES.find((item) => item.code === landingCode);
  return language ? getMarathonLandingPathFromSlug(language.slug) : getMarathonLandingPathFromSlug(encodeURIComponent(normalized));
}

const SPEAKASAP_BASIC_COURSE_LANGUAGE_ALIASES: Record<string, string> = {
  cs: 'cz',
  da: 'dk',
  nb: 'no',
  nn: 'no',
  sv: 'se',
};

export function buildSpeakAsapBasicCourseUrl(code: string): string {
  const normalized = code.toLowerCase().replace(/[^a-z]/g, '');
  const courseCode = SPEAKASAP_BASIC_COURSE_LANGUAGE_ALIASES[normalized] || normalized || 'de';
  return `https://speakasap.com/${courseCode}/basic/`;
}

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


export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', it: '🇮🇹', ru: '🇷🇺',
  cz: '🇨🇿', cs: '🇨🇿', tr: '🇹🇷', pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱',
  no: '🇳🇴', nb: '🇳🇴', nn: '🇳🇴', se: '🇸🇪', sv: '🇸🇪', dk: '🇩🇰', da: '🇩🇰',
};

export function formatLanguageFlag(code: string): string {
  return LANGUAGE_FLAGS[code.toLowerCase()] || '🏁';
}

export function formatLanguageOptionLabel(code: string, fallback?: string): string {
  const normalized = code.toLowerCase();
  const label = formatLanguageLabel(normalized, fallback);
  const flag = LANGUAGE_FLAGS[normalized];
  return flag ? `${flag} ${label}` : label;
}
