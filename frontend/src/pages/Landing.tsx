import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import '../landing.css';

const LANGUAGE_LABELS: Record<string, string> = {
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ru: 'Russian',
};

interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  landingVideoUrl?: string;
}

interface LangItem {
  code: string;
  name: string;
  url?: string;
}

interface Review {
  name: string;
  photo: string;
  text: string;
}

interface CatalogReadiness {
  registrationOpen: boolean;
  counts?: {
    activeMarathons: number;
    steps: number;
    stepsWithContent: number;
    products: number;
    unusedGifts: number;
  };
  missing?: string[];
}

function formatLanguageName(marathon: MarathonSummary): string {
  return marathon.title || LANGUAGE_LABELS[marathon.languageCode.toLowerCase()] || 'this language';
}

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langSlug) return;
    setLoading(true);
    setLoadError('');
    Promise.all([
      fetch(`/api/v1/marathons/by-language/${encodeURIComponent(langSlug)}`).then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`marathon:${r.status}`);
        return r.text().then((body) => (body.trim() ? JSON.parse(body) : null));
      }),
      fetch('/api/v1/marathons/languages')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: LangItem[]) => (Array.isArray(data) ? data : [])),
      fetch('/api/v1/marathons/readiness')
        .then((r) => {
          if (!r.ok) throw new Error(`readiness:${r.status}`);
          return r.json();
        }),
      fetch('/api/v1/reviews').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([marathonData, langs, readinessData, reviewsData]) => {
        setMarathon(marathonData || {
          id: 'fallback',
          languageCode: langSlug,
          title: '',
        });
        setLanguages(langs);
        setReadiness(readinessData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => {
        setMarathon(null);
        setLanguages([]);
        setReadiness(null);
        setReviews([]);
        setLoadError('Marathon landing could not be loaded. Refresh this page, or contact support if the problem continues.');
      })
      .finally(() => setLoading(false));
  }, [langSlug]);

  useEffect(() => {
    if (!marathon) return;
    const langName = formatLanguageName(marathon);
    const metaReady = marathon.id !== 'fallback' && readiness?.registrationOpen === true;
    document.title = metaReady
      ? `${langName} Marathon — SpeakASAP language practice`
      : `${langName} Marathon — registration status`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      metaReady
        ? `Join the ${langName} Marathon by SpeakASAP: approved assignments, profile progress tracking, and VIP access through the Marathon profile.`
        : `Registration for the ${langName} Marathon opens after approved catalog, assignment, VIP product, and gift data are loaded.`,
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/${marathon.languageCode}/`);
  }, [marathon, readiness]);

  const featuredReviews = useMemo(() => reviews.slice(0, 3), [reviews]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRegisterSuccess = (marathonerId: string) => {
    setFormError('');
    setRegisteredId(marathonerId);
  };

  if (loading) {
    return (
      <div className="marathon-loading">
        <p>Loading marathon...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Marathon landing is temporarily unavailable</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{loadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <Link to="/support" className="btn-profile-login">
              Contact support
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!marathon) {
    return (
      <div className="container page-static">
        <p>Marathon data is temporarily unavailable.</p>
        <Link to="/support">Contact support</Link>
      </div>
    );
  }

  const languageName = formatLanguageName(marathon);
  const activeLanguage = languages.find((language) => language.code === marathon.languageCode);
  const hasActiveMarathon = marathon.id !== 'fallback';
  const registrationOpen = hasActiveMarathon && readiness?.registrationOpen === true;
  const registrationStatusId = registrationOpen ? undefined : 'registration-status-note';
  const startCtaLabel = registrationOpen ? 'Start my marathon' : 'Registration opens soon';
  const heroCtaLabel = registrationOpen ? 'Start for free' : 'View registration status';
  const heroSecondary = registrationOpen
    ? { to: '/profile', label: 'Open my marathon' }
    : { to: '/support', label: 'Contact support' };
  const pricingIntro = registrationOpen
    ? 'Start now. Upgrade when the marathon gate opens and you are ready to continue.'
    : 'Registration opens after production catalog data is configured for this language.';
  const heroTitle = registrationOpen
    ? `${languageName} progress with approved daily practice.`
    : `${languageName} Marathon is being prepared.`;
  const heroIntro = registrationOpen
    ? 'Join a focused language marathon with daily assignments, report windows, progress tracking, and a clear path from free start to full VIP access.'
    : 'Registration will open after the approved marathon catalog, assignments, VIP product, and gift codes are loaded in production.';
  const registerTitle = registrationOpen ? `Start your ${languageName} Marathon` : 'Registration status';
  const missingLaunchGates = readiness?.missing ?? [];
  const readinessCounts = readiness?.counts;
  const approvedStepsLabel = readinessCounts
    ? `${readinessCounts.stepsWithContent}/${readinessCounts.steps}`
    : '0/0';
  const faqItems = registrationOpen
    ? [
      ['How much time do I need each day?', 'Use the assignment instructions shown in your profile for the current approved step.'],
      ['Can I start for free?', 'Registration starts with the free Marathon path. VIP checkout appears from your profile when the gate requires it.'],
      ['What happens after the VIP gate?', 'Free participants are asked to upgrade before post-gate assignments unlock.'],
      ['How do assignments work?', 'Each approved task has instructions, report status, and progress state in your marathon profile.'],
    ]
    : [
      ['When will registration open?', 'Registration opens after the approved active marathon, assignments, VIP product, and gift inventory are loaded.'],
      ['Why is there no price?', 'The landing page does not show a fallback price. VIP checkout uses the approved product configured in production.'],
      ['Why is there no course preview?', 'Course tasks and assignment text are shown only after approved catalog data exists.'],
      ['Where can I see launch status?', 'Open Support for the catalog runbook, readiness API, and post-load journey smoke commands.'],
    ];

  return (
    <div className="marathon-landing">
      <header className="ml-nav">
        <Link to="/" className="ml-brand" aria-label="SpeakASAP Marathon home">
          <span>Speak<span>ASAP</span></span>
          <small>Marathon</small>
        </Link>
        <nav className="ml-nav-links" aria-label="Landing navigation">
          <a href="#how">How it works</a>
          <a href="#program">Program</a>
          <a href="#pricing">Pricing</a>
          <a href="#winners">Winners</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="ml-nav-actions">
          <label className="ml-language-select">
            <span>Language</span>
            <select
              value={marathon.languageCode}
              onChange={(event) => {
                window.location.href = `/${event.target.value}/`;
              }}
            >
              {languages.length ? (
                languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))
              ) : (
                <option value={marathon.languageCode}>{activeLanguage?.name || languageName}</option>
              )}
            </select>
          </label>
          <Link to="/profile" className="ml-secondary-action">My marathon</Link>
          <button
            type="button"
            className={`ml-primary-action${registrationOpen ? '' : ' is-closed'}`}
            onClick={scrollToForm}
            aria-describedby={registrationStatusId}
          >
            {startCtaLabel}
          </button>
        </div>
      </header>

      <main>
        <section className="ml-hero">
          <div className="ml-hero-copy">
            <h1>{heroTitle}</h1>
            <p>{heroIntro}</p>
            <div className="ml-hero-actions">
              <button
                type="button"
                className={`ml-primary-action large${registrationOpen ? '' : ' is-closed'}`}
                onClick={scrollToForm}
                aria-describedby={registrationStatusId}
              >
                {heroCtaLabel}
              </button>
              <Link to={heroSecondary.to} className="ml-outline-action">{heroSecondary.label}</Link>
            </div>
            {!registrationOpen && (
              <p className="ml-availability-note" id="registration-status-note">
                Registration is closed until the active marathon, assignments, VIP product, and gift codes are configured in production.
              </p>
            )}
            <dl className="ml-hero-points" aria-label={registrationOpen ? 'Marathon highlights' : 'Catalog readiness summary'}>
              {registrationOpen ? (
                <>
                  <div><dt>Free</dt><dd>starter access</dd></div>
                  <div><dt>VIP</dt><dd>checkout from profile</dd></div>
                  <div><dt>Daily</dt><dd>approved assignments</dd></div>
                </>
              ) : (
                <>
                  <div><dt>{readinessCounts?.activeMarathons ?? 0}</dt><dd>active marathons</dd></div>
                  <div><dt>{approvedStepsLabel}</dt><dd>approved steps</dd></div>
                  <div><dt>{readinessCounts?.products ?? 0}</dt><dd>VIP products</dd></div>
                </>
              )}
            </dl>
          </div>

          <div className="ml-product-preview" aria-label={registrationOpen ? 'Marathon profile preview' : 'Marathon launch readiness preview'}>
            <div className="ml-preview-sidebar">
              <strong>Marathon</strong>
              <span className="active">{registrationOpen ? 'Overview' : 'Readiness'}</span>
              <span>{registrationOpen ? 'Assignments' : 'Catalog'}</span>
              <span>{registrationOpen ? 'Reports' : 'VIP'}</span>
              <span>{registrationOpen ? 'Progress' : 'Launch gate'}</span>
            </div>
            <div className="ml-preview-main">
              {registrationOpen ? (
                <>
                  <div className="ml-preview-head">
                    <div>
                      <span>Profile dashboard</span>
                      <strong>Your approved marathon path opens here.</strong>
                    </div>
                    <div className="ml-progress-ring">Live</div>
                  </div>
                  <article className="ml-assignment-card featured">
                    <span>Current assignment</span>
                    <h3>Open the next approved task from your profile.</h3>
                    <p>Your saved report, VIP gate, due state, and completion status are loaded from the live Marathon APIs.</p>
                    <Link to="/profile" className="ml-primary-action">Open profile</Link>
                  </article>
                  <article className="ml-feedback-card">
                    <strong>Progress stays attached to your account</strong>
                    <p>Portal login returns to the exact profile, gift, checkout, or assignment route you opened.</p>
                  </article>
                </>
              ) : (
                <>
                  <div className="ml-preview-head">
                    <div>
                      <span>Launch status</span>
                      <strong>Waiting for approved catalog data.</strong>
                    </div>
                    <div className="ml-progress-ring">Closed</div>
                  </div>
                  <article className="ml-assignment-card featured">
                    <span>Catalog readiness</span>
                    <h3>No course preview is shown before approval.</h3>
                    <p>Assignments, pricing, VIP checkout, gift redemption, and registration stay hidden until production readiness is green.</p>
                    <dl className="ml-readiness-list">
                      <div><dt>Active marathons</dt><dd>{readinessCounts?.activeMarathons ?? 0}</dd></div>
                      <div><dt>Approved steps</dt><dd>{approvedStepsLabel}</dd></div>
                      <div><dt>VIP products</dt><dd>{readinessCounts?.products ?? 0}</dd></div>
                      <div><dt>Gift codes</dt><dd>{readinessCounts?.unusedGifts ?? 0}</dd></div>
                    </dl>
                  </article>
                  <article className="ml-feedback-card">
                    <strong>Next operational action</strong>
                    <p>Load a source-owner approved catalog packet, then run readiness and post-load journey smoke checks from Support.</p>
                    <Link to="/support" className="ml-outline-action">Open support runbook</Link>
                  </article>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="ml-how" id="how">
          <div className="ml-section-head">
            <h2>How the Marathon works</h2>
            <p>Short tasks, a visible daily rhythm, and enough pressure to keep momentum without overload.</p>
          </div>
          <div className="ml-how-grid">
            <article><span>01</span><h3>Daily assignment</h3><p>Open one focused task with exact timing and a clear report window.</p></article>
            <article><span>02</span><h3>Personal feedback</h3><p>Use corrections, examples, and peer answers to improve the next day.</p></article>
            <article><span>03</span><h3>Track progress</h3><p>See completed days, locked steps, VIP access, and final certificate path.</p></article>
          </div>
        </section>

        <section className="ml-pricing" id="pricing">
          <div className="ml-section-head">
            <h2>Choose your plan</h2>
            <p>{pricingIntro}</p>
          </div>
          <div className="ml-pricing-grid">
            <article className="ml-plan">
              <h3>Free</h3>
              <strong>€0</strong>
              <p>Start your marathon and test the daily rhythm.</p>
              <ul>
                <li>Daily assignments</li>
                <li>Basic progress tracking</li>
                <li>Community access</li>
              </ul>
              <button type="button" className="ml-outline-action" onClick={scrollToForm}>
                {registrationOpen ? 'Start for free' : 'View registration status'}
              </button>
            </article>
            <article className="ml-plan vip">
              <div className="ml-plan-ribbon">Most complete</div>
              <h3>VIP</h3>
              <strong>{registrationOpen ? 'Checkout' : 'Pending'}</strong>
              <p>
                {registrationOpen
                  ? 'Unlock the full marathon from your profile after the VIP gate.'
                  : 'VIP price and checkout appear only after an approved product is configured.'}
              </p>
              <ul>
                <li>Everything in Free</li>
                <li>Approved post-gate assignments</li>
                <li>Detailed corrections and support</li>
                <li>Certificate path</li>
              </ul>
              {registrationOpen ? (
                <Link to="/profile" className="ml-primary-action">Upgrade from profile</Link>
              ) : (
                <button type="button" className="ml-primary-action is-closed" onClick={scrollToForm}>
                  Available after registration
                </button>
              )}
            </article>
            <aside className="ml-payment-panel">
              <h3>VIP access</h3>
              <p>
                {registrationOpen
                  ? 'Payments are routed through the shared payments service. Checkout and gift-code redemption unlock VIP access from the marathon profile.'
                  : 'VIP checkout and gift-code redemption will open after an active marathon catalog is configured.'}
              </p>
              {registrationOpen ? (
                <Link to="/gift" className="ml-outline-action">Gift code</Link>
              ) : (
                <button type="button" className="ml-outline-action" onClick={scrollToForm}>
                  View registration status
                </button>
              )}
              <Link to="/support" className="ml-secondary-action">Need help?</Link>
            </aside>
          </div>
        </section>

        <section className="ml-workflow" id="program">
          <div className="ml-section-head">
            <h2>{registrationOpen ? 'Your daily workflow' : 'Launch readiness workflow'}</h2>
            <p>
              {registrationOpen
                ? 'Open approved assignments from your profile, submit reports, and continue through the VIP gate when it appears.'
                : 'No sample course sequence is shown while the production catalog is empty. These are the gates that must pass before registration opens.'}
            </p>
          </div>
          <div className="ml-day-row">
            {registrationOpen ? (
              <>
                <article className="ml-day-card state-done">
                  <span>Profile</span>
                  <h3>Open your participant dashboard</h3>
                  <small>Account-bound</small>
                  <p>Progress, payment state, and saved reports stay linked to your Marathon login.</p>
                  <Link to="/profile" className="ml-outline-action">Open</Link>
                </article>
                <article className="ml-day-card state-start">
                  <span>Assignment</span>
                  <h3>Continue the current approved step</h3>
                  <small>Live catalog</small>
                  <p>The active task, due state, VIP gate, and saved-report readback come from production APIs.</p>
                  <Link to="/profile" className="ml-primary-action">Continue</Link>
                </article>
                <article className="ml-day-card state-locked">
                  <span>VIP</span>
                  <h3>Unlock post-gate access from profile</h3>
                  <small>Payment or gift</small>
                  <p>Checkout and gift redemption use the server-side product and gift inventory.</p>
                  <button type="button" disabled>Profile gated</button>
                </article>
              </>
            ) : (
              <>
                <article className="ml-day-card state-locked">
                  <span>Gate 1</span>
                  <h3>Approved active marathon</h3>
                  <small>{readinessCounts?.activeMarathons ?? 0} configured</small>
                  <p>Registration stays closed until an active language catalog exists.</p>
                  <Link to="/support" className="ml-outline-action">Runbook</Link>
                </article>
                <article className="ml-day-card state-locked">
                  <span>Gate 2</span>
                  <h3>Approved assignment content</h3>
                  <small>{approvedStepsLabel} ready</small>
                  <p>Every step needs approved plain-text assignment content before launch.</p>
                  <Link to="/support" className="ml-outline-action">Runbook</Link>
                </article>
                <article className="ml-day-card state-locked">
                  <span>Gate 3</span>
                  <h3>VIP product and gift inventory</h3>
                  <small>{readinessCounts?.products ?? 0} products / {readinessCounts?.unusedGifts ?? 0} gifts</small>
                  <p>Payment and gift checks wait for source-owner approved product and gift rows.</p>
                  <Link to="/support" className="ml-outline-action">Runbook</Link>
                </article>
              </>
            )}
          </div>
          {!registrationOpen && missingLaunchGates.length ? (
            <div className="ml-missing-gates ml-workflow-gates" aria-label="Missing launch gates">
              <strong>Launch blockers</strong>
              <div>
                {missingLaunchGates.map((item) => (
                  <span key={item}>{formatMissingGate(item)}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="ml-proof" id="winners">
          <div className="ml-section-head">
            <h2>Real people. Real results.</h2>
            <p>Winner records and reviews are loaded from the Marathon platform.</p>
          </div>
          <div className="ml-review-grid">
            {featuredReviews.length ? featuredReviews.map((review) => (
              <article key={`${review.name}-${review.text}`} className="ml-review">
                {review.photo && <img src={review.photo} alt="" loading="lazy" />}
                <p>{review.text}</p>
                <strong>{review.name}</strong>
              </article>
            )) : (
              <article className="ml-review-empty" aria-live="polite">
                <h3>Reviews will appear after the first Marathon launch.</h3>
                <p>
                  Winner records and participant reviews are shown only after real participants complete
                  approved production marathons.
                </p>
                <Link to="/support" className="ml-outline-action">Launch status</Link>
              </article>
            )}
          </div>
          <Link to="/winners" className="ml-text-link">See winners</Link>
        </section>

        <section className="ml-faq" id="faq">
          <div>
            <h2>Questions? We're here to help.</h2>
            <div className="ml-faq-list">
              {faqItems.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside>
            <h3>Still have questions?</h3>
            <p>Support can help with registration, profile access, VIP state, and assignment questions.</p>
            <Link to="/support" className="ml-outline-action">Contact support</Link>
          </aside>
        </section>

        <section className="ml-register" ref={formRef} id="register">
          <div className="ml-register-copy">
            <h2>{registerTitle}</h2>
            <p>
              {registrationOpen
                ? 'Register with your email. The platform creates your participant record and sends a confirmation.'
                : 'Registration will open once the production catalog is ready for this language.'}
            </p>
            {registeredId && (
              <p className="ml-success">Registration received. Participant ID: {registeredId}</p>
            )}
            {formError && <p className="ml-error">{formError}</p>}
          </div>
          {registrationOpen ? (
            <RegistrationForm
              languageCode={marathon.languageCode}
              marathonTitle={marathon.title}
              onSuccess={handleRegisterSuccess}
              onError={setFormError}
            />
          ) : (
            <div className="ml-registration-unavailable">
              <h3>Registration is not open yet</h3>
              <p>The production catalog must include an active marathon, approved assignment content, VIP product, and gift codes before registration opens.</p>
              {missingLaunchGates.length ? (
                <div className="ml-missing-gates" aria-label="Missing launch gates">
                  <strong>Launch blockers</strong>
                  <div>
                    {missingLaunchGates.map((item) => (
                      <span key={item}>{formatMissingGate(item)}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <Link to="/support" className="ml-outline-action">Contact support</Link>
            </div>
          )}
        </section>
      </main>

      <footer className="ml-footer">
        <div>
          <strong>Speak<span>ASAP</span> Marathon</strong>
          <p>Skopalikova 1144/11, 615 00 Brno, Czech Republic</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/rules">Rules</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/support">Support</Link>
          <Link to="/profile">My marathon</Link>
        </nav>
      </footer>
    </div>
  );
}
