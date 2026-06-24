import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearToken, getToken } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchMyMarathons,
  type MyMarathonSummary,
} from '../api/profileMarathon';
import {
  AdminMarathonPricingError,
  fetchAdminSession,
} from '../api/adminMarathon';
import {
  fetchActiveMarathons,
  fetchCatalogReadiness,
  fetchMarathonLanguages,
  type CatalogReadiness,
  type MarathonLanguage,
  type MarathonSummary,
} from '../api/publicMarathon';
import { formatLanguageLabel } from '../languages';

type MarathonCard = MarathonSummary & {
  language?: MarathonLanguage;
};


function getCompletedCount(marathon: MyMarathonSummary) {
  return marathon.answers.filter((answer) => answer.state === 'completed' || answer.state === 'done').length;
}

function getProgressPct(marathon: MyMarathonSummary) {
  return marathon.answers.length ? Math.round((getCompletedCount(marathon) / marathon.answers.length) * 100) : 0;
}

function getStatusLabel(marathon: MyMarathonSummary) {
  if (marathon.payment_required) return 'Нужна оплата';
  if (marathon.payment_status === 'paid') return 'Оплачено';
  return 'Активен';
}

function getLanguageLabel(card: MarathonCard) {
  return formatLanguageLabel(card.languageCode, card.language?.name || card.title);
}

function getLanguagePath(card: MarathonCard) {
  const href = card.language?.url || `/${card.languageCode}`;
  try {
    const parsed = new URL(href, window.location.origin);
    return `${parsed.pathname.replace(/\/$/, '') || '/'}#register`;
  } catch {
    return `/${card.languageCode}#register`;
  }
}

function getPreviewImage(card: MarathonCard) {
  return `/img/bg/${card.languageCode}.jpg`;
}

