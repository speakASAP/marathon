import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, redirectToLogin } from '../auth';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';

interface MyMarathon {
  id: string;
  title: string;
  type: string;
  needs_payment: boolean;
  registered: boolean;
  bonus_left: number;
  bonus_total: number;
  current_step: Answer | null;
  answers: Answer[];
}

interface Answer {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
  block_reason?: string | null;
}

function getCompletedCount(marathon: MyMarathon) {
  return marathon.answers.filter((answer) => answer.state === 'completed' || answer.state === 'done').length;
}

function getProgressPct(marathon: MyMarathon) {
  return marathon.answers.length ? Math.round((getCompletedCount(marathon) / marathon.answers.length) * 100) : 0;
}

function getStatusLabel(marathon: MyMarathon) {
  if (marathon.needs_payment) return 'VIP required';
  if (marathon.type === 'vip') return 'VIP active';
  if (marathon.type === 'trial') return 'Trial';
  return 'Active';
}

/**
 * Profile: list user marathons. GET /api/v1/me/marathons (Bearer).
 * Unauthenticated -> redirect to portal login.
 */
export default function Profile() {
  const [list, setList] = useState<MyMarathon[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');

  useEffect(() => {
    document.title = 'Мои марафоны — Marathon';
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    setUnauth(false);
    authFetch('/api/v1/me/marathons')
      .then((r) => {
        if (r.status === 401) {
          setUnauth(true);
          setLoading(false);
          return [];
        }
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setList(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Profile could not be loaded. Refresh this page, or contact support if the problem continues.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setReadinessLoading(true);
    setReadinessError('');
    fetchCatalogReadiness()
      .then((data: CatalogReadiness | null) => setReadiness(data))
      .catch(() => {
        setReadiness(null);
        setReadinessError('Registration status could not be loaded.');
      })
      .finally(() => setReadinessLoading(false));
  }, []);

  const doLogin = () => redirectToLogin('/profile');
  const registrationOpen = readiness?.registrationOpen === true;
  const registrationStatusKnown = !readinessLoading && !readinessError;

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Мои марафоны</h1>
        <p>Для просмотра нужно войти.</p>
        <button type="button" className="btn-profile-login" onClick={doLogin}>
          Войти через SpeakASAP
        </button>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container page-static">
        <nav className="page-nav">
          <Link to="/">Главная</Link>
        </nav>
        <h1>Мои марафоны</h1>
        <section className="profile-empty-panel" role="alert">
          <h2>Profile is temporarily unavailable</h2>
          <p>{loadError || 'The marathon profile service did not return a usable response.'}</p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <Link to="/support" className="btn-profile-login">Contact support</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container page-static profile-dashboard">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Мои марафоны</h1>
      {list.length === 0 ? (
        <section className="profile-empty-panel">
          <h2>У вас пока нет марафонов</h2>
          {readinessLoading ? (
            <p>Checking registration status before showing registration actions.</p>
          ) : registrationOpen ? (
            <p>Registration is open. After you start a marathon, progress, the current assignment, and VIP status appear here.</p>
          ) : registrationStatusKnown ? (
            <p>Registration is not open yet. Approved marathon catalog, assignments, VIP product, and gift inventory must be loaded before a new marathon can appear here.</p>
          ) : (
            <p>{readinessError} Open the registration status page or contact support before trying to start a marathon.</p>
          )}
          <div className="profile-empty-actions">
            <Link to="/register" className="btn-profile-login">
              {registrationOpen ? 'Перейти к регистрации' : 'Статус регистрации'}
            </Link>
            {!registrationOpen && (
              <Link to="/support" className="btn-profile-open">Поддержка</Link>
            )}
          </div>
        </section>
      ) : (
        <ul className="profile-marathon-list">
          {list.map((m) => {
            const progressPct = getProgressPct(m);
            const completedCount = getCompletedCount(m);
            return (
              <li key={m.id} className="profile-marathon-card">
                <div className="profile-marathon-card-main">
                  <div className="profile-marathon-card-heading">
                    <h2>{m.title}</h2>
                    <span className={m.needs_payment ? 'profile-marathon-status status-payment' : 'profile-marathon-status'}>
                      {getStatusLabel(m)}
                    </span>
                  </div>
                  <p>
                    {m.current_step
                      ? `Текущий этап: ${m.current_step.title}`
                      : 'Активный этап появится после старта расписания.'}
                  </p>
                  <div className="profile-card-progress">
                    <span>{completedCount}/{m.answers.length || 0} этапов</span>
                    <strong>{progressPct}%</strong>
                    <div className="profile-progress-track"><span style={{ width: `${progressPct}%` }} /></div>
                  </div>
                </div>
                <div className="profile-marathon-card-side">
                  <span>Бонусные дни</span>
                  <strong>{m.bonus_left}/{m.bonus_total}</strong>
                  {m.needs_payment && <p>VIP gate is active.</p>}
                  <Link to={`/profile/${m.id}`} className="btn-profile-open">
                    Открыть
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
