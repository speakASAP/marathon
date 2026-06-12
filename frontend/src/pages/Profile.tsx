import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, redirectToLogin } from '../auth';

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

  useEffect(() => {
    document.title = 'Мои марафоны — Marathon';
  }, []);

  useEffect(() => {
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
      .catch(() => setLoading(false));
  }, []);

  const doLogin = () => redirectToLogin('/profile');

  if (loading) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unauth || !list) {
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

  return (
    <div className="container page-static profile-dashboard">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Мои марафоны</h1>
      {list.length === 0 ? (
        <section className="profile-empty-panel">
          <h2>У вас пока нет марафонов</h2>
          <p>Когда регистрация откроется и вы начнете марафон, здесь появятся прогресс, текущий этап и доступ к заданиям.</p>
          <Link to="/register" className="btn-profile-login">Перейти к регистрации</Link>
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
