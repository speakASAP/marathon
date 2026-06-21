import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchMyMarathons,
  type MyMarathonSummary,
} from '../api/profileMarathon';
import { fetchCatalogReadiness, type CatalogReadiness } from '../api/publicMarathon';

function getCompletedCount(marathon: MyMarathonSummary) {
  return marathon.answers.filter((answer) => answer.state === 'completed' || answer.state === 'done').length;
}

function getProgressPct(marathon: MyMarathonSummary) {
  return marathon.answers.length ? Math.round((getCompletedCount(marathon) / marathon.answers.length) * 100) : 0;
}

function getStatusLabel(marathon: MyMarathonSummary) {
  if (marathon.needs_payment) return 'Нужен VIP';
  if (marathon.type === 'vip') return 'VIP активен';
  if (marathon.type === 'trial') return 'Пробный';
  return 'Активен';
}

/**
 * Profile: list user marathons. GET /api/v1/me/marathons (Bearer).
 * Unauthenticated -> redirect to portal login.
 */
export default function Profile() {
  const [list, setList] = useState<MyMarathonSummary[] | null>(null);
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
    fetchMyMarathons()
      .then((data) => {
        setList(data);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setUnauth(true);
          setLoading(false);
          return;
        }
        setLoadError('Профиль не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
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
        setReadinessError('Статус регистрации не загрузился.');
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
          <h2>Профиль временно недоступен</h2>
          <p>{loadError || 'Сервис профиля марафона не вернул корректный ответ.'}</p>
          <div className="profile-payment-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
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
            <p>Проверяем статус регистрации перед показом действий.</p>
          ) : registrationOpen ? (
            <p>Регистрация открыта. После старта марафона здесь появятся прогресс, текущее задание и VIP-статус.</p>
          ) : registrationStatusKnown ? (
            <p>Регистрация еще не открыта. Чтобы здесь появился новый марафон, нужно загрузить утвержденный каталог, задания, VIP-продукт и подарочные коды.</p>
          ) : (
            <p>{readinessError} Откройте страницу статуса регистрации или обратитесь в поддержку перед стартом марафона.</p>
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
                  {m.needs_payment && <p>VIP-доступ требуется.</p>}
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