export default function Profile() {
  const [list, setList] = useState<MyMarathonSummary[] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [catalog, setCatalog] = useState<MarathonSummary[]>([]);
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
  const [adminAvailable, setAdminAvailable] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    document.title = 'Марафоны — Марафон';
  }, []);

  useEffect(() => {
    setCatalogLoading(true);
    setCatalogError('');
    Promise.all([
      fetchActiveMarathons(),
      fetchMarathonLanguages(),
      fetchCatalogReadiness(),
    ])
      .then(([marathonData, languageData, readinessData]) => {
        setCatalog(marathonData);
        setLanguages(languageData);
        setReadiness(readinessData);
      })
      .catch(() => {
        setCatalog([]);
        setLanguages([]);
        setReadiness(null);
        setCatalogError('Список марафонов временно не загрузился. Обновите страницу или обратитесь в поддержку.');
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setList([]);
      setAdminAvailable(false);
      return;
    }

    setProfileLoading(true);
    setLoadError('');
    Promise.all([
      fetchMyMarathons(),
      fetchAdminSession().catch((error) => {
        if (error instanceof AdminMarathonPricingError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        return null;
      }),
    ])
      .then(([data, adminSession]) => {
        setList(data);
        setAdminAvailable(adminSession?.admin === true);
      })
      .catch((error) => {
        setAdminAvailable(false);
        if (error instanceof MarathonAuthRequiredError) {
          clearToken();
          setList([]);
          return;
        }
        setLoadError('Профиль не загрузился. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const languageByCode = useMemo(
    () => new Map(languages.map((language) => [language.code, language])),
    [languages],
  );
  const cards = useMemo(
    () => catalog.map((marathon) => ({ ...marathon, language: languageByCode.get(marathon.languageCode) })),
    [catalog, languageByCode],
  );
  const ownedLanguageCodes = useMemo(
    () => new Set((list || []).map((marathon) => marathon.languageCode).filter(Boolean)),
    [list],
  );
  const availableCards = useMemo(
    () => cards.filter((card) => !ownedLanguageCodes.has(card.languageCode)),
    [cards, ownedLanguageCodes],
  );
  const registrationOpen = readiness?.registrationOpen === true;
  const isAuthenticated = Boolean(getToken());

  return (
    <div className="profile-catalog-page">
      <header className="profile-catalog-hero">
        <div className="container profile-catalog-hero-inner">
          <Link to="/" className="profile-catalog-brand" aria-label="Главная страница марафона">
            <span>Марафон</span>
            <small>от SpeakASAP</small>
          </Link>
          <div className="profile-catalog-copy">
            <span className="profile-catalog-eyebrow">{isAuthenticated ? 'Личный кабинет' : 'Доступные языковые марафоны'}</span>
            <h1>{isAuthenticated ? 'Мой профиль' : 'Выберите марафон и начните обучение'}</h1>
            <p>
              {isAuthenticated
                ? 'Здесь находятся ваши марафоны и прогресс участника.'
                : `Сейчас открыты ${readiness?.counts.activeMarathons ?? (availableCards.length || cards.length || 13)} языковых марафонов. У каждого языка своя страница, превью страны и быстрый старт регистрации.`}
            </p>
          </div>
        </div>
      </header>

      <main className="container profile-catalog-main">
        {profileLoading && <p className="profile-catalog-note">Проверяем ваши активные марафоны...</p>}
        {loadError && (
          <section className="profile-empty-panel" role="alert">
            <h2>Профиль временно недоступен</h2>
            <p>{loadError}</p>
            <div className="profile-payment-actions">
              <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
                Обновить
              </button>
              <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
            </div>
          </section>
        )}

        {isAuthenticated && adminAvailable && (
          <div className="profile-admin-entry" aria-label="Администраторская секция">
            <div>
              <span>Администрирование</span>
              <strong>Администраторская секция</strong>
            </div>
            <Link to="/admin/marathons/prices" className="btn-profile-open">
              Войти в администраторскую секцию
            </Link>
          </div>
        )}

        {list && (
          <section className="profile-owned-section" aria-labelledby="owned-marathons-title">
            <div className="profile-section-heading">
              <span>Мой прогресс</span>
              <h2 id="owned-marathons-title">Мои марафоны</h2>
            </div>
            {list.length === 0 ? (
              <section className="profile-empty-panel">
                <h2>У вас пока нет марафонов</h2>
                <p>Начните марафон из списка ниже. После регистрации прогресс появится здесь.</p>
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
                          <span className={m.payment_required ? 'profile-marathon-status status-payment' : 'profile-marathon-status'}>
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
                        <span>{m.payment_required ? 'Оплата' : 'Статус'}</span>
                        <strong>{m.payment_required ? 'Требуется оплата' : getStatusLabel(m)}</strong>
                        {m.payment_required && <p>Оплатите марафон, чтобы открыть задания.</p>}
                        <Link to={`/profile/${m.id}`} className="btn-profile-open">
                          Открыть
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="profile-public-section" aria-labelledby="available-marathons-title">
          <div className="profile-section-heading">
            <span>{registrationOpen ? 'Регистрация открыта' : 'Статус регистрации'}</span>
            <h2 id="available-marathons-title">Все марафоны</h2>
          </div>

          {catalogLoading && <p className="profile-catalog-note">Загрузка списка марафонов...</p>}
          {catalogError && (
            <section className="profile-empty-panel" role="alert">
              <h2>Список марафонов не загрузился</h2>
              <p>{catalogError}</p>
              <div className="profile-empty-actions">
                <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
                  Обновить
                </button>
                <Link to="/support" className="btn-profile-login">Поддержка</Link>
              </div>
            </section>
          )}

          {!catalogLoading && !catalogError && availableCards.length === 0 && (
            <section className="profile-empty-panel">
              <h2>{cards.length === 0 ? 'Активных марафонов пока нет' : 'Все доступные марафоны уже в вашем профиле'}</h2>
              <p>{cards.length === 0 ? 'Как только каталог будет доступен, здесь появится список языков для участия.' : 'Новые языки появятся здесь, когда откроется следующий марафон.'}</p>
              {cards.length === 0 && <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>}
            </section>
          )}

          {availableCards.length > 0 && (
            <ul className="profile-language-grid">
              {availableCards.map((card) => {
                const languageName = getLanguageLabel(card);
                return (
                  <li key={card.id} className="profile-language-card">
                    <Link to={getLanguagePath(card)} className="profile-language-preview" aria-label={`Начать марафон: ${languageName}`}>
                      <img src={getPreviewImage(card)} alt="" loading="lazy" />
                      <span>{languageName}</span>
                    </Link>
                    <div className="profile-language-body">
                      <h3>{card.title}</h3>
                      <p>Марафон: {languageName}. 30 дней практики, задания и прогресс в профиле.</p>
                      <Link to={getLanguagePath(card)} className="btn-profile-login profile-language-start">
                        Начать марафон
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
