import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch, captureTokenFromUrl, redirectToLogin } from '../auth';

interface MyMarathon {
  id: string;
  title: string;
  type: string;
  needs_payment: boolean;
  registered: boolean;
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
    captureTokenFromUrl();
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
    <div className="container page-static">
      <nav className="page-nav">
        <Link to="/">Главная</Link>
      </nav>
      <h1>Мои марафоны</h1>
      {list.length === 0 ? (
        <p>У вас пока нет марафонов.</p>
      ) : (
        <ul className="profile-marathon-list">
          {list.map((m) => (
            <li key={m.id}>
              <Link to={`/profile/${m.id}`}>
                {m.title}
                {m.type === 'trial' ? ' (пробный)' : ''}
                {m.needs_payment ? ' — требуется оплата' : ''}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
