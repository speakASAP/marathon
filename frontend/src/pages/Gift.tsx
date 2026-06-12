import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, redirectToLogin } from '../auth';

export default function Gift() {
  const [code, setCode] = useState('');
  const [marathonerId, setMarathonerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Gift code — SpeakASAP Marathon';
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
  }, []);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
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
          <p>Gift codes unlock VIP participation without a payment after the marathon gate.</p>
        </div>
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
      </section>
      <section className="gift-next-steps">
        <article>
          <span>1</span>
          <h2>Register</h2>
          <p>Create your participant record and start the free marathon days.</p>
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
        <Link to="/register" className="btn-profile-open">Register</Link>
        <Link to="/support" className="btn-profile-login">Contact support</Link>
      </div>
    </div>
  );
}
