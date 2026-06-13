import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import {
  fetchCatalogReadiness,
  fetchMarathonByLanguage,
  fetchMarathonLanguages,
  fetchPublicReviews,
  type CatalogReadiness,
  type MarathonLanguage,
  type MarathonSummary,
  type PublicReview,
} from '../api/publicMarathon';
import '../landing.css';

const LANGUAGE_LABELS: Record<string, string> = {
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ru: 'Russian',
};

const MARATHON_IMAGES = {
  hero: '/img/marathon/runners-start-finish.png',
  dailyTask: '/img/marathon/runners-daily-task.png',
  finish: '/img/marathon/runners-finish-day30.png',
};

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
  const effectiveLangSlug = langSlug && langSlug !== 'landing' ? langSlug : 'de';
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      fetchMarathonByLanguage(effectiveLangSlug),
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
      fetchPublicReviews(),
    ])
      .then(([marathonData, langs, readinessData, reviewsData]) => {
        setMarathon(marathonData || {
          id: 'fallback',
          languageCode: effectiveLangSlug,
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
  }, [effectiveLangSlug]);

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
  const raceLanguageName = LANGUAGE_LABELS[marathon.languageCode.toLowerCase()] || activeLanguage?.name || languageName;
  const hasActiveMarathon = marathon.id !== 'fallback';
  const registrationOpen = hasActiveMarathon && readiness?.registrationOpen === true;
  const registrationStatusId = registrationOpen ? undefined : 'registration-status-note';
  const startCtaLabel = registrationOpen ? 'Start my marathon' : 'Registration opens soon';
  const heroCtaLabel = registrationOpen ? 'Start my 30-day run' : 'See the 30-day route';
  const heroSecondary = registrationOpen
    ? { to: '/profile', label: 'Open my marathon' }
    : { to: '/support', label: 'Contact support' };
  const pricingIntro = 'The marathon is built like a race: begin at the start line, keep moving through one daily assignment, and finish the full route on day 30.';
  const heroTitle = registrationOpen
    ? `Run the ${raceLanguageName} Marathon for 30 days.`
    : `The ${raceLanguageName} Marathon starts with momentum.`;
  const heroIntro = registrationOpen
    ? 'Start at day 1, complete one focused language task every day, keep your pace in the profile, and cross the finish line after 30 days.'
    : 'A visual 30-day race from start to finish: every day you run one step, complete one assignment, and keep moving until the final result.';
  const registerTitle = registrationOpen ? `Start your ${raceLanguageName} Marathon` : 'Registration opens soon';
  const missingLaunchGates = readiness?.missing ?? [];
  const faqItems = registrationOpen
    ? [
      ['How much time do I need each day?', 'Use the assignment instructions shown in your profile for the current approved step.'],
      ['Can I start for free?', 'Registration starts with the free Marathon path. VIP checkout appears from your profile when the gate requires it.'],
      ['What happens after the VIP gate?', 'Free participants are asked to upgrade before post-gate assignments unlock.'],
      ['How do assignments work?', 'Each approved task has instructions, report status, and progress state in your marathon profile.'],
    ]
    : [
      ['What is the marathon format?', 'You move through a 30-day route: start, daily assignment, progress check, VIP gate when required, and finish.'],
      ['What happens every day?', 'Each day has one focused language task. You complete it, report progress, and continue to the next day.'],
      ['Why is registration closed?', 'Registration opens after the approved active marathon, assignments, VIP product, and gift inventory are loaded.'],
      ['Where can I see launch status?', 'Open Support for the operational runbook and readiness checks.'],
    ];

  return (
    <div className="marathon-landing">
      <header className="ml-nav">
        <Link to="/" className="ml-brand" aria-label="Marathon language landing home">
          <span>Marathon</span>
          <small>by SpeakASAP</small>
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
                Registration is not open yet, but the route is ready to preview: start, daily task, progress checkpoint, and finish.
              </p>
            )}
            <dl className="ml-hero-points" aria-label="30-day Marathon highlights">
              <div><dt>Day 1</dt><dd>start line</dd></div>
              <div><dt>30</dt><dd>daily tasks</dd></div>
              <div><dt>Finish</dt><dd>visible result</dd></div>
            </dl>
          </div>

          <div className="ml-race-hero" aria-label="Runners moving from start to finish">
            <img src={MARATHON_IMAGES.hero} alt="Runners starting a marathon route with day markers from day 1 to day 30" />
            <div className="ml-race-card">
              <strong>30-day route</strong>
              <span>Start</span>
              <span>Daily task</span>
              <span>Checkpoint</span>
              <span>Finish</span>
            </div>
            <div className="ml-race-status">
              <span>{registrationOpen ? 'Registration open' : 'Registration opens soon'}</span>
              <strong>{registrationOpen ? 'Run today' : 'Route preview'}</strong>
            </div>
          </div>
        </section>

        <section className="ml-how" id="how">
          <div className="ml-section-head">
            <h2>How the 30-day Marathon works</h2>
            <p>
              It is not just a page with lessons. It is a race rhythm: start strong, complete one language task every day, and finish the full route in 30 days.
            </p>
          </div>
          <div className="ml-how-grid">
            <article><span>01</span><h3>Start the run</h3><p>Choose the language marathon and enter the route from day 1 with one clear action.</p></article>
            <article><span>02</span><h3>Do one task daily</h3><p>Every day you open the next assignment, complete the language work, and submit your report.</p></article>
            <article><span>03</span><h3>Finish day 30</h3><p>The finish line is the completed route: 30 days of visible progress, not a vague promise.</p></article>
          </div>
        </section>

        <section className="ml-pricing" id="pricing">
          <div className="ml-section-head">
            <h2>From start line to finish line</h2>
            <p>{pricingIntro}</p>
          </div>
          <div className="ml-race-route">
            <div className="ml-route-line" aria-hidden="true">
              <span>1</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
            </div>
            <article>
              <h3>Start</h3>
              <p>Registration puts you on the route. Your profile becomes the place where the next step opens.</p>
            </article>
            <article>
              <h3>Daily pace</h3>
              <p>One assignment per day keeps the work concrete: read, speak, write, report, continue.</p>
            </article>
            <article>
              <h3>Checkpoint</h3>
              <p>Progress, VIP access, reports, and locked steps are handled from the live profile.</p>
            </article>
            <article>
              <h3>Finish</h3>
              <p>On day 30 the marathon has a clear end state: you completed the route and can see the result.</p>
            </article>
          </div>
        </section>

        <section className="ml-workflow" id="program">
          <div className="ml-section-head">
            <h2>Your daily race plan</h2>
            <p>
              The page should feel like movement because the product is movement: every day has a task, every task moves you closer to day 30.
            </p>
          </div>
          <div className="ml-training-split">
            <img src={MARATHON_IMAGES.dailyTask} alt="Marathon participants completing a daily task beside a running track" loading="lazy" />
            <div className="ml-day-row">
              <article className="ml-day-card state-done">
                <span>Warm-up</span>
                <h3>Open the day</h3>
                <small>5 minutes</small>
                <p>Enter your profile, check today&apos;s assignment, and see what must be finished before the next checkpoint.</p>
              </article>
              <article className="ml-day-card state-start">
                <span>Main run</span>
                <h3>Complete one task</h3>
                <small>Daily assignment</small>
                <p>Do the focused language practice: speak, write, listen, or answer according to the current step.</p>
              </article>
              <article className="ml-day-card state-finish">
                <span>Cooldown</span>
                <h3>Submit and continue</h3>
                <small>Progress saved</small>
                <p>Your report keeps the route moving. Tomorrow you return for the next day until the finish.</p>
              </article>
            </div>
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
            <h2>Day 30 feels like a finish line</h2>
            <p>The marathon is built around visible completion: people start together, keep pace, and finish stronger.</p>
          </div>
          <div className="ml-finish-visual">
            <img src={MARATHON_IMAGES.finish} alt="Runners celebrating at the day 30 finish line" loading="lazy" />
            <div>
              <h3>Start. Run. Finish.</h3>
              <p>Daily assignments make the route measurable. The finish is not abstract: after 30 days, the participant can see the path they completed.</p>
              <Link to="/winners" className="ml-primary-action">See winners</Link>
            </div>
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
                ? 'Register with your email. The platform creates your participant record and opens your day-1 route.'
                : 'Registration will open when this language route is ready. The 30-day marathon structure is already visible above.'}
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
              <p>The start button will open after the approved route, daily assignments, VIP product, and gift codes are ready in production.</p>
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
          <strong>Marathon <span>by SpeakASAP</span></strong>
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
