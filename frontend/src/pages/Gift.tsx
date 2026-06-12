import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, getToken, redirectToLogin } from '../auth';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';

function formatMissingGate(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Gift() {
  const [code, setCode] = useState('');
  const [marathonerId, setMarathonerId] = useState('');
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Gift code — SpeakASAP Marathon';
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setReadinessError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setReadinessError('Gift redemption status could not be loaded. Refresh this page, or contact support if the problem continues.');
      })
      .finally(() => setReadinessLoading(false));
  }, []);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (readinessError) {
      setError('Gift redemption status is temporarily unavailable. Refresh this page before trying again.');
      return;
    }
    if (readiness?.giftReady === false) {
      setError('Gift redemption is not available until an active marathon and unused gift codes are configured.');
      return;
    }
    if (!marathonerId.trim()) {
      setError('Open the gift form from your marathon profile so the participant ID is included.');
      return;
    }
    if (!getToken()) {
      redirectToLogin(`/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
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

  const giftStatusUnavailable = !readinessLoading && Boolean(readinessError);
  const giftUnavailable = !readinessLoading && !readinessError && readiness?.giftReady === false;
  const registrationClosed = !readinessLoading && !readinessError && readiness?.registrationOpen !== true;
  const hasParticipantContext = Boolean(marathonerId.trim());
  const needsLogin = hasParticipantContext && !getToken();
  const giftReturnPath = hasParticipantContext
    ? `/gift?marathonerId=${encodeURIComponent(marathonerId.trim())}`
    : '/profile';
  const openLogin = () => redirectToLogin(giftReturnPath);
  const redeemDisabled = submitting || readinessLoading || giftStatusUnavailable || !hasParticipantContext || needsLogin;
  const missingLaunchGates = readiness?.missing ?? [];
  const heroCopy = readinessLoading
    ? 'Checking Marathon readiness before showing gift-code redemption.'
    : giftUnavailable
      ? 'Gift redemption will open after an active marathon and approved unused gift codes are configured.'
      : 'Gift codes unlock VIP participation without a payment after the marathon gate.';

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
          <p>{heroCopy}</p>
        </div>
        {readinessLoading ? (
          <div className="gift-card gift-card-readiness gift-card-loading" aria-live="polite">
            <h2>Checking gift redemption status</h2>
            <p>Gift-code entry stays hidden until the production catalog and gift inventory status are verified.</p>
          </div>
        ) : giftStatusUnavailable ? (
          <div className="gift-card gift-card-readiness" role="alert">
            <h2>Gift redemption status is temporarily unavailable</h2>
            <p>{readinessError}</p>
            <div className="profile-empty-actions">
              <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
                Refresh
              </button>
              <Link to="/support" className="btn-profile-login">
                Contact support
              </Link>
            </div>
          </div>
        ) : giftUnavailable ? (
          <div className="gift-card gift-card-readiness" aria-live="polite">
            <h2>Gift redemption is not ready</h2>
            <p>No unused production gift codes are available for an active marathon.</p>
            {readiness && (
              <dl className="gift-readiness-list">
                <div><dt>Active marathons</dt><dd>{readiness.counts.activeMarathons}</dd></div>
                <div><dt>Steps</dt><dd>{readiness.counts.steps ?? 0}</dd></div>
                <div><dt>Steps with content</dt><dd>{readiness.counts.stepsWithContent ?? 0}</dd></div>
                <div><dt>VIP products</dt><dd>{readiness.counts.products ?? 0}</dd></div>
                <div><dt>Unused gift codes</dt><dd>{readiness.counts.unusedGifts}</dd></div>
              </dl>
            )}
            {missingLaunchGates.length ? (
              <div className="gift-missing-gates" aria-label="Missing launch gates">
                <strong>Gift launch blockers</strong>
                <div>
                  {missingLaunchGates.map((item) => (
                    <span key={item}>{formatMissingGate(item)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <Link to="/support" className="btn-profile-login">Contact support</Link>
          </div>
        ) : (
          <form className="gift-card" onSubmit={redeem}>
            {!hasParticipantContext && (
              <div className="gift-auth-panel" role="alert">
                <strong>Open gift redemption from your marathon profile</strong>
                <span>The profile link includes the participant ID needed to unlock VIP access on the correct marathon.</span>
                <Link to="/profile" className="btn-profile-login">Open profile</Link>
              </div>
            )}
            {needsLogin && (
              <div className="gift-auth-panel" role="alert">
                <strong>Sign in to redeem a gift code</strong>
                <span>Gift redemption requires your Marathon token and will return to this participant after portal login.</span>
                <button type="button" className="btn-profile-login" onClick={openLogin}>Sign in</button>
              </div>
            )}
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
              disabled={!hasParticipantContext || needsLogin}
            />
            <button type="submit" disabled={redeemDisabled}>
              {submitting ? 'Redeeming...' : needsLogin ? 'Sign in required' : 'Redeem gift code'}
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
