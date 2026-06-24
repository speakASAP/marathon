import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { clearToken, getToken } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchMyMarathons,
  fetchMyProfile,
  updateMyProfile,
  type MarathonUserProfileSettings,
  type MyMarathonSummary,
} from '../api/profileMarathon';
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

const EMPTY_PROFILE: MarathonUserProfileSettings = {
  displayName: '',
  avatarUrl: '',
  bio: '',
};


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
  const [accountProfile, setAccountProfile] = useState<MarathonUserProfileSettings>(EMPTY_PROFILE);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [catalog, setCatalog] = useState<MarathonSummary[]>([]);
  const [languages, setLanguages] = useState<MarathonLanguage[]>([]);
  const [readiness, setReadiness] = useState<CatalogReadiness | null>(null);
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
      setAccountProfile(EMPTY_PROFILE);
      return;
    }

    setProfileLoading(true);
    setLoadError('');
    Promise.all([fetchMyMarathons(), fetchMyProfile()])
      .then(([data, profile]) => {
        setList(data);
        setAccountProfile(profile);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          clearToken();
          setList([]);
          setAccountProfile(EMPTY_PROFILE);
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
  const avatarUrl = accountProfile.avatarUrl.trim();
  const profileInitial = (accountProfile.displayName.trim().charAt(0) || 'Я').toUpperCase();

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaveLoading(true);
    setProfileSaveError('');
    setProfileSaveMessage('');
    try {
      const updated = await updateMyProfile(accountProfile);
      setAccountProfile(updated);
      setProfileSaveMessage('Профиль сохранен.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        clearToken();
        setList([]);
        setAccountProfile(EMPTY_PROFILE);
        setProfileSaveError('Сессия истекла. Войдите снова, чтобы сохранить профиль.');
        return;
      }
      setProfileSaveError(error instanceof Error ? error.message : 'Профиль не сохранился. Попробуйте еще раз.');
    } finally {
      setProfileSaveLoading(false);
    }
  };

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
                ? 'Здесь находятся ваши марафоны, прогресс и настройки профиля участника.'
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

        {isAuthenticated && (
          <section className="profile-settings-panel" aria-labelledby="profile-settings-title">
            <div className="profile-settings-preview">
              <div className="profile-settings-avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{profileInitial}</span>}
              </div>
              <div>
                <span>Профиль участника</span>
                <h2 id="profile-settings-title">Моя карточка</h2>
                <p>{accountProfile.bio || 'Добавьте аватар и короткое описание для своего профиля марафона.'}</p>
              </div>
            </div>
            <form className="profile-settings-form" onSubmit={handleProfileSubmit}>
              <label htmlFor="profile-display-name">Имя</label>
              <input
                id="profile-display-name"
                type="text"
                value={accountProfile.displayName}
                maxLength={120}
                onChange={(event) => setAccountProfile({ ...accountProfile, displayName: event.target.value })}
              />
              <label htmlFor="profile-avatar-url">Ссылка на картинку</label>
              <input
                id="profile-avatar-url"
                type="url"
                value={accountProfile.avatarUrl}
                maxLength={1000}
                placeholder="https://..."
                onChange={(event) => setAccountProfile({ ...accountProfile, avatarUrl: event.target.value })}
              />
              <label htmlFor="profile-bio">О себе</label>
              <textarea
                id="profile-bio"
                value={accountProfile.bio}
                maxLength={500}
                rows={4}
                onChange={(event) => setAccountProfile({ ...accountProfile, bio: event.target.value })}
              />
              <div className="profile-payment-actions">
                <button type="submit" className="btn-profile-open" disabled={profileSaveLoading}>
                  {profileSaveLoading ? 'Сохраняем...' : 'Сохранить профиль'}
                </button>
                {profileSaveMessage && <span className="profile-settings-message">{profileSaveMessage}</span>}
              </div>
              {profileSaveError && <p className="ml-error">{profileSaveError}</p>}
            </form>
          </section>
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
