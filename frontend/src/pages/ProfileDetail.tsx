import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authFetch, redirectToLogin } from '../auth';

interface Answer {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
}

interface MyMarathon {
  id: string;
  title: string;
  type: string;
  needs_payment: boolean;
  bonus_left: number;
  bonus_total: number;
  can_change_report_time: boolean;
  report_time: string | null;
  current_step: Answer | null;
  answers: Answer[];
}

/**
 * My marathon detail: GET /api/v1/me/marathons/:marathonerId (Bearer).
 * Shows current step, progress, link to step page.
 */
export default function ProfileDetail() {
  const { marathonerId } = useParams<{ marathonerId: string }>();
  const [data, setData] = useState<MyMarathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (!marathonerId) return;
    authFetch(`/api/v1/me/marathons/${marathonerId}`)
      .then((r) => {
        if (r.status === 401) {
          setUnauth(true);
          setLoading(false);
          return null;
        }
        if (r.status === 404) {
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [marathonerId]);

  useEffect(() => {
    if (data) document.title = `${data.title} — Marathon`;
  }, [data]);

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth) {
    redirectToLogin(`/profile/${marathonerId}`);
    return <div className="container"><p>Перенаправление на вход…</p></div>;
  }

  if (!data) {
    return (
      <div className="container">
        <p>Марафон не найден.</p>
        <Link to="/profile">← Мои марафоны</Link>
      </div>
    );
  }

  const current = data.current_step;
  const completedCount = data.answers.filter((answer) => answer.state === 'done' || answer.state === 'completed').length;
  const progressPct = data.answers.length ? Math.round((completedCount / data.answers.length) * 100) : 0;

  const startCheckout = async () => {
    if (!data) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await authFetch('/api/v1/vip/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marathonerId: data.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `Checkout failed (${res.status})`);
      }
      const redirectUrl = body.redirectUrl || body.payment?.data?.redirectUrl || body.payment?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setCheckoutError('Checkout was created, but no payment redirect URL was returned.');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="container page-static profile-dashboard">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мои марафоны</Link>
      </nav>
      <section className="profile-hero-panel">
        <div>
          <h1>{data.title}</h1>
          <p className="profile-meta">
            {data.type === 'trial' && 'Пробный период. '}
            Бонусных дней: {data.bonus_left} из {data.bonus_total}.
          </p>
        </div>
        <div className="profile-progress-card">
          <span>Progress</span>
          <strong>{progressPct}%</strong>
          <div className="profile-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
      </section>
      {data.needs_payment && (
        <section className="profile-payment-panel">
          <div>
            <h2>VIP access required</h2>
            <p>The VIP gate is active for this marathon. Pay securely or redeem a gift code to unlock the next assignments.</p>
            {checkoutError && <p className="ml-error">{checkoutError}</p>}
          </div>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={startCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? 'Opening checkout...' : 'Pay for VIP'}
            </button>
            <Link to={`/gift?marathonerId=${encodeURIComponent(data.id)}`} className="btn-profile-open">Gift code</Link>
            <Link to="/support" className="btn-profile-login">Contact support</Link>
          </div>
        </section>
      )}
      {current && (
        <section className="profile-current">
          <h2>Текущий этап</h2>
          <p><strong>{current.title}</strong></p>
          <p>До: {new Date(current.stop).toLocaleString('ru-RU')}</p>
          <Link to={`/steps/${current.stepId}`} className="btn-profile-open">
            Открыть задание
          </Link>
        </section>
      )}
      <section className="profile-steps">
        <h2>Этапы</h2>
        <ul className="profile-answers">
          {data.answers.map((a) => (
            <li key={String(a.id)} className={`answer-state-${a.state}`}>
              <span className="answer-title">{a.title}</span>
              <span className="answer-state">{a.state}</span>
              {a.state !== 'inactive' && (
                <Link to={`/steps/${a.stepId}`}>Открыть</Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
