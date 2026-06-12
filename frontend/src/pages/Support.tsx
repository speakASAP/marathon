import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface CatalogReadiness {
  ready: boolean;
  registrationOpen: boolean;
  paymentReady: boolean;
  giftReady: boolean;
  assignmentReady: boolean;
  counts: {
    activeMarathons: number;
    products: number;
    unusedGifts: number;
    steps: number;
    stepsWithContent: number;
  };
  missing: string[];
}

const SUPPORT_EMAIL = 'marathon@speakasap.com';

function formatMissingLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Support() {
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Поддержка — Marathon';
    setLoading(true);
    setError('');
    fetch('/api/v1/marathons/readiness')
      .then((response) => {
        if (!response.ok) throw new Error(`readiness:${response.status}`);
        return response.json();
      })
      .then((data: CatalogReadiness) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setError('Registration status is temporarily unavailable. Please contact support before trying to start a marathon.');
      })
      .finally(() => setLoading(false));
  }, []);

  const registrationOpen = readiness?.registrationOpen === true;
  const missing = readiness?.missing ?? [];

  return (
    <div className="container page-static page-support">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>

      <section className="support-public-hero">
        <div>
          <h1>Marathon support</h1>
          <p>
            Help with registration, profile access, VIP status, gift codes, and assignment pages.
          </p>
        </div>
        <a className="btn-profile-login" href={`mailto:${SUPPORT_EMAIL}`}>
          Contact support
        </a>
      </section>

      <section className="support-public-status" aria-live="polite">
        <div>
          <span>Registration status</span>
          <strong>{loading ? 'Checking' : registrationOpen ? 'Open' : 'Not open yet'}</strong>
        </div>
        {error ? (
          <p className="ml-error">{error}</p>
        ) : registrationOpen ? (
          <p>Registration is open. Choose a language and start from the registration page.</p>
        ) : (
          <p>
            Registration opens after the approved marathon catalog, assignments, VIP product, and gift inventory are ready.
          </p>
        )}
        {!loading && readiness && (
          <dl className="support-public-counts">
            <div><dt>Active marathons</dt><dd>{readiness.counts.activeMarathons}</dd></div>
            <div><dt>Assignments</dt><dd>{readiness.counts.stepsWithContent}/{readiness.counts.steps}</dd></div>
            <div><dt>VIP products</dt><dd>{readiness.counts.products}</dd></div>
            <div><dt>Gift codes</dt><dd>{readiness.counts.unusedGifts}</dd></div>
          </dl>
        )}
        {!loading && missing.length > 0 && (
          <div className="support-public-missing" aria-label="Registration blockers">
            {missing.map((item) => (
              <span key={item}>{formatMissingLabel(item)}</span>
            ))}
          </div>
        )}
        <div className="support-public-actions">
          <Link to="/register" className="btn-profile-login">
            {registrationOpen ? 'Go to registration' : 'View registration status'}
          </Link>
          <Link to="/profile" className="btn-profile-open">Open profile</Link>
        </div>
      </section>

      <section className="support-public-grid">
        <article>
          <span>Profile and login</span>
          <h2>Cannot see your marathon?</h2>
          <p>
            Sign in through SpeakASAP from the profile page. Login returns you to the exact marathon profile when a participant record is already linked.
          </p>
          <Link to="/profile">Open profile</Link>
        </article>
        <article>
          <span>VIP access</span>
          <h2>Payment or gift code</h2>
          <p>
            VIP checkout and gift-code redemption appear from your marathon profile when the VIP gate is active and the launch catalog is ready.
          </p>
          <Link to="/gift">Gift code page</Link>
        </article>
        <article>
          <span>Assignments</span>
          <h2>Report submission</h2>
          <p>
            Open assignments from your marathon profile so the page can verify your participant ID, login session, saved report state, and assignment content.
          </p>
          <Link to="/profile">Continue marathon</Link>
        </article>
      </section>

      <section className="support-public-contact">
        <h2>What to include</h2>
        <ul>
          <li>Your registration email.</li>
          <li>The language marathon you are trying to open.</li>
          <li>A short description of the page or action that needs help.</li>
        </ul>
        <p>
          Do not send passwords, payment card details, full gift-code lists, or private assignment reports by email.
        </p>
      </section>
    </div>
  );
}
