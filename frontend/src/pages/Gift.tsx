import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, redirectToLogin } from '../auth';

interface CatalogReadiness {
  registrationOpen: boolean;
  giftReady: boolean;
  counts: {
    activeMarathons: number;
    unusedGifts: number;
  };
}

export default function Gift() {
  const [code, setCode] = useState('');
  const [marathonerId, setMarathonerId] = useState('');
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Gift code — SpeakASAP Marathon';
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    fetch('/api/v1/marathons/readiness')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => setReadiness(null))
      .finally(() => setReadinessLoading(false));
  }, []);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (readiness?.giftReady === false) {
      setError('Gift redemption is not available until an active marathon and unused gift codes are configured.');
      return;
    }
    if (!marathonerId.trim()) {
      setError('Open the gift form from your marathon profile so the participant ID is included.');
      return;
    }
    if (!code.trim()) {
      setError('Enter a gift code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/v1/vip/gift-redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marathonerId: marathonerId.trim(), code: code.trim() }),
      });
      if (res.status === 401) {
        redirectToLogin(`/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Gift redemption failed (${res.status})`);
      }
      setMessage('VIP access unlocked. Returning to your marathon profile...');
      window.setTimeout(() => {
        window.location.href = body.redirectUrl || `/profile/${encodeURIComponent(marathonerId.trim())}`;
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gift redemption failed');
    } finally {
      setSubmitting(false);
    }
  };

  const giftUnavailable = !readinessLoading && readiness?.giftReady === false;
  const registrationClosed = !readinessLoading && readiness?.registrationOpen === false;

  return (
    <div className="container page-static gift-page">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мой марафон</Link>
      </nav>
      <section className="gift-hero">
        <div>
          <h1>Gift code for VIP Marathon access</h1>
          <p>
            {giftUnavailable
              ? 'Gift redemption will open after an active marathon and approved unused gift codes are configured.'
              : 'Gift codes unlock VIP participation without a payment after the marathon gate.'}
          </p>
        </div>
        {giftUnavailable ? (
          <div className="gift-card gift-card-readiness" aria-live="polite">
            <h2>Gift redemption is not ready</h2>
            <p>No unused production gift codes are available for an active marathon.</p>
            {readiness && (
              <dl className="gift-readiness-list">
                <div><dt>Active marathons</dt><dd>{readiness.counts.activeMarathons}</dd></div>
                <div><dt>Unused gift codes</dt><dd>{readiness.counts.unusedGifts}</dd></div>
              </dl>
            )}
            <Link to="/support" className="btn-profile-login">Contact support</Link>
          </div>
        ) : (
          <form className="gift-card" onSubmit={redeem}>
            <label htmlFor="marathoner-id">Participant ID</label>
            <input
              id="marathoner-id"
              value={marathonerId}
              onChange={(event) => setMarathonerId(event.target.value)}
              placeholder="Participant ID"
            />
            <label htmlFor="gift-code">Gift code</label>
            <input
              id="gift-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter gift code"
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Redeeming...' : 'Redeem gift code'}
            </button>
            {message && <p>{message}</p>}
            {error && <p className="ml-error">{error}</p>}
          </form>
        )}
      </section>
      <section className="gift-next-steps">
        <article>
          <span>1</span>
          <h2>{registrationClosed ? 'Wait for registration' : 'Register'}</h2>
          <p>
            {registrationClosed
              ? 'Approved marathon catalog data must be loaded before new participant records can be created.'
              : 'Create your participant record and start the free marathon days.'}
          </p>
        </article>
        <article>
          <span>2</span>
          <h2>Open your profile</h2>
          <p>Your assignments and VIP status appear in the marathon dashboard.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Unlock VIP</h2>
          <p>Use checkout or a gift code once the VIP gate asks for access.</p>
        </article>
      </section>
      <div className="gift-actions">
        {registrationClosed ? (
          <Link to="/support" className="btn-profile-open">Contact support</Link>
        ) : (
          <>
            <Link to="/register" className="btn-profile-open">Register</Link>
            <Link to="/support" className="btn-profile-login">Contact support</Link>
          </>
        )}
      </div>
    </div>
  );
}
