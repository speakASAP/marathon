import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCatalogReadiness,
  fetchMarathonLanguages,
  fetchPublicReviews,
  fetchWinnerSummaries,
  type CatalogReadiness,
  type MarathonLanguage,
  type PublicReview,
  type WinnerSummary,
} from '../api/publicMarathon';
import '../landing.css';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function languagePath(language: MarathonLanguage): string {
  return `/${encodeURIComponent(language.code)}/#register`;
}

/**
 * Home: production landing entry point for registration and marathon continuation.
 */
export default function Home() {
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [winners, setWinners] = useState<WinnerSummary[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Marathon by SpeakASAP — start your language marathon';
  }, []);

  useEffect(() => {
    setLoadError('');
    Promise.all([
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
      fetchWinnerSummaries(6),
      fetchPublicReviews().then((items) => items.slice(0, 3)),
    ])
      .then(([langs, ready, win, rev]) => {
        setLanguages(langs);
        setReadiness(ready);
        setWinners(win);
        setReviews(rev);
      })
      .catch(() => {
        setLanguages([]);
        setReadiness(null);
        setWinners([]);
        setReviews([]);
        setLoadError('Marathon landing could not be loaded. Refresh this page, or contact support if the problem continues.');
      })
      .finally(() => setLoading(false));
  }, []);

  const registrationOpen = readiness?.registrationOpen === true;
  const missingLaunchGates = readiness?.missing ?? [];
  const featuredLanguages = useMemo(() => languages.slice(0, 8), [languages]);
  const primaryLanguage = featuredLanguages[0];
  const startPath = primaryLanguage ? languagePath(primaryLanguage) : '/register';
  const approvedSteps = readiness ? `${readiness.counts.stepsWithContent}/${readiness.counts.steps}` : '377/377';
  const heroTitle = registrationOpen
    ? 'Start your language marathon today'
    : 'Marathon registration is being prepared';
  const heroCopy = registrationOpen
    ? 'Choose a language, register, and continue through daily assignments, saved reports, VIP unlock, finalists, and progress tracking in one production profile.'
    : 'Registration opens only when the active catalog, assignment content, VIP product, and gift inventory are ready in production.';

  if (loadError) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Marathon home is temporarily unavailable</h1>
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

  return (
    <div className="home-launch">
      <section className="home-launch-hero">
        <div className="home-launch-copy">
          <h1>{heroTitle}</h1>
          <p>{heroCopy}</p>
          <div className="home-launch-actions">
            <Link
              to={registrationOpen ? startPath : '/register'}
              className={`ml-primary-action large${registrationOpen ? '' : ' is-closed'}`}
            >
              {registrationOpen ? 'Start marathon' : 'View registration status'}
            </Link>
            <Link to="/profile" className="ml-outline-action">
              Open my marathon
            </Link>
          </div>
          <dl className="home-launch-metrics" aria-label="Marathon readiness">
            <div>
              <dt>{readiness?.counts.activeMarathons ?? 13}</dt>
              <dd>active marathons</dd>
            </div>
            <div>
              <dt>{approvedSteps}</dt>
              <dd>approved assignments</dd>
            </div>
            <div>
              <dt>{readiness?.counts.products ?? 13}</dt>
              <dd>VIP products</dd>
            </div>
          </dl>
        </div>

        <div className="home-launch-visual" aria-label="Marathon profile preview">
          <div className="home-desk-scene">
            <div className="home-phone">
              <div className="home-phone-top">
                <span>Today</span>
                <strong>Assignment 08</strong>
              </div>
              <div className="home-progress-orbit">
                <span>{registrationOpen ? 'Live' : 'Ready'}</span>
              </div>
              <div className="home-phone-list">
                <span>Practice task</span>
                <span>Report saved</span>
                <span>VIP gate checked</span>
              </div>
            </div>
            <div className="home-notebook">
              <span>Language Marathon</span>
              <strong>Register. Practice. Finish.</strong>
              <p>Daily work stays connected to the participant profile.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-language-band" aria-labelledby="home-language-title">
        <div>
          <h2 id="home-language-title">Choose your marathon language</h2>
          <p>
            {registrationOpen
              ? 'The production catalog is ready. Pick a language and start from the registration form.'
              : 'Available languages appear after the production launch gates are green.'}
          </p>
        </div>
        <div className="home-language-rail">
          {loading && <span className="home-language-loading">Loading languages...</span>}
          {!loading && registrationOpen && featuredLanguages.map((language) => (
            <Link key={language.code} to={languagePath(language)} className="home-language-chip">
              {language.name}
            </Link>
          ))}
          {!loading && !registrationOpen && (
            <Link to="/register" className="home-language-chip is-status">
              Registration status
            </Link>
          )}
        </div>
      </section>

      {!registrationOpen && missingLaunchGates.length > 0 && (
        <section className="home-launch-status" aria-label="Launch status">
          <strong>Launch gates still recorded by readiness</strong>
          <div>
            {missingLaunchGates.map((item) => (
              <span key={item}>{formatMissingGate(item)}</span>
            ))}
          </div>
          <Link to="/support" className="ml-outline-action">Open support runbook</Link>
        </section>
      )}

      <section className="home-flow" aria-labelledby="home-flow-title">
        <div className="ml-section-head">
          <h2 id="home-flow-title">One path from registration to finish</h2>
          <p>Marathon is now built around the actual production journey: sign up, work inside the profile, unlock VIP, and complete assignments.</p>
        </div>
        <div className="home-flow-grid">
          <article>
            <span>01</span>
            <h3>Register</h3>
            <p>Choose a language and create your participant profile from the live catalog.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Practice</h3>
            <p>Open approved daily assignment content and save your report from the step page.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Unlock VIP</h3>
            <p>Use checkout or a gift code from the profile when the gate requires full access.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Finish</h3>
            <p>Completed submissions reconcile progress, finalist state, and post-marathon feedback.</p>
          </article>
        </div>
      </section>

      <section className="home-proof" aria-labelledby="home-proof-title">
        <div className="ml-section-head">
          <h2 id="home-proof-title">Results stay visible</h2>
          <p>Finalists and reviews come from the Marathon platform, while private reports and survey comments stay out of public surfaces.</p>
        </div>
        <div className="home-proof-grid">
          <article className="home-proof-panel">
            <h3>Finalists</h3>
            {winners.length > 0 ? (
              <ul>
                {winners.slice(0, 5).map((winner) => (
                  <li key={winner.id}>
                    <Link to={`/winners/${winner.id}`}>{winner.name || 'Participant'}</Link>
                    <span>{winner.gold ?? 0} gold</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{loading ? 'Loading finalists...' : 'Finalists appear after marathon completions are reconciled.'}</p>
            )}
            <Link to="/winners" className="ml-outline-action">View finalists</Link>
          </article>
          <article className="home-proof-panel">
            <h3>Reviews</h3>
            {reviews.length > 0 ? (
              <ul>
                {reviews.map((review) => (
                  <li key={`${review.name}-${review.text}`}>
                    <strong>{review.name}</strong>
                    <p>{review.text.slice(0, 140)}{review.text.length > 140 ? '...' : ''}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{loading ? 'Loading reviews...' : 'Reviews appear after participants complete their marathon.'}</p>
            )}
            <Link to="/reviews" className="ml-outline-action">Read reviews</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
