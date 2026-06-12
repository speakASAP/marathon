import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import RegistrationForm from '../components/RegistrationForm';
import '../landing.css';

const DEFAULT_PRICE_EUR = 29;
const FREE_DAYS = 3;

const WORKFLOW_DAYS = [
  { day: 9, title: 'Describe your job', type: 'Speaking', state: 'Done' },
  { day: 10, title: 'A memorable trip', type: 'Writing', state: 'Done' },
  { day: 11, title: 'Making plans', type: 'Listening', state: 'Done' },
  { day: 12, title: 'Speak about your weekend', type: 'Speaking', state: 'Start' },
  { day: 13, title: 'Express your opinion', type: 'Speaking', state: 'Locked' },
  { day: 14, title: 'A perfect day', type: 'Writing', state: 'Locked' },
];

const FAQ_ITEMS = [
  ['How much time do I need each day?', 'Most assignments are designed for 20-30 focused minutes.'],
  ['Can I start for free?', `Yes. You can register and begin the first ${FREE_DAYS} days before VIP access is required.`],
  ['What happens after the VIP gate?', 'Free participants are asked to upgrade before post-gate assignments unlock.'],
  ['How do assignments work?', 'Each day has a clear task, report window, and progress state in your marathon profile.'],
];

interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  landingVideoUrl?: string;
  price?: number;
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
}

function formatLanguageName(marathon: MarathonSummary): string {
  return marathon.title || marathon.languageCode.toUpperCase();
}

export default function Landing() {
  const { langSlug } = useParams<{ langSlug: string }>();
  const [marathon, setMarathon] = useState<MarathonSummary | null>(null);
  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langSlug) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/marathons/by-language/${encodeURIComponent(langSlug)}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/v1/marathons/languages')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: LangItem[]) => (Array.isArray(data) ? data : [])),
      fetch('/api/v1/marathons/readiness')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/v1/reviews').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([marathonData, langs, readinessData, reviewsData]) => {
        setMarathon(marathonData || {
          id: 'fallback',
          languageCode: langSlug,
          title: `${langSlug.toUpperCase()} language`,
        });
        setLanguages(langs);
        setReadiness(readinessData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => {
        setMarathon({
          id: 'fallback',
          languageCode: langSlug,
          title: `${langSlug.toUpperCase()} language`,
        });
        setLanguages([]);
        setReadiness(null);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [langSlug]);

  useEffect(() => {
    if (!marathon) return;
    const langName = formatLanguageName(marathon);
    document.title = `${langName} Marathon — 30 days of daily language practice`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      `Join the ${langName} Marathon by SpeakASAP: daily assignments, progress tracking, and VIP access after the free start.`,
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/${marathon.languageCode}/`);
  }, [marathon]);

  const priceEur = marathon?.price ?? DEFAULT_PRICE_EUR;
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
            <h1>30 days. Real {languageName} progress.</h1>
            <p>
              Join a focused language marathon with daily assignments, report windows, progress tracking,
              and a clear path from free start to full VIP access.
            </p>
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
            <dl className="ml-hero-points" aria-label="Marathon highlights">
              <div><dt>30</dt><dd>daily assignments</dd></div>
              <div><dt>{FREE_DAYS}</dt><dd>free starter days</dd></div>
              <div><dt>20-30</dt><dd>minutes per day</dd></div>
            </dl>
          </div>

          <div className="ml-product-preview" aria-label="Marathon assignment preview">
            <div className="ml-preview-sidebar">
              <strong>Marathon</strong>
              <span className="active">Overview</span>
              <span>Assignments</span>
              <span>Reports</span>
              <span>Progress</span>
            </div>
            <div className="ml-preview-main">
              <div className="ml-preview-head">
                <div>
                  <span>Day 12</span>
                  <strong>You're on fire.</strong>
                </div>
                <div className="ml-progress-ring">40%</div>
              </div>
              <article className="ml-assignment-card featured">
                <span>Today's assignment</span>
                <h3>Speak about your weekend</h3>
                <p>Record a 2-3 minute story. Use at least 5 new words.</p>
                <button type="button">Start assignment</button>
              </article>
              <article className="ml-feedback-card">
                <strong>Recent feedback</strong>
                <p>Great improvement. Your vocabulary and fluency are getting stronger.</p>
              </article>
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
              <strong>€{priceEur}</strong>
              <p>Unlock the full marathon after the VIP gate.</p>
              <ul>
                <li>Everything in Free</li>
                <li>Full 30-day assignment path</li>
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
            <h2>Your daily workflow</h2>
            <p>A sample run from the Marathon: completed reports, today's task, and locked VIP days.</p>
          </div>
          <div className="ml-day-row">
            {WORKFLOW_DAYS.map((item) => (
              <article key={item.day} className={`ml-day-card state-${item.state.toLowerCase()}`}>
                <span>Day {item.day}</span>
                <h3>{item.title}</h3>
                <small>{item.type}</small>
                <p>20-30 min</p>
                <button type="button" disabled={item.state === 'Locked'}>{item.state}</button>
              </article>
            ))}
          </div>
          <div className="ml-progress-bar"><span style={{ width: '40%' }} /></div>
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
              <>
                <article className="ml-review"><p>Daily assignments made it easier to speak without hesitation.</p><strong>Lucia K.</strong></article>
                <article className="ml-review"><p>The rhythm was practical, motivating, and easy to follow.</p><strong>Tomas P.</strong></article>
                <article className="ml-review"><p>I liked seeing exactly what to do next every day.</p><strong>Anna M.</strong></article>
              </>
            )}
          </div>
          <Link to="/winners" className="ml-text-link">See winners</Link>
        </section>

        <section className="ml-faq" id="faq">
          <div>
            <h2>Questions? We're here to help.</h2>
            <div className="ml-faq-list">
              {FAQ_ITEMS.map(([question, answer]) => (
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
            <h2>Start your {languageName} Marathon</h2>
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
