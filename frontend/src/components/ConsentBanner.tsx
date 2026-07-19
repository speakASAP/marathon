import { useEffect } from 'react';
// Vendored from shared/packages/consent — refresh with shared/scripts/sync-consent.sh.
import { mountConsentBanner } from '../lib/consent/consent-banner.js';

/** Bump when the wording changes; visitors are then asked again. */
const CONSENT_VERSION = 'alfares-consent-v1';

/**
 * Declares strictly necessary storage only — this site runs no analytics or
 * marketing scripts, so there is nothing optional to opt out of.
 *
 * No policyUrl: this site has no privacy policy page yet. Add one and pass it
 * here — a consent notice that cannot point at the details is incomplete.
 */
export default function ConsentBanner() {
  useEffect(() => {
    const banner = mountConsentBanner({
      version: CONSENT_VERSION,
      text: {
        title: 'Cookies и хранение данных',
        disclosureBody:
          'Мы храним только то, что нужно для входа и работы сайта. Аналитических и маркетинговых cookies нет, за вами не следят на других сайтах.',
        acknowledge: 'Понятно',
      },
    });

    return () => banner.destroy();
  }, []);

  return null;
}
