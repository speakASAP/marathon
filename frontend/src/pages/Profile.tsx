import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
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

const EMPTY_PROFILE: MarathonUserProfileSettings = {
  displayName: '',
  avatarUrl: '',
  bio: '',
};

const AVATAR_OUTPUT_SIZE = 300;
const AVATAR_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать изображение.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        canvas.toBlob((fallbackBlob) => {
          if (fallbackBlob) {
            resolve(fallbackBlob);
            return;
          }
          reject(new Error('Не удалось подготовить аватар.'));
        }, 'image/jpeg', 0.82);
      },
      'image/webp',
      0.82,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось сохранить аватар.'));
    reader.readAsDataURL(blob);
  });
}

async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения.');
  }
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) {
    throw new Error('Файл слишком большой. Выберите изображение до 50 MB.');
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Браузер не смог подготовить аватар.');
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  const blob = await canvasToBlob(canvas);
  return blobToDataUrl(blob);
}


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
  const [accountProfile, setAccountProfile] = useState<MarathonUserProfileSettings>(EMPTY_PROFILE);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarDragging, setAvatarDragging] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
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
      setAccountProfile(EMPTY_PROFILE);
      setAdminAvailable(false);
      return;
    }

    setProfileLoading(true);
    setLoadError('');
    Promise.all([
      fetchMyMarathons(),
      fetchMyProfile(),
      fetchAdminSession().catch((error) => {
        if (error instanceof AdminMarathonPricingError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        return null;
      }),
    ])
      .then(([data, profile, adminSession]) => {
        setList(data);
        setAccountProfile(profile);
        setAdminAvailable(adminSession?.admin === true);
      })
      .catch((error) => {
        setAdminAvailable(false);
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
      window.dispatchEvent(new Event('marathon-profile-updated'));
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


  const updateAvatarFromFile = async (file?: File | null) => {
    if (!file) return;
    setAvatarProcessing(true);
    setProfileSaveError('');
    setProfileSaveMessage('');
    try {
      const avatarDataUrl = await compressAvatarFile(file);
      setAccountProfile((profile) => ({ ...profile, avatarUrl: avatarDataUrl }));
      setProfileSaveMessage('Фото подготовлено. Сохраните профиль.');
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Фото не загрузилось. Попробуйте другой файл.');
    } finally {
      setAvatarProcessing(false);
    }
  };

  const handleAvatarInput = (event: ChangeEvent<HTMLInputElement>) => {
    void updateAvatarFromFile(event.target.files?.[0]);
    event.target.value = '';
    setAvatarMenuOpen(false);
  };

  const handleAvatarDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setAvatarDragging(false);
    setAvatarMenuOpen(false);
    void updateAvatarFromFile(event.dataTransfer.files?.[0]);
  };

  const handleAvatarRemove = () => {
    setAccountProfile({ ...accountProfile, avatarUrl: '' });
    setProfileSaveError('');
    setProfileSaveMessage('Фото удалено. Сохраните профиль.');
    setAvatarMenuOpen(false);
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
              <div
                className={[
                  'profile-settings-avatar-wrap',
                  avatarDragging ? 'is-dragging' : '',
                  avatarMenuOpen ? 'is-open' : '',
                ].filter(Boolean).join(' ')}
                onDragOver={(event) => {
                  event.preventDefault();
                  setAvatarDragging(true);
                }}
                onDragLeave={() => setAvatarDragging(false)}
                onDrop={handleAvatarDrop}
              >
                <button
                  type="button"
                  className="profile-settings-avatar"
                  aria-expanded={avatarMenuOpen}
                  aria-label="Изменить аватар"
                  onClick={() => setAvatarMenuOpen((open) => !open)}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{profileInitial}</span>}
                  <small>{avatarProcessing ? 'Готовим...' : 'Изменить'}</small>
                </button>
                {avatarMenuOpen && (
                  <div className="profile-avatar-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => avatarInputRef.current?.click()} disabled={avatarProcessing}>
                      Изменить
                    </button>
                    <button type="button" role="menuitem" onClick={handleAvatarRemove} disabled={!accountProfile.avatarUrl || avatarProcessing}>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
              <div>
                <span>Профиль участника</span>
                <h2 id="profile-settings-title">Моя карточка</h2>
                <p>{accountProfile.bio || 'Добавьте аватар и короткое описание для своего профиля марафона.'}</p>
              </div>
            </div>
            {adminAvailable && (
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
            <form className="profile-settings-form" onSubmit={handleProfileSubmit}>
              <label htmlFor="profile-display-name">Имя</label>
              <input
                id="profile-display-name"
                type="text"
                value={accountProfile.displayName}
                maxLength={120}
                onChange={(event) => setAccountProfile({ ...accountProfile, displayName: event.target.value })}
              />
              <span className="profile-settings-field-label">Фото</span>
              <label
                htmlFor="profile-avatar-file"
                className={avatarDragging ? 'profile-avatar-dropzone is-dragging' : 'profile-avatar-dropzone'}
                onDragOver={(event) => {
                  event.preventDefault();
                  setAvatarDragging(true);
                }}
                onDragLeave={() => setAvatarDragging(false)}
                onDrop={handleAvatarDrop}
              >
                <input
                  ref={avatarInputRef}
                  id="profile-avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarInput}
                  disabled={avatarProcessing}
                />
                <strong>{avatarProcessing ? 'Готовим фото...' : 'Перетащите фото сюда'}</strong>
                <small>или выберите файл</small>
              </label>
              <div className="profile-avatar-actions">
                <button
                  type="button"
                  className="btn-profile-login"
                  onClick={handleAvatarRemove}
                  disabled={!accountProfile.avatarUrl || avatarProcessing}
                >
                  Удалить фото
                </button>
              </div>
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
