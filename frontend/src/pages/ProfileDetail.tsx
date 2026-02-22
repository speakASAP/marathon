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

  return (
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
        <span> · </span>
        <Link to="/profile">Мои марафоны</Link>
      </nav>
      <h1>{data.title}</h1>
      <p className="profile-meta">
        {data.type === 'trial' && 'Пробный период. '}
        Бонусных дней: {data.bonus_left} из {data.bonus_total}.
        {data.needs_payment && ' Требуется оплата.'}
      </p>
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
